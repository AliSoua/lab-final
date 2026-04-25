# Refactor Lab Instance Launch / Terminate to a Celery Job Queue

Goal: same as `task-instance.md` — stop blocking the trainee's HTTP
request on slow vCenter operations (`CloneVM_Task`, `PowerOnVM_Task`,
IP discovery, `Destroy_Task`) — but using **Celery + Redis** as a
real, out‑of‑process job queue instead of FastAPI `BackgroundTasks`.

This document describes the plan only — no code is changed here.

This is the **alternative** plan; pick exactly one of
`task-instance.md` or this file. The companion `compare.md`
analyses the trade‑offs.

---

## 1. Current state (recap)

Identical to `task-instance.md` §1: `POST /lab-instances/` and
`DELETE /lab-instances/{id}` block 20–60 s and 10–30 s respectively;
`POST /refresh` is short and stays sync.

No Celery infrastructure currently exists in the codebase — there is
no Celery app module, no broker container, no worker container, and
no Redis service. Everything required (Python packages, env vars,
Celery app module, tasks module, Redis service, worker service,
optional Flower) is added from scratch by this plan.

## 2. Target behaviour

1. `POST /lab-instances/` returns **HTTP 202 Accepted** within ~50 ms
   with the freshly‑inserted `LabInstance` row in
   `status="provisioning"`. The router enqueues a Celery task
   `lab.provisioning.launch_instance`; a worker container picks it
   up and updates the row.
2. `DELETE /lab-instances/{id}` returns **HTTP 202 Accepted** within
   ~150 ms with the row already flipped to `status="terminating"`
   and Guacamole connections cleared (synchronously, same as the
   `BackgroundTasks` plan). A `lab.cleanup.terminate_instance`
   Celery task performs the vCenter destroy.
3. `POST /refresh` is unchanged.
4. The frontend changes are identical to the `BackgroundTasks` plan
   (treat `failed` as terminal, surface `error_message`).

The ~50 ms vs ~100 ms launch latency difference vs. the
`BackgroundTasks` plan comes from skipping the `add_task` thread
hand‑off; enqueue is just a Redis `LPUSH`.

---

## 3. Backend changes

### 3.1 New module: `backend/app/core/celery.py`

Single Celery app instance. Three queues are defined here for
isolation between fast and slow workloads:
`lab.provisioning` (launches), `lab.cleanup` (terminates),
`lab.monitoring` (future periodic jobs).

```python
from celery import Celery
from app.config.settings import settings  # or os.getenv

celery_app = Celery(
    "lab_platform",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.lab_instance_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,                # only ack after success
    task_reject_on_worker_lost=True,    # requeue on crash
    worker_prefetch_multiplier=1,       # one slow task per slot
    task_time_limit=900,                # hard kill after 15 min
    task_soft_time_limit=600,           # SoftTimeLimitExceeded at 10 min
    task_default_queue="default",
    task_routes={
        "lab.provisioning.*": {"queue": "lab.provisioning"},
        "lab.cleanup.*":      {"queue": "lab.cleanup"},
        "lab.monitoring.*":   {"queue": "lab.monitoring"},
    },
    result_expires=3600,
)
```

Key rationale:

- `acks_late=True` + `reject_on_worker_lost=True` is what gives us
  cross‑process retry: if a worker dies mid‑clone, Redis re‑delivers
  the task to another worker.
- `prefetch_multiplier=1` matters because lab tasks are minutes long;
  the default of 4 would let a worker hoard tasks and starve siblings.
- Separate queues let us scale `lab.provisioning` independently from
  `lab.cleanup` (different workloads, different priorities).

### 3.2 `LabInstance` model — same change as `task-instance.md` §3.2

Add nullable `error_message: str | None` (TEXT). Status state
machine is identical: `provisioning → running → stopped/terminated`,
with `provisioning → failed` and `terminating → failed` paths. Same
migration choice (Option A: idempotent startup `ALTER TABLE`).

### 3.3 New tasks module: `backend/app/tasks/lab_instance_tasks.py`

```python
from app.core.celery import celery_app
from app.utils.db_session import background_session
from app.services.LabDefinition.lab_instance_service import LabInstanceService

@celery_app.task(
    name="lab.provisioning.launch_instance",
    bind=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True, retry_backoff_max=60, max_retries=3,
)
def launch_instance_task(self, instance_id: str, trainee_id: str):
    with background_session() as db:
        service = LabInstanceService(db)
        service._launch_worker(instance_id, trainee_id, task_id=self.request.id)

@celery_app.task(
    name="lab.cleanup.terminate_instance",
    bind=True, max_retries=3, retry_backoff=True,
)
def terminate_instance_task(self, instance_id: str, trainee_id: str):
    with background_session() as db:
        service = LabInstanceService(db)
        service._terminate_worker(instance_id, trainee_id, task_id=self.request.id)
```

