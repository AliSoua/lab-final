# Refactor Lab Instance Launch / Terminate to FastAPI Background Tasks

Goal: stop blocking the trainee's HTTP request on slow vCenter operations
(`CloneVM_Task`, `PowerOnVM_Task`, IP discovery, `Destroy_Task`). The router
should return as soon as the DB row is created/updated; the heavy work runs
in a background task in the same FastAPI process.

**Constraint**: do not introduce Celery (or any external broker / worker).
Use FastAPI's built‑in `BackgroundTasks` only.

This document describes the plan only — no code is changed here.

---

## 1. Current state (recap)

- `POST /lab-instances/` calls `LabInstanceService.launch_instance` which
  synchronously: looks up the lab → connects to vCenter → clones the VM →
  powers it on → reads power state + IP → inserts the `LabInstance` row →
  returns. The whole call typically takes 20–60 s.
- `DELETE /lab-instances/{id}` calls `terminate_instance` which sets
  `status="terminating"`, deletes Guacamole connections, then waits on
  vCenter `PowerOffVM_Task` + `Destroy_Task` before flipping to
  `terminated`. Also 10–30 s.
- `POST /lab-instances/{id}/refresh` is already short‑lived (one vCenter
  query + per‑slot Guacamole sync) and is what `RunLabPage` polls every
  10 s. It does **not** need to move to a background task.

The frontend already polls `refresh` and tolerates a `provisioning` /
`terminating` state, so moving the slow work off the request thread is a
drop‑in change for the UI.

## 2. Target behaviour

1. `POST /lab-instances/` returns **HTTP 202 Accepted** within ~100 ms with
   the freshly‑inserted `LabInstance` row in `status="provisioning"` and
   no `vm_uuid` / `ip_address` yet. A background task performs the clone,
   power‑on, and IP discovery, then updates the same row.
2. `DELETE /lab-instances/{id}` returns **HTTP 202 Accepted** within
   ~200 ms with the row already flipped to `status="terminating"` and the
   Guacamole connection map cleared (so the running poller stops creating
   new connections). A background task performs the vCenter `Destroy_Task`
   and finally flips the row to `terminated`.
3. `POST /refresh` is unchanged.
4. The existing 10 s polling on `RunLabPage` and 30 s polling on
   `LabInstance/detail` already drives the UI to the new state with no
   frontend changes required beyond surfacing a `failed` status.

---

## 3. Backend changes

### 3.1 New helper module: `backend/app/utils/db_session.py`

`BackgroundTasks` outlives the request, so the `Depends(get_db)` session
will already be closed when the worker runs. Add a tiny context‑manager
helper that opens its own `SessionLocal()` and commits/rolls back / closes:

```python
@contextmanager
def background_session() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback(); raise
    finally:
        db.close()
```

(Use the existing `SessionLocal` from `app.config.connection.postgres_client`.)

### 3.2 `LabInstance` model — `error_message` + audit pointer

Add a nullable `error_message: str | None` column (TEXT) on
`lab_instances` so a failed background task can surface a one‑liner to
the UI. **Note**: `init_db()` uses `Base.metadata.create_all` which
only creates missing tables — it will not add this column to an
existing `lab_instances` table. See section 7.6 for the migration
options (Alembic vs. idempotent startup `ALTER TABLE`).

Status state machine becomes: `provisioning → running → stopped/terminated`,
with `provisioning → failed` and `terminating → failed` as error paths.
`failed` already mirrors the wording the frontend shows for unknown
states; `RunLabPage` should treat it as terminal.

The single `error_message` column is intentionally minimal — it covers
the "what went wrong on the most recent attempt" question for the UI.
Full audit (every state transition, per‑step timestamps, per‑task
worker identity, structured event metadata) lives in two new tables
described in **section 7. Persistent task & event audit**.

### 3.3 Refactor `LabInstanceService.launch_instance`

Split into two methods:

