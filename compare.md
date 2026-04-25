# Comparison: `task-instance.md` (FastAPI BackgroundTasks) vs.
# `celery-task-instance.md` (Celery + Redis)

Both plans solve the same problem — taking the slow vCenter work
(`CloneVM_Task`, `PowerOnVM_Task`, IP discovery, `Destroy_Task`) off
the trainee's HTTP request — and produce the same external API
contract (202 Accepted, polling driven by `/refresh`, identical
frontend changes, same audit tables). They differ in **where the
worker runs** and **what infrastructure has to exist for it**.

This document is opinionated: it picks a recommendation at the end
based on the project's current state (single Docker host, ~1 API
worker, no Redis in `docker-compose.prod.yml`).

---

## 1. At a glance

| Dimension                             | `task-instance.md`                            | `celery-task-instance.md`                              |
|---------------------------------------|-----------------------------------------------|--------------------------------------------------------|
| Mechanism                             | `fastapi.BackgroundTasks` (in‑process thread) | Celery worker (separate process / container)          |
| New infra services                    | None                                          | Redis broker + 1+ worker container (+ optional Flower) |
| New Python deps                       | None                                          | `celery[redis]`, `redis`, `flower`                     |
| New code modules                      | `utils/db_session.py`, `task_audit.py`        | + `core/celery.py`, `tasks/lab_instance_tasks.py`      |
| Lines of code added (rough)           | ~250                                          | ~350 + compose YAML                                    |
| API request → 202 latency             | ~100 ms (thread hand‑off)                     | ~50 ms (Redis `LPUSH`)                                 |
| Concurrency unit                      | AnyIO threadpool (40 slots/process)           | Worker prefork pool (`--concurrency=N`)                |
| Cross‑process retry on crash          | ❌ — orphan reaper marks `failed`             | ✅ — `acks_late` re‑delivers automatically             |
| Survives API restart with tasks queued| ❌ — in‑memory queue lost                     | ✅ — Redis is the queue                                |
| Horizontal scaling (N workers)        | Documented as future work, ~150 lines         | Out of the box: `docker compose scale celery-worker=N` |
| State‑transition race protection      | Not needed under `--workers 1`                | Required from day one (`SELECT … FOR UPDATE`)         |
| Operational moving parts              | 0 new                                         | 2 new (Redis, worker) + monitoring                     |
| Failure surface                       | API container only                            | API + Redis + worker containers                        |
| Observability                         | Audit tables + logs                           | Audit tables + Flower UI + Celery logs                 |
| Schedule‑based jobs (cron)            | Not supported                                 | Free via Celery Beat                                   |
| Onboarding cost (devs)                | Negligible (stdlib FastAPI)                   | Need Celery familiarity                                |

---

## 2. Section‑by‑section diff

| Section in plan       | `task-instance.md`                              | `celery-task-instance.md`                                  |
|-----------------------|-------------------------------------------------|------------------------------------------------------------|
| §3.1 Helper           | `background_session()` ctx manager              | Same, plus `app/core/celery.py` (Celery app)               |
| §3.2 Model            | Add `error_message` (TEXT)                      | Identical                                                  |
| §3.3 Launch worker    | Sync method called via `bg.add_task(...)`       | Sync method called from Celery task wrapper                |
| §3.4 Terminate worker | Same shape                                       | Same shape                                                  |
| §3.5 Router           | Inject `BackgroundTasks` into endpoints         | No `BackgroundTasks`; just `enqueue_*().apply_async()`    |
| §3.6 Restart safety   | Full orphan reaper (~30 lines)                  | Trimmed reaper (only catches "queued but never published") |
| §7 Audit tables       | `lab_instance_tasks`, `lab_instance_event_logs` | Identical                                                  |
| §8 Multi‑worker       | Future work, two paths sketched                  | Built‑in; only adds `SELECT … FOR UPDATE` advice           |
| Deployment            | Zero changes to compose                         | New `redis` + `celery-worker` (+ optional Flower)          |

The audit layer (§7) and the frontend (§4) are 100 % identical
between the two plans — that part of the work is reused regardless
of the choice.

---

## 3. Where the Celery plan genuinely wins

1. **Crash recovery is automatic.** `acks_late=True` +
   `task_reject_on_worker_lost=True` means a worker dying
   mid‑clone causes Redis to redeliver the task to a sibling
   worker. The `BackgroundTasks` plan can only mark the row
   `failed` on restart and asks the user to retry.