The worker functions `_launch_worker` and `_terminate_worker`
themselves are identical to the `BackgroundTasks` plan (sections
3.3 and 3.4 of `task-instance.md`) — they're plain sync functions
that take `(instance_id, trainee_id, task_id)` and emit audit
events. The only difference is *who* calls them.

`autoretry_for` deliberately excludes `pyvmomi` faults: a
`vim.fault.DuplicateName` or `InvalidPowerState` is not a transient
error and re‑running won't fix it. Only network/timeout exceptions
auto‑retry; everything else flips the row to `failed` and stops.

### 3.4 Refactor `LabInstanceService`

Same split as `task-instance.md`:

- `enqueue_launch(db, lab_definition_id, trainee_id)` — note the
  signature change vs. the `BackgroundTasks` plan: **no
  `background_tasks` parameter**, since enqueue is just a Celery
  `.delay()` call. Validates lab + duplicate guard, inserts the
  `provisioning` row, commits, calls `start_task(...)` to write the
  `lab_instance_tasks` row (status=`queued`), then:

  ```python
  from app.tasks.lab_instance_tasks import launch_instance_task
  async_result = launch_instance_task.apply_async(
      args=[str(instance.id), str(trainee_id)],
      task_id=task_audit_id,   # use the audit row's UUID as Celery task id
      queue="lab.provisioning",
  )
  ```

  Reusing the audit row's UUID as Celery's `task_id` means we get
  one ID across the audit table and Flower / Redis — no separate
  correlation column needed.

- `enqueue_terminate(db, instance_id, trainee_id)` — same shape:
  flip status to `terminating`, delete Guacamole connections
  synchronously, commit, then
  `terminate_instance_task.apply_async(...)`.

- `_launch_worker` / `_terminate_worker` — same code as the
  `BackgroundTasks` plan, including the early `vm_uuid` commit, the
  status re‑check after clone returns, and the audit event emission
  documented in `task-instance.md` §7.4 / §7.5.

### 3.5 Router changes

Identical to `task-instance.md` §3.5 except both endpoints
**drop** the `BackgroundTasks` injection — they take just `db` and
`userinfo` and call the service's `enqueue_*` methods. Both return
202.

### 3.6 Audit tables

Identical to `task-instance.md` §7. The `lab_instance_tasks` and
`lab_instance_event_logs` tables are reused unchanged. With Celery
the `worker_pid` / `worker_host` columns become genuinely
informative because workers are real separate processes (and
potentially separate containers / hosts).

One small addition: a `celery_task_id: str | None` column on
`lab_instance_tasks` would normally be needed to correlate the
audit row with Celery's tracking, but because §3.4 reuses the
audit row's UUID as Celery's `task_id`, we skip it.

### 3.7 Process‑restart safety — much smaller surface

The orphan reaper from `task-instance.md` §3.6 is **mostly
unnecessary** with Celery, because:

- `acks_late=True` means a task is only removed from Redis after
  `_launch_worker` returns successfully. A worker crash mid‑clone
  causes Redis to re‑deliver the task to another worker.
- `task_reject_on_worker_lost=True` covers SIGKILL / OOM kills.

The only remaining edge case is: the API container inserted the
`provisioning` row and the `lab_instance_tasks` queued row, then
crashed *before* `apply_async` published to Redis. The reaper still
needs to handle that — but it can be tighter:

```python
@app.on_event("startup")
def _reap_unsent_tasks():
    with background_session() as db:
        # Tasks that were queued in our table but never published to Redis
        # heuristic: queued and older than 60s
        stuck = db.query(LabInstanceTask).filter(
            LabInstanceTask.status == "queued",
            LabInstanceTask.enqueued_at < utcnow() - timedelta(seconds=60),
        ).all()
        for task in stuck:
            # Re-publish to Celery; idempotent because the worker re-checks state
            celery_app.send_task(...)
```

Or simply mark them `failed` and let the user retry. Either way,
the cross‑process retry that needed an external queue in
`task-instance.md` §8 is built‑in here.

---

## 4. Frontend impact

Identical to `task-instance.md` §4. The frontend has no idea Celery
exists — it sees the same 202 + polling shape.

---

## 5. Edge cases / failure modes

Most edge cases from `task-instance.md` §5 simplify or disappear:

- **Two clicks on Start Lab**: still rejected synchronously by the
  duplicate‑active‑instance guard inside `enqueue_launch` — same
  as before.
- **Terminate during provisioning**: same behaviour — terminate
  worker reloads, sees `vm_uuid is None` if the clone hasn't
  committed yet, short‑circuits. Launch worker re‑checks status
  after clone returns and self‑destroys if the row went
  `terminating` (same logic).