- `enqueue_launch(db, lab_definition_id, trainee_id, background_tasks)`
  - Validates lab + duplicate guard (same checks as today).
  - Inserts a `LabInstance` with `status="provisioning"`, `vm_uuid=None`,
    `ip_address=None`, `vm_name=None`, `vcenter_host=None`,
    `started_at=utcnow()`, `expires_at=utcnow()+4h`,
    `guacamole_connections={}`.
  - `db.commit(); db.refresh(instance)`.
  - `background_tasks.add_task(self._launch_worker, instance.id, trainee_id)`.
  - Returns the row.

- `_launch_worker(instance_id, trainee_id)` — runs in the background:
  1. `with background_session() as db:` reload the instance.
  2. Re‑resolve vCenter creds (same logic as current `launch_instance`).
  3. `client.clone_vm(...)`. **As soon as the clone returns**, commit
     `vm_uuid` + `vm_name` + `vcenter_host` to the DB *before* attempting
     `power_on_vm`. This is critical: a worker crash (or an OOM kill)
     between the clone returning and the final commit would otherwise
     leave a VM in vCenter that the DB has no reference to. With the
     early commit, the orphan reaper plus a manual terminate can find
     and destroy it via `vm_uuid`.
  4. `client.power_on_vm(vm_uuid)`, read `power_state` + `ip_address`,
     commit again. Status stays `provisioning` until the normal `refresh`
     path flips it to `running` once the IP is reachable.
  5. On any exception: `instance.status = "failed"`,
     `instance.error_message = str(e)[:1000]`, commit. Log with
     `exc_info=True`. If `vm_uuid` was already committed in step 3 it
     remains, so cleanup via `enqueue_terminate` is still possible.

The synchronous `launch_instance` method is removed (or kept as a thin
wrapper that delegates to `enqueue_launch` for any non‑HTTP caller, e.g.
tests; out of scope here).

### 3.4 Refactor `LabInstanceService.terminate_instance`

Split similarly:

- `enqueue_terminate(db, instance_id, trainee_id, background_tasks)`
  - Loads the instance, raises `ValueError` if missing.
  - Idempotency guard: if `status in ("terminating", "terminated")`,
    return immediately (no second background task) and return the row
    as‑is.
  - **Accept `failed` rows as a valid input state.** A failed launch
    may have committed `vm_uuid` in 3.3 step 3 but never reached
    `running`; the terminate path is the trainee's only way to clean up
    that vCenter orphan. Treat `failed` exactly like `provisioning` /
    `running` here.
  - Sets `status="terminating"`, calls
    `_delete_guacamole_connections(instance, db=db)` synchronously
    (these are short HTTPS calls and we want them done before the response
    so the running poller stops creating new connections — exactly what
    the current code already does).
  - `db.commit()`.
  - `background_tasks.add_task(self._terminate_worker, instance_id, trainee_id)`.

- `_terminate_worker(instance_id, trainee_id)` — runs in the background:
  1. Open a fresh session.
  2. Reload instance; if `status != "terminating"`, log and return
     (defensive — handles a manual DB edit or a duplicate enqueue).
  3. Run the existing vCenter destroy block (`PowerOffVM_Task` →
     `Destroy_Task`).
  4. `instance.status = "terminated"; instance.stopped_at = utcnow()`,
     commit.
  5. On exception: `status = "failed"`, `error_message = str(e)[:1000]`,
     commit, log with `exc_info=True`.

### 3.5 Router changes — `app/routers/LabDefinition/lab_instances.py`

- Inject `BackgroundTasks` into both endpoints:

  ```python
  def launch_lab_instance(
      data: LabInstanceCreate,
      background_tasks: BackgroundTasks,
      db: Session = Depends(get_db),
      userinfo: dict = Depends(require_all),
  ): ...
  ```

- `launch_lab_instance` now calls `enqueue_launch(...)` and returns the
  freshly‑inserted row with `status_code=202`.
- `terminate_instance` calls `enqueue_terminate(...)` and returns the
  updated row (now in `status="terminating"`) with `status_code=202`.
  This replaces the current `204 No Content` so the frontend reflects
  the new status without waiting for the next `/refresh` poll. The
  `response_model` becomes `LabInstanceResponse` (matching `launch`).
- `stop_instance` is left as a follow‑up (same pattern, lower priority).
- `refresh_instance_status` is unchanged.

### 3.6 Process‑restart safety (orphan reaper)