2. **The API container can restart at will.** Pending tasks are
   safe in Redis. With `BackgroundTasks`, every API restart
   "loses" any in‑flight launch and the orphan reaper has to flip
   it to `failed`.
3. **Horizontal scaling is the default.** Bumping
   `--scale celery-worker=3` triples capacity with zero code
   changes. The `BackgroundTasks` plan needs the queue table +
   `FOR UPDATE SKIP LOCKED` polling described in
   `task-instance.md` §8.3 to get there.
4. **Cron via Celery Beat.** TTL expiry of `running` instances
   past `expires_at`, periodic Guacamole GC, audit retention —
   all become one‑line additions later. With `BackgroundTasks`
   we'd need APScheduler or systemd timers.
5. **Workers don't compete with HTTP for threads.** Slow tasks
   running on a separate process don't consume Starlette's 40‑slot
   threadpool, so the API stays snappy even under load.

---

## 4. Where the BackgroundTasks plan wins

1. **Zero new infrastructure.** No Redis, no worker container, no
   new healthchecks, no broker‑down failure mode to reason about.
   The "is Redis healthy" question simply doesn't exist.
2. **Simpler ops story.** One container to deploy, monitor, and
   restart. Deployment YAML stays as it is.
3. **Tighter feedback loop in dev.** `uvicorn --reload` reloads
   the workers along with the API; no separate `celery worker`
   process to remember to restart.
4. **No serialization round‑trip.** Arguments are passed as
   Python objects, not JSON; type errors surface immediately, no
   `kombu.exceptions.EncodeError` confusion.
5. **No new failure mode "Redis is down".** With Celery, the
   `enqueue_launch` path has to handle `ConnectionError` from
   `apply_async` and decide what to do (the plan says return 502).
   Under `BackgroundTasks` that path doesn't exist.
6. **Smaller code surface to learn.** A new contributor reads one
   service file and gets the whole story; Celery adds task
   decorators, queue routing, retry policy, prefork semantics,
   and Flower to the surface area.