- **Worker crash mid‑clone**: **handled by Celery automatically**
  via `acks_late` + `reject_on_worker_lost`. The task is
  re‑delivered. The worker's `_launch_worker` must be idempotent —
  which it already is, because it reloads the row by `instance_id`
  and checks `vm_uuid is not None` before attempting another clone.
  This is a real win over `BackgroundTasks`, where a crash means
  the orphan reaper marks the row `failed` and the user has to
  retry manually.
- **API container restart**: pending Celery tasks survive in Redis;
  workers continue. No user impact. With `BackgroundTasks` the
  reaper would have flipped the row to `failed`.
- **Worker container restart**: tasks in flight when SIGTERM
  arrives are re‑queued (with the standard 30 s graceful shutdown
  via `--graceful-shutdown`); already‑acked tasks are gone.

- **`apply_async` raises (Redis down)**: the API call should still
  succeed — log the failure, mark `lab_instance_tasks.status="failed"`
  and `lab_instances.status="failed"` synchronously, return 502 so
  the user knows. Don't leave a `provisioning` row with no task.

---

## 6. Out of scope (intentional)

- **Periodic tasks (Celery Beat).** A `celery-beat` container can be
  added later for cron‑style jobs. We do **not** wire it up in this
  iteration. Once we have it, the obvious uses are:
  - Expire stale instances (rows where `expires_at < now()` and
    `status="running"`) — currently nothing enforces the 4 h TTL.
  - Periodic Guacamole connection garbage collection.
  - Audit table retention (delete `lab_instance_event_logs` rows
    older than `AUDIT_EVENT_RETENTION_DAYS`).
- **Workflow chains / chords.** Celery supports
  `clone | power_on | discover_ip` as a chain of separate tasks.
  We deliberately keep the launch flow as one monolithic task —
  splitting it would multiply the audit complexity and make the
  early `vm_uuid` commit awkward. Revisit if a step needs
  independent retry semantics.
- **Result backend usage.** We set `CELERY_RESULT_BACKEND` for
  Flower's benefit, but the API never calls `AsyncResult.get()` —
  the source of truth is always the `lab_instance_tasks` audit row.
  Result expiry is set to 1 h (`result_expires=3600`) to keep Redis
  small.

---

## 7. Persistent task & event audit

Identical to `task-instance.md` §7. The audit tables and helpers
are infrastructure‑agnostic; they sit between the worker and the
DB and don't care whether the caller is `BackgroundTasks` or Celery.

Two small Celery‑specific notes:

- **`task_audit.start_task` is called from the API container**
  (inside `enqueue_launch`) **before** `apply_async`. So the
  `queued` row exists even if Redis is down — the §5 "Redis down"
  path can flip it to `failed` immediately.
- **`task_audit.mark_running` is called from inside the Celery
  task** as the first line. By that point we know which worker
  picked it up; `worker_pid` and `worker_host` reflect the worker
  container, not the API container.

---

## 8. Deployment topology

Three new long‑running services have to be added to
`docker-compose.prod.yml` (and mirrored in the dev compose):

### 8.1 `redis` service

```yaml
redis:
  image: redis:7-alpine
  container_name: redis
  restart: always
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
  volumes:
    - redis-data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

`appendonly yes` so a Redis restart doesn't lose queued tasks.
`allkeys-lru` is a safety net for the result backend; the queue
itself never hits the cap because `acks_late` removes tasks on
success.

### 8.2 `celery-worker` service

Reuses the same image as `backend` (`Dockerfile.prod`) with a
different `command`:

```yaml
celery-worker:
  build: { context: ./backend, dockerfile: Dockerfile.prod }
  container_name: celery-worker
  restart: always
  command: >
    celery -A app.core.celery worker
    --loglevel=info
    --queues=lab.provisioning,lab.cleanup,lab.monitoring,default
    --concurrency=4
    --hostname=worker@%h
    --max-tasks-per-child=100
  environment:
    - CELERY_BROKER_URL=redis://redis:6379/0
    - CELERY_RESULT_BACKEND=redis://redis:6379/0
    - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
    # Plus all the same env vars the backend uses (Vault, Guacamole, etc.)
  depends_on:
    redis: { condition: service_healthy }
    db:    { condition: service_started }
```

`--concurrency=4` = 4 prefork worker processes per container. With
the existing 1 API worker + 4 Celery workers, the SQLAlchemy pool
(default `pool_size=5`, `max_overflow=10` per *engine instance*)
is now multiplied across 5 processes — each process gets its own
engine, so the math is "per process", not "per cluster".

`--max-tasks-per-child=100` recycles each worker process every
100 tasks to defend against pyvmomi memory leaks (which we've seen
historically). Cheap insurance.

### 8.3 (Optional) `flower` service for monitoring

```yaml
flower:
  build: { context: ./backend, dockerfile: Dockerfile.prod }
  command: celery -A app.core.celery flower --port=5555
  ports: ["127.0.0.1:5555:5555"]
  environment:
    - CELERY_BROKER_URL=redis://redis:6379/0
  depends_on:
    redis: { condition: service_healthy }