`BackgroundTasks` lives in‑process and is lost on restart. Add a single
startup hook in `app/main.py`:

```python
@app.on_event("startup")
def _reap_orphan_instances():
    with background_session() as db:
        stuck = db.query(LabInstance).filter(
            LabInstance.status.in_(["provisioning", "terminating"])
        ).all()
        for inst in stuck:
            inst.status = "failed"
            inst.error_message = "Backend restarted while task was running"
        db.commit()
```

This is conservative — any instance whose worker was interrupted is marked
`failed` so the trainee can manually terminate (which itself enqueues the
vCenter cleanup). No silent zombies.

---

## 4. Frontend impact

Minimal:

- `useLabInstance.launchLabInstance` already treats any 2xx as success;
  202 is fine.
- `useLabInstance.terminateInstance` currently returns `Promise<void>`
  and ignores the body. Change its signature to
  `Promise<LabInstance>`, parse the JSON body, and update the single
  caller in `pages/LabInstance/detail/index.tsx` (`handleTerminate`)
  so it can immediately set the local `instance` state to the
  `terminating` row before navigating away — otherwise the user briefly
  sees the stale `running` status while the redirect happens.
- `RunLabPage` and `LabInstance/detail/index.tsx`: add `"failed"` to the
  terminal‑state set used by polling (`isTerminal` in `RunLabPage`, the
  status‑gate in `LabInstance/detail`) and surface a red banner showing
  `instance.error_message` when present.
- No route changes, no new pages.

---

## 5. Edge cases / failure modes

- **Two clicks on Start Lab**: the duplicate‑active‑instance guard inside
  `enqueue_launch` still runs synchronously, so the second 202 is
  rejected as 400 before any background task is scheduled.
- **Terminate during provisioning**: the launch worker sees the row flip
  to `terminating` between its own commits; once it finishes the clone
  it will commit `vm_uuid`, then the terminate worker (which holds a
  fresh session) will see the row and destroy the VM normally. Worst
  case the launch worker completes first and the terminate worker just
  destroys what was clone — same outcome as the current synchronous
  code path.
- **Worker crashes mid‑clone**: the orphan reaper on next restart marks
  the row `failed`. The trainee can terminate to trigger vCenter cleanup
  (the destroy worker handles a missing `vm_uuid` gracefully — keep that
  branch).
- **Refresh polled while provisioning**: `refresh_instance_status` already
  early‑returns when `vm_uuid` or `vcenter_host` is missing. No change
  needed.
- **Re‑launch after a failed instance**: the duplicate‑active‑instance
  guard inside `enqueue_launch` filters on
  `status in ("provisioning", "running")`, so a `failed` row does **not**
  block a fresh launch — the trainee can simply click `Start Lab` again.
  The failed row stays in the DB for audit; it is the trainee's
  responsibility to terminate it if a vCenter orphan exists.