7. **No new RAM cost.** A `celery-worker --concurrency=4`
   container with the full backend image loaded is ~300–500 MB
   resident; the equivalent `BackgroundTasks` capacity costs
   ~0 MB extra (it's just threads in the existing API process).

---

## 5. Where they're equivalent

- **API contract**: both return 202 with the same body.
- **Frontend changes**: identical (treat `failed` as terminal,
  surface `error_message`).
- **Audit tables**: identical schema, identical helper API.
- **Worker logic** (`_launch_worker` / `_terminate_worker`):
  byte‑for‑byte the same. Only the caller changes.
- **Edge cases** under §5 of each plan: the *list* of edge cases
  is the same; what changes is which ones are handled by the
  framework (Celery handles worker‑crash for free) vs. by us
  (the reaper).


---

## 6. Failure modes — side by side

| Failure                                  | `task-instance.md` outcome                                | `celery-task-instance.md` outcome                                |
|------------------------------------------|-----------------------------------------------------------|------------------------------------------------------------------|
| API container OOM mid‑clone              | Reaper flips row to `failed`; user retries. VM is orphan in vCenter unless §3.3 step 3 (early `vm_uuid` commit) ran. | Same VM‑orphan risk if early commit didn't run; **but** Redis still holds the task and a sibling worker (or the same worker after restart) re‑runs it. Idempotency check (`vm_uuid is not None`) prevents a double clone. |
| Worker SIGKILL mid‑clone                 | Same as above — there's only one process.                | Task re‑delivered to another worker. Audit row shows two `task_started` events.                                  |
| Network blip to vCenter                  | Worker raises, row → `failed`, user retries.             | `autoretry_for=(ConnectionError, TimeoutError)` retries with backoff up to 3 times, transparent to the user.    |
| Network blip to Postgres                 | Same — uncaught, row may stay `provisioning` until reaper flips it. | Same — but `acks_late` will retry the whole task once the worker crashes from the DB error. |
| Redis down                               | N/A (no Redis)                                            | `apply_async` raises; API catches, marks row `failed` synchronously, returns 502. |
| Worker host disk full (logging)          | Same risk; 1 process to monitor.                         | Same risk × N worker hosts.                                     |
| Trainee terminates during provisioning   | Launch worker re‑checks status post‑clone, self‑destroys VM if row went `terminating`. Same logic. | Identical behaviour. |
| Two trainees launch the same lab         | Sync duplicate guard in `enqueue_launch` rejects the second. Same. | Identical.                                                       |
| API restart with row in `provisioning`   | Reaper flips to `failed`. **User must retry.**           | Task continues in worker; row eventually reaches `running`. **No user impact.** |
| Worker restart with task in flight       | N/A (worker is API)                                       | SIGTERM → graceful shutdown re‑queues task; sibling picks up.   |

---

## 7. Cost analysis

### 7.1 Build / migration cost

- `task-instance.md`: ~250 LOC across 3–4 files, no infra, no
  YAML. Estimated 1–2 dev‑days including the audit layer and
  endpoints. No new env vars to plumb.
- `celery-task-instance.md`: ~350 LOC + ~40 lines of compose YAML
  + DB pool retuning. Estimated 3–5 dev‑days. Needs at least one
  end‑to‑end staging cycle to confirm Redis healthchecks, worker
  log routing, and pool sizing under load.

### 7.2 Run cost (single‑host Docker prod)

- `task-instance.md`: 0 extra containers. Negligible RAM/CPU
  delta vs. today.
- `celery-task-instance.md`: +1 Redis (~30 MB resident, <1 % CPU
  idle), +1 worker container (~300–500 MB resident at idle, more
  per concurrent task). Optional Flower adds ~80 MB.

### 7.3 Long‑term maintenance cost

- `task-instance.md`: low. The pattern is "boring sync code in a
  threadpool".
- `celery-task-instance.md`: medium. Celery upgrades occasionally
  bring breaking changes; Redis persistence config is a real
  concern; queue length / worker lag becomes an SRE metric to
  watch.

---

## 8. Decision criteria

Pick `task-instance.md` (BackgroundTasks) if **any** are true:

- The platform stays on a single Docker host with `--workers 1`.
- Crash‑recovery is acceptable as "user retries from the UI".
- We don't need cron‑style periodic jobs in the next 6 months.
- Adding a Redis dependency materially changes the operational
  story (e.g. ops team unfamiliar with it).
- Total expected concurrent launches stay under ~10.

Pick `celery-task-instance.md` if **any** are true:

- Concurrent launches will routinely exceed 10 (class of 50
  trainees launching simultaneously) and we need horizontal
  scaling.
- Crash recovery has to be transparent to the user (no "click
  Start Lab again" UX).
- Redis is already on the platform's roadmap for caching, rate
  limiting, sessions, etc. — Celery is then "free".
- We want Celery Beat for TTL expiry, retention sweeps, and
  Guacamole GC.

---

## 9. Recommendation

**Implement `task-instance.md` first. Plan for `celery-task-instance.md`
as the upgrade path.**

Reasoning:

1. The audit layer (`lab_instance_tasks`, `lab_instance_event_logs`,
   helpers, endpoints) is identical between the two plans. Building
   it under `task-instance.md` is **not** wasted work — it carries
   over verbatim if we later switch to Celery.
2. The worker functions (`_launch_worker`, `_terminate_worker`)
   are identical between the two plans. Their bodies don't change;
   only the caller does. Switching to Celery later is essentially
   "wrap them in a `@celery_app.task` decorator and route them
   through `apply_async`".
3. The current scale (single host, single API worker, low‑volume
   training cohorts) doesn't justify the operational tax of Redis
   + worker container + pool retuning today.
4. The crash‑recovery gap is real but bounded: trainees see
   `failed` in the UI and retry. Acceptable for a v1.
5. When the platform grows to where Celery's strengths matter
   (concurrent class launches, transparent retry, scheduled jobs),
   the migration is mostly:
   - Add the two new modules (`core/celery.py`,
     `tasks/lab_instance_tasks.py`).
   - Add the `redis` + `celery-worker` services.
   - Replace `background_tasks.add_task(...)` with
     `apply_async(...)`.
   - Drop `BackgroundTasks` from the router signatures.
   - Tune the DB pool.

That migration is small precisely because we already shipped the
audit tables and the worker split.

### Concrete next step

Proceed with `task-instance.md` §9 rollout order. Keep
`celery-task-instance.md` as the documented upgrade plan; revisit
when concurrent‑launch volume crosses the threshold from §8 above.