```

Bind to localhost only; Flower has weak auth. For prod, expose
behind nginx with basic auth or skip it entirely (the
`lab_instance_tasks` audit endpoint covers the same ground).


### 8.4 Capacity & scaling

- **Worker concurrency model.** `--concurrency=4` uses Celery's
  prefork pool: 4 OS processes, each pulling one task at a time
  thanks to `prefetch_multiplier=1`. So one container handles up
  to 4 concurrent VM clones. Bump `--concurrency` for vertical
  scale, or run multiple `celery-worker` containers (each with a
  unique `--hostname`) for horizontal scale.
- **No additional config** is needed to scale to N worker
  containers — Redis distributes tasks via `BRPOP` on the queue.
  This is the headline operational difference vs.
  `task-instance.md` §8, where we'd have to implement
  `FOR UPDATE SKIP LOCKED` polling ourselves.
- **DB connection pool sizing.** With prefork = 4 and one engine
  per process, each worker container holds up to 4 × (5+10) = 60
  connections under burst. Postgres in `docker-compose.prod.yml`
  is set to `max_connections=50`. **This is a real conflict** —
  add `pool_size=2, max_overflow=4` to the engine constructor in
  `postgres_client.py`, capping each process at 6 connections,
  giving 4×6 = 24 from workers + 5+10 from API = up to 39, which
  fits under 50 with headroom.
- **Starlette threadpool** is no longer the bottleneck because
  workers run outside the API process. The API thread budget is
  freed up for actual request work.

---

## 9. Multi‑worker considerations

This is the section where the Celery plan most differs from
`task-instance.md` §8. Multi‑process is the default, not a future
upgrade.

- **Horizontal scaling.** Run N `celery-worker` containers behind
  the same Redis. Tasks land on whichever has free capacity. No
  code change.
- **Queue separation.** `lab.provisioning` (slow, minutes per
  task), `lab.cleanup` (medium), `lab.monitoring` (short, future
  use). Run a worker pool dedicated to `lab.cleanup` if cleanup
  bursts (end‑of‑class teardown) become noisy neighbours of
  launches.
- **State transitions on the row** (`lab_instances.status`) are
  still racy across workers. Wrap the
  `provisioning → terminating → terminated` transitions in
  `SELECT ... FOR UPDATE` inside the same transaction that writes
  the new status. This is the same advice as `task-instance.md`
  §8.2 Path A — the difference is we **must** do it now under
  Celery, whereas the `BackgroundTasks` plan can defer it because
  it ships single‑worker.
- **Audit row contention.** `start_task` / `mark_running` /
  `finish_task` write to different rows so there's no contention
  between concurrent tasks on the audit tables themselves.

---

## 10. Retention / table growth

Identical to `task-instance.md` §7.8 for the audit tables. Add one
Celery‑specific item: **Redis `result_expires=3600`** keeps the
result backend bounded (~1 KB per task, ~few thousand tasks/day,
trivially small).

---

## 11. Rollout order

1. Add the `lab_instance_tasks` + `lab_instance_event_logs` tables
   and the `error_message` column on `lab_instances` (same
   migration choice as `task-instance.md` §7.6).
2. Add `app/core/celery.py` and `app/tasks/lab_instance_tasks.py`.
   The tasks can be defined and imported without yet being called.
3. Add `redis` and `celery-worker` services to
   `docker-compose.prod.yml` (and the dev compose). Verify with
   `celery -A app.core.celery inspect ping` from inside the
   container.
4. Tighten the SQLAlchemy engine to `pool_size=2, max_overflow=4`
   per §8.4.
5. Add the audit helpers (`task_audit.*`) — pure additions.
6. Implement `enqueue_launch` and switch the launch route. Verify
   with a manual launch that the response is sub‑second and the
   row fills in within ~30 s while events stream into
   `lab_instance_event_logs`.
7. Implement `enqueue_terminate` and switch the terminate route.
8. Add the trimmed startup reaper (only for tasks queued in our
   table but never published to Redis).
9. Add `SELECT ... FOR UPDATE` around the status transitions in
   `enqueue_terminate` and the worker.
10. Add the read‑only audit endpoints (`/tasks`, `/events`).
11. Surface `failed` + `error_message` in `RunLabPage` and the
    detail page.
12. (Optional) Add the `flower` service for monitoring.
13. (Future) Wire up `celery-beat` for the periodic tasks listed
    in §6.