- **Terminate raced with launch worker's early commit**: if the trainee
  hits Terminate after `enqueue_launch` has returned but *before* the
  launch worker has run step 3.3.3 (early `vm_uuid` commit), the
  terminate worker reloads the row and finds `vm_uuid is None`. It must
  short‑circuit the vCenter destroy block (already guarded by
  `if instance.vm_uuid and instance.vcenter_host`) and just flip status
  to `terminated`. The launch worker, when it later wakes, must check
  the latest `status` after its clone returns and, if it sees
  `terminating`/`terminated`, immediately destroy the just‑cloned VM
  itself before exiting (so it doesn't leak). Add this status re‑check
  as the first line after `clone_vm` returns.

---

## 6. Out of scope (intentional)

- Multi‑worker / multi‑process scaling. The plan as written assumes the
  current `--workers 1` setting in `backend/Dockerfile.prod`. Concrete
  steps for going to N workers (queue table, advisory‑locked reaper,
  `SELECT … FOR UPDATE` around state transitions) are documented in
  **section 8. Multi‑worker considerations** but not implemented in
  this iteration.
- Cancellation. A background task cannot be cancelled from another
  request. If the trainee terminates while provisioning, the launch
  worker continues to completion; the terminate worker then cleans up.
- Progress reporting beyond the existing `status` column (e.g. "30 % —
  cloning", "60 % — powering on"). The event log in section 7.2 makes
  this almost free — surface the latest event's `message` as a
  progress hint — but the frontend doesn't render it yet.

### 6.1 Capacity ceilings to monitor (not changed in this refactor)

Two soft limits become more relevant once slow work moves off the
request thread and into long‑running workers:

- **Starlette sync‑threadpool size.** FastAPI runs sync background
  tasks (ours are sync because pyvmomi is sync) on the AnyIO default
  threadpool, capped at 40 workers per process. At our current scale
  this is comfortable; if a class of 100 trainees launches at once the
  41st task queues until an earlier one finishes. Bump via
  `anyio.to_thread.current_default_thread_limiter().total_tokens = N`
  in the FastAPI startup hook if needed.
- **SQLAlchemy connection pool.** Each running worker checks out one
  connection through its own `SessionLocal()`. Confirm the engine's
  `pool_size` + `max_overflow` comfortably exceeds expected peak
  concurrent workers plus normal request traffic; otherwise workers
  will block on `pool.checkout()` and stretch the perceived launch
  time.

---

## 7. Persistent task & event audit

The single `error_message` column on `lab_instances` answers "did the
last attempt fail and why" but not "when did each step run, how long
did it take, who ran it, was it retried, what does the event timeline
look like". Two new tables capture that.

### 7.1 `lab_instance_tasks` — one row per background task run

One row is inserted by `enqueue_launch` / `enqueue_terminate` *before*
`background_tasks.add_task(...)` returns, so the queued task is
visible in the DB even if the process is killed before the worker
actually runs.

Columns:

- `id: UUID` (pk, default `uuid4`).
- `lab_instance_id: UUID` (fk → `lab_instances.id`, ON DELETE CASCADE,
  indexed).
- `task_type: str` — one of `launch`, `terminate`. Indexed jointly
  with `status` for the reaper query.
- `status: str` — `queued | running | success | failed | abandoned`.
  `abandoned` is what the startup reaper writes for tasks that were
  `running` when the process died.
- `attempt: int` (default 1) — reserved for a future retry path; for
  now always 1.
- `worker_pid: int | None` — `os.getpid()` written when the worker
  transitions `queued → running`. Useful when we eventually run > 1
  Uvicorn worker.
- `worker_host: str | None` — `socket.gethostname()`, same rationale
  (containers will share the same hostname inside the pod, but it
  still distinguishes dev laptop runs from prod).
- `enqueued_at: datetime` (UTC, server\_default `now()`).
- `started_at: datetime | None` — set when the worker picks the task
  up.
- `finished_at: datetime | None` — set on either success or failure.
- `duration_ms: int | None` — `(finished_at - started_at)` rounded;
  denormalised so the audit endpoints don't have to compute it on
  every read.
- `error_message: str | None` — short summary, mirrored into
  `lab_instances.error_message` on failure for the UI.
- `error_traceback: str | None` — full `traceback.format_exc()` on
  failure. Stays in the task row only (not copied to `lab_instances`)
  to keep the hot row small.
- `payload: JSONB` (default `{}`) — opaque dict the enqueuer can use
  for context, e.g. `{"trainee_id": ..., "lab_definition_id": ...}`
  for launches and `{"reason": "user_requested" | "expiry" | ...}`
  for terminates.

Composite index `(lab_instance_id, enqueued_at DESC)` so the
`/tasks` endpoint can paginate the timeline cheaply.

### 7.2 `lab_instance_event_logs` — granular per‑step events

Where `lab_instance_tasks` is the coarse "this task ran from T1 to
T2 and succeeded", the event log is the fine‑grained breadcrumb
trail emitted from inside the worker — one row per significant step.
Append‑only.

Columns:

- `id: UUID` (pk).
- `lab_instance_id: UUID` (fk, indexed, ON DELETE CASCADE).
- `task_id: UUID | None` (fk → `lab_instance_tasks.id`, nullable so
  the startup reaper or `refresh_instance_status` can write events
  without a parent task).
- `level: str` — `debug | info | warning | error`. Defaults to `info`.
- `event_type: str` — short slug. Stable set: `task_queued`,
  `task_started`, `vcenter_connect`, `clone_started`, `clone_completed`,
  `vm_uuid_committed`, `power_on_started`, `power_on_completed`,
  `ip_acquired`, `guacamole_sync_started`, `guacamole_sync_completed`,
  `terminate_guacamole_cleanup`, `vcenter_destroy_started`,
  `vcenter_destroy_completed`, `task_succeeded`, `task_failed`,
  `restart_reaped`. Free‑form additions are allowed but the UI only
  formats known slugs.
- `message: str` — human readable one‑liner.
- `data: JSONB` (default `{}`) — structured detail, e.g.
  `{"vm_uuid": "...", "ip": "10.0.0.42", "duration_ms": 1234}` or
  `{"connection_id": "5", "protocol": "ssh"}`.
- `created_at: datetime` (UTC, server\_default `now()`, indexed).

Composite index `(lab_instance_id, created_at DESC)`.

### 7.3 Helper module: `backend/app/services/LabDefinition/task_audit.py`

Small, dependency‑free helpers used by the workers. **Each helper
opens its own `background_session()` and commits immediately** so
that audit writes are visible to API readers even if the worker's
main transaction later rolls back. This is the same pattern the
codebase already uses for `_save_connections_map`.

- `start_task(instance_id, task_type, payload) -> task_id`: inserts
  a row in `lab_instance_tasks` with `status="queued"` and an event
  `task_queued`. Called from `enqueue_launch` / `enqueue_terminate`.
- `mark_running(task_id)`: sets `status="running"`, `started_at`,
  `worker_pid`, `worker_host`; emits `task_started`.
- `record_event(task_id, instance_id, event_type, message, level,
  data)`: appends one row to `lab_instance_event_logs`.
- `finish_task(task_id, success, error_message=None,
  error_traceback=None)`: sets `status`, `finished_at`,
  `duration_ms`, copies `error_message` onto the parent
  `lab_instances` row when failing, emits `task_succeeded` or
  `task_failed`.

### 7.4 Wiring into the launch worker (concrete sequence)

Inside `_launch_worker(instance_id, trainee_id, task_id)`:

1. `task_audit.mark_running(task_id)` → emits `task_started`.
2. Open `background_session()`; reload the row.
3. `record_event(..., "vcenter_connect", "Connecting to vCenter")`,
   then connect.
4. `record_event(..., "clone_started", "Cloning template",
   data={"template": "..."})`; call `client.clone_vm(...)`.
5. On clone return, the **early commit** from section 3.3 happens
   here: persist `vm_uuid`, `vm_name`, `vcenter_host`, then
   `record_event(..., "vm_uuid_committed", ..., data={"vm_uuid": ...})`.
6. **Status re‑check** (section 5 race): re‑select the row; if
   `status in ("terminating", "terminated")`, destroy the just‑cloned
   VM, emit `task_failed` with `error_message="cancelled by terminate"`
   via `finish_task(success=False, ...)`, return.
7. `record_event(..., "power_on_started", ...)`; `power_on_vm`;
   `record_event(..., "power_on_completed", ...,
   data={"duration_ms": ...})`.
8. Discover IP, `record_event(..., "ip_acquired", ...,
   data={"ip": "..."})`.
9. Update row to `status="running"`, set `ip_address`, commit.
10. `_sync_guacamole_connections(...)` is called by the next
    `/refresh` poll; we still emit `guacamole_sync_started` /
    `_completed` from inside that path so a manual scan of one
    instance's events shows the full lifecycle.
11. `task_audit.finish_task(task_id, success=True)` → emits
    `task_succeeded`.

Any unhandled exception is caught at the outermost `try` of
`_launch_worker`:

```python
try:
    ...
except Exception as exc:
    tb = traceback.format_exc()
    task_audit.finish_task(
        task_id, success=False,
        error_message=str(exc)[:500], error_traceback=tb,
    )
    # also flip lab_instances.status -> "failed" + error_message
    raise
```

### 7.5 Wiring into the terminate worker

Inside `_terminate_worker(instance_id, task_id)`:

1. `mark_running(task_id)`.
2. `record_event(..., "terminate_guacamole_cleanup", ...,
   data={"connection_count": N})` — emitted from inside
   `enqueue_terminate` (sync part) since that's where the
   Guacamole deletion already happens.
3. `record_event(..., "vcenter_destroy_started", ...,
   data={"vm_uuid": "..."})`; call `power_off_vm` then `destroy_vm`.
4. `record_event(..., "vcenter_destroy_completed", ...,
   data={"duration_ms": ...})`.
5. Flip to `status="terminated"`, commit, `finish_task(success=True)`.

### 7.6 Schema migration strategy

The repo has no Alembic. Three options, in increasing order of
ceremony:

- **Option A (recommended for this iteration): idempotent startup
  DDL.** In `init_db()` after `Base.metadata.create_all`, run a
  short block of `ALTER TABLE lab_instances ADD COLUMN IF NOT EXISTS
  error_message TEXT;` plus index creation for the new tables. The
  two new tables (`lab_instance_tasks`, `lab_instance_event_logs`)
  appear via `create_all` once their models are imported in
  `_import_all_models()`. Pros: zero new tooling. Cons: not a
  proper version history; ALTERs accumulate in code.
- **Option B: introduce Alembic now.** Generate the baseline
  migration from `Base.metadata`, then a second revision with the
  new column + tables. More correct long term; out of scope unless
  the team explicitly wants it now.
- **Option C: drop the column.** Skip `error_message` on
  `lab_instances`, surface the failure exclusively via the latest
  failed `lab_instance_tasks` row + its `error_message`. The UI
  banner code does one extra query but the schema stays untouched.
  Viable; loses the cheap "show last error inline with the
  instance" path.

Plan assumes **Option A** unless reviewer prefers B.

### 7.7 Read‑only audit endpoints

Three new endpoints under the existing `lab-instances` router:

- `GET /lab-instances/{instance_id}/tasks?limit=20&offset=0` —
  paginated task history for one instance. RBAC: instructor / admin
  see anyone's; trainee only their own (same predicate as the
  existing `GET /lab-instances/{id}`).
- `GET /lab-instances/{instance_id}/tasks/{task_id}` — one task
  with its events nested.
- `GET /lab-instances/{instance_id}/events?limit=100&offset=0&level=...`
  — flat event stream, optionally filtered by level. Useful for the
  "Show diagnostics" panel mentioned in section 6.

All three use the new helpers, so adding them is mostly DTO + Pydantic
schemas + 3 thin route handlers — no service logic.

### 7.8 Retention / table growth

Both new tables grow without bound. For now:

- `lab_instance_event_logs` writes ~10–20 rows per instance launch
  + ~5 per terminate. At 100 instances/day that's ~3 k rows/day,
  ~1 M rows/year — fine for Postgres with the `created_at` index.
- `lab_instance_tasks` writes 2 rows per instance lifecycle. Tiny.

Add a daily cleanup hook later (configurable
`AUDIT_EVENT_RETENTION_DAYS`, default 90). Not implemented in this
iteration; flagged in section 6.

---

## 8. Multi‑worker considerations

`backend/Dockerfile.prod` currently launches Uvicorn with
`--workers 1`. Everything in sections 1–7 is correct under that
assumption. This section enumerates what changes if we ever lift
that assumption, so the design we ship today doesn't paint us into
a corner.

### 8.1 What breaks under N > 1 workers (today's plan)

1. **`BackgroundTasks` is process‑local.** The task only runs in
   the same Uvicorn worker that handled the request. That worker
   may serve other requests and may also crash; the other N‑1
   workers can't pick up the slack. Acceptable today, not
   acceptable at multi‑worker scale.
2. **Startup orphan reaper races.** Every worker runs the reaper
   on startup. With N workers, N reapers race to flip
   `provisioning` rows to `failed` — they'll all succeed
   independently and emit duplicate `restart_reaped` events.
3. **No mutual exclusion on state transitions.** Today's
   `enqueue_terminate` does an in‑memory check‑then‑update.
   Concurrent terminates from two workers (e.g. a user click and
   an expiry sweep landing on different processes) could each
   emit a `terminate` task; only one would actually destroy the
   VM, but both would write event rows.

### 8.2 Path A — keep `BackgroundTasks`, gate concurrency at the DB

Cheapest evolution if we still want in‑process workers:

- Wrap every state transition that touches `lab_instances.status`
  in `SELECT ... FOR UPDATE` inside the same transaction that
  writes the new status. Postgres serialises competing writers on
  the row lock; the second one observes the first one's update
  and either no‑ops (terminate already in flight) or returns a
  409.
- Gate the startup orphan reaper behind a Postgres advisory lock:
  `SELECT pg_try_advisory_lock(:reaper_key)`. Only the worker
  that wins the lock runs the reaper; others skip. The lock is
  released when that worker's connection closes, which is fine
  because reaping only needs to run once per restart.
- Keep `BackgroundTasks`. Accept that a worker crash leaks its
  in‑flight tasks; the orphan reaper running on whichever worker
  starts next will catch them.

Pros: minimal new infrastructure. Cons: still no cross‑worker
retry; a long task pinned to a now‑busy worker waits behind
that worker's request queue.

### 8.3 Path B — turn `lab_instance_tasks` into the queue

The tables we're already adding in section 7 are most of a queue.
Add:

- A polling loop in each worker (started from FastAPI's `lifespan`)
  that runs `SELECT ... FROM lab_instance_tasks WHERE status =
  'queued' ORDER BY enqueued_at LIMIT 1 FOR UPDATE SKIP LOCKED;`
  every ~500 ms. The `SKIP LOCKED` clause guarantees exactly one
  worker picks each task; standard Postgres‑as‑queue pattern.
- A worker lease: when a task is claimed, write
  `worker_pid` + `worker_host` + `started_at`. A second background
  job runs every 60 s and re‑queues any task whose `started_at`
  is older than `LAUNCH_TASK_TIMEOUT_SECONDS` (default 600) — this
  is the cross‑process equivalent of the orphan reaper, and it
  also handles "worker crashed mid‑task on another machine".
- The router stops calling `background_tasks.add_task` and just
  inserts the queued row; the polling loop handles dispatch.

Pros: real horizontal scaling, automatic recovery from worker
crashes, retries are a one‑line change (`attempt += 1`,
`status = 'queued'`). Cons: worker‑side polling overhead, more
moving parts to test.

### 8.4 Recommendation

Stay on `--workers 1` for this iteration. Implement section 7's
tables now so when we do scale, Path B is a small additive change
(add the polling loop, swap `add_task` for an `INSERT`). Do not
implement Path A as an interim step — its `SELECT ... FOR UPDATE`
sprinkles are work we'd rip out again when moving to Path B.

Add an inline comment in `backend/Dockerfile.prod` next to
`--workers 1` pointing reviewers at this section, so a future
contributor doesn't bump it without reading the implications.

---

## 9. Rollout order

1. Add the `background_session` helper, the `error_message` column on
   `lab_instances` (via the chosen migration strategy from 7.6), and
   the new `lab_instance_tasks` + `lab_instance_event_logs` tables
   (these appear automatically on next startup once imported in
   `_import_all_models()`).
2. Add the audit helpers (`task_audit.start_task`, `mark_running`,
   `finish_task`, `record_event`) — pure additions, no behaviour
   change.
3. Implement `enqueue_launch` / `_launch_worker`, wire in audit calls,
   and switch the launch route. Verify the response is sub‑second and
   the row fills in within ~30 s while events stream into
   `lab_instance_event_logs`.
4. Implement `enqueue_terminate` / `_terminate_worker` (also wired to
   audit), and switch the terminate route. Verify the response is
   sub‑second and the row reaches `terminated` after the destroy
   completes.
5. Add the startup orphan reaper (single‑worker version) and confirm
   it correctly marks rows whose worker died as `failed` and writes a
   `restart_reaped` event.
6. Add the read‑only audit endpoints (`/tasks`, `/events`).
7. Surface `failed` + `error_message` in `RunLabPage` and the detail
   page; optionally add a "Show diagnostics" panel that calls
   `GET /lab-instances/{id}/events`.
8. Document the `--workers 1` constraint inline in
   `backend/Dockerfile.prod`. Defer Path A / Path B from section 8 to
   a follow‑up ticket.
