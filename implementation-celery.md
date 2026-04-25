# Celery Implementation — Step‑by‑Step Task Plan

Concrete, ordered task list for executing the design in
`celery-task-instance.md`. Each task names:

- **Plan sections to re‑read** before starting (the *why*).
- **Codebase files to view** before editing (the *what's there*).
- **Outputs** — files created or modified.
- **Acceptance check** — how to know the step is done.

Read these two reference files end‑to‑end once before starting:

- `celery-task-instance.md` — the design.
- `task-instance.md` — worker bodies (§3.3, §3.4) and audit
  contract (§7) are reused verbatim under Celery.
- `compare.md` — explains why a few details (audit row UUID reused
  as Celery `task_id`, tightened reaper, DB pool retuning) look
  the way they do.

---

## Task 1 — Schema additions (audit tables + `error_message`)

**Plan sections to re‑read**:

- `task-instance.md` §3.2 (the `error_message` column).
- `task-instance.md` §7.1 (`lab_instance_tasks` columns).
- `task-instance.md` §7.2 (`lab_instance_event_logs` columns).
- `task-instance.md` §7.6 (migration strategy — Option A:
  idempotent startup `ALTER TABLE`).
- `celery-task-instance.md` §3.2 and §3.6 (confirms tables are
  reused unchanged).

**Codebase files to view**:

- `backend/app/models/LabDefinition/LabInstance.py` — current
  columns on `lab_instances`.
- `backend/app/config/connection/postgres_client.py` — `Base`,
  `init_db()`, `_import_all_models()`.
- Any one existing model with a JSONB column to copy the pattern
  from (e.g. the connection map field on `LabInstance`).

**Outputs**:

- `backend/app/models/LabDefinition/LabInstanceTask.py` — new model.
- `backend/app/models/LabDefinition/LabInstanceEventLog.py` — new
  model.
- Edit `LabInstance.py` to add `error_message: str | None`.
- Edit `_import_all_models()` to import the two new models so
  `Base.metadata.create_all` picks them up.
- Edit `init_db()` to run idempotent
  `ALTER TABLE lab_instances ADD COLUMN IF NOT EXISTS error_message TEXT;`
  plus index creation for the composite indexes from §7.1 / §7.2.

**Acceptance check**: stack restart creates both tables, adds the
column to an existing `lab_instances` table, no errors in logs.
`psql \d+ lab_instance_tasks` and `\d+ lab_instance_event_logs`
show the columns and indexes from the plan.

---

## Task 2 — `background_session` helper

**Plan sections to re‑read**:

- `task-instance.md` §3.1 (full helper signature and rationale).

**Codebase files to view**:

- `backend/app/config/connection/postgres_client.py` — confirm
  `SessionLocal` symbol name and import path.
- Any existing service that opens a manual session for comparison
  (search `SessionLocal()` if any).

**Outputs**:

- `backend/app/utils/db_session.py` — `background_session()`
  context manager exactly as in `task-instance.md` §3.1.

**Acceptance check**: import works from a Python REPL; opening the
context yields a `Session`, exceptions inside it call `rollback()`,
exit always calls `close()`.

---

## Task 3 — Celery app

**Plan sections to re‑read**:

- `celery-task-instance.md` §3.1 (full Celery config block —
  `task_acks_late`, `reject_on_worker_lost`, queue routes,
  `prefetch_multiplier=1`, etc.).

**Codebase files to view**:

- `backend/requirements.txt` — confirm `celery[redis]`, `redis`,
  and `flower` are present; add them if not.
- `backend/.env.docker` — add `CELERY_BROKER_URL=redis://redis:6379/0`
  and `CELERY_RESULT_BACKEND=redis://redis:6379/0`.
- `backend/app/config/settings.py` (or wherever env vars are
  loaded) — match the project's existing settings pattern and
  expose the two new settings.

**Outputs**:

- Edit `backend/.env.docker` to add the two broker URLs.
- Edit settings module to read them.
- `backend/app/core/celery.py` — Celery app instance with config
  from §3.1 (`backend/app/core/` already exists).

**Acceptance check**: `python -c "from app.core.celery import celery_app; print(celery_app.conf.task_routes)"`
prints the three queue routes. No import error.

---

## Task 4 — Tasks module (decorators only, not yet called)

**Plan sections to re‑read**:

- `celery-task-instance.md` §3.3 (the two `@celery_app.task`
  declarations and their retry policy).
- `task-instance.md` §3.3 + §3.4 (worker body specs that the
  Celery wrappers will call into — the bodies live on
  `LabInstanceService`, this task just writes the wrappers).

**Codebase files to view**:

- `backend/app/services/LabDefinition/lab_instance_service.py` —
  the class the wrappers will call. The `_launch_worker` and
  `_terminate_worker` methods don't exist yet; this task only
  references them by name. Task 7 / Task 8 implement them.

**Outputs**:

- `backend/app/tasks/__init__.py` (empty package marker).
- `backend/app/tasks/lab_instance_tasks.py` — `launch_instance_task`
  and `terminate_instance_task` exactly as in §3.3.


---

## Task 5 — Compose: Redis + worker container

**Plan sections to re‑read**:

- `celery-task-instance.md` §8.1 (Redis service YAML).
- `celery-task-instance.md` §8.2 (worker service YAML, including
  the `--queues`, `--concurrency`, `--max-tasks-per-child` flags).

**Codebase files to view**:

- `docker-compose.prod.yml` — current services and the `backend`
  service env block to copy from.
- `backend/Dockerfile.prod` — the worker container reuses this
  image with a different `command`.
- `backend/.env.docker` — add to the worker container's
  `environment` block the same DB / Vault / Guacamole vars the
  `backend` service uses, plus the broker URLs from Task 3.

**Outputs**:

- Edit `docker-compose.prod.yml`: add `redis`, `celery-worker`
  services + `redis-data` volume + `depends_on: redis` on the
  `backend` service.
- Edit `docker-compose.yml`: same shape for dev.

**Acceptance check**:
- `docker compose -f docker-compose.prod.yml up redis` reports
  `Ready to accept connections`.
- `docker compose ... up celery-worker` logs
  `[tasks] . lab.provisioning.launch_instance` and
  `. lab.cleanup.terminate_instance` on startup.
- `docker compose ... exec celery-worker celery -A app.core.celery inspect ping`
  returns `pong`.

---

## Task 6 — Tighten the SQLAlchemy engine pool

**Plan sections to re‑read**:

- `celery-task-instance.md` §8.4 (the `pool_size=2,
  max_overflow=4` calculation and why it's required given
  Postgres `max_connections=50`).

**Codebase files to view**:

- `backend/app/config/connection/postgres_client.py` — the
  `create_engine(...)` call. Confirm no pool args today (defaults
  to 5 + 10 = 15 per process).
- `docker-compose.prod.yml` — confirm `max_connections=50` on the
  `db` service command line.

**Outputs**:

- Edit `postgres_client.py` to pass `pool_size=2,
  max_overflow=4, pool_pre_ping=True` to `create_engine`.

**Acceptance check**: under a synthetic load of ~10 concurrent
launches, `SELECT count(*) FROM pg_stat_activity` stays well
below 50. No `QueuePool limit ... overflow` warnings in worker
logs.

---

## Task 7 — Audit helpers

**Plan sections to re‑read**:

- `task-instance.md` §7.3 (`task_audit` helper API:
  `start_task`, `mark_running`, `record_event`, `finish_task`).
- `celery-task-instance.md` §7 (the two Celery‑specific notes:
  `start_task` runs in API container, `mark_running` runs in
  worker; reuse audit row UUID as Celery `task_id`).

**Codebase files to view**:

- `backend/app/utils/db_session.py` (created in Task 2).
- The two new models from Task 1.
- Any existing helper in the project that follows the
  "open own session, commit, close" pattern (for style match).

**Outputs**:

- `backend/app/services/LabDefinition/task_audit.py` — the four
  helper functions, each opening its own `background_session()`
  and committing immediately.

**Acceptance check**: from a REPL, calling
`start_task(instance_id, "launch", {})` returns a UUID, inserts
one row in `lab_instance_tasks` with `status="queued"` and one
row in `lab_instance_event_logs` with `event_type="task_queued"`.

---

## Task 8 — Refactor `launch_instance` → `enqueue_launch` + `_launch_worker`

**Plan sections to re‑read**:

- `task-instance.md` §3.3 (full step list for the launch worker —
  early `vm_uuid` commit, status re‑check after clone returns,
  exception handling).
- `task-instance.md` §7.4 (concrete event sequence with
  `record_event` slugs for each step).
- `celery-task-instance.md` §3.4 (signature change: `enqueue_launch`
  has **no `background_tasks` param**; calls `apply_async`
  reusing the audit row UUID as Celery `task_id`).
- `celery-task-instance.md` §5 ("Redis down" → 502 path).

**Codebase files to view**:

- `backend/app/services/LabDefinition/lab_instance_service.py` —
  the current `launch_instance` method, the duplicate guard, the
  vCenter client construction, the Guacamole sync call site.
- `backend/app/services/guacamole_service.py` — for understanding
  what the sync path does (worker doesn't touch it directly; the
  next `/refresh` poll handles it).
- Any vCenter client wrapper used by `launch_instance` (search
  `clone_vm` / `power_on_vm`).

**Outputs**:

- Edit `lab_instance_service.py`:
  - Remove or reduce the old `launch_instance` (keep as thin
    wrapper if a non‑HTTP caller exists; otherwise delete).
  - Add `enqueue_launch(db, lab_definition_id, trainee_id)` —
    sync part: validate, insert `provisioning` row, commit,
    `task_audit.start_task(...)`, `apply_async(...)` reusing the
    audit UUID, handle Redis‑down by flipping to `failed` + 502.
  - Add `_launch_worker(instance_id, trainee_id, task_id)` — the
    sync body matching `task-instance.md` §3.3 + §7.4 step list.

**Acceptance check**: `POST /lab-instances/` returns 202 with the
`provisioning` row in <500 ms. Worker logs show
`task_started → vcenter_connect → clone_started → clone_completed
→ vm_uuid_committed → power_on_started → power_on_completed →
ip_acquired → task_succeeded`. Row reaches `running` after the
next `/refresh` poll. `lab_instance_event_logs` contains all the
slugs for that instance.


---

## Task 9 — Switch the launch route to `enqueue_launch` + 202

**Plan sections to re‑read**:

- `celery-task-instance.md` §3.5 (router change: drop
  `BackgroundTasks` injection, return 202).
- `task-instance.md` §3.5 (response shape — `LabInstanceResponse`,
  `status_code=202`).

**Codebase files to view**:

- `backend/app/routers/LabDefinition/lab_instances.py` — the
  current `POST /lab-instances/` handler, its dependencies and
  response model.

**Outputs**:

- Edit the launch route to call
  `service.enqueue_launch(db, data.lab_definition_id, trainee_id)`
  and return its row with `status_code=202`. Drop any
  `BackgroundTasks` parameter that may have crept in from the
  earlier `task-instance.md` plan.

**Acceptance check**: end‑to‑end UI flow: trainee clicks Start
Lab → response is 202 in <500 ms → `RunLabPage` opens, polls,
shows `provisioning` then `running`. No frontend changes yet
required — the existing 10 s poller handles it.

---

## Task 10 — Refactor `terminate_instance` → `enqueue_terminate` + `_terminate_worker`

**Plan sections to re‑read**:

- `task-instance.md` §3.4 (split spec — sync part deletes
  Guacamole connections + commits; worker does vCenter destroy).
- `task-instance.md` §7.5 (event sequence for terminate).
- `task-instance.md` §5 (the "terminate raced with launch worker
  early commit" + "accept `failed` rows" edge cases).
- `celery-task-instance.md` §3.4 (no `background_tasks` param;
  `apply_async` instead).

**Codebase files to view**:

- `backend/app/services/LabDefinition/lab_instance_service.py` —
  the current `terminate_instance`, the
  `_delete_guacamole_connections` call site, the existing
  status guard `if status in ("terminating", "terminated")`.
- `backend/app/services/guacamole_service.py` — confirms the
  `delete_connection` retry‑on‑401 behaviour added earlier.

**Outputs**:

- Edit `lab_instance_service.py`:
  - Add `enqueue_terminate(db, instance_id, trainee_id)` — sync
    part: idempotency guard, accept `failed` rows, flip to
    `terminating`, delete Guacamole connections, commit,
    `task_audit.start_task(...)`, `apply_async(...)` reusing the
    audit UUID, handle Redis‑down.
  - Add `_terminate_worker(instance_id, trainee_id, task_id)` —
    sync body matching `task-instance.md` §3.4 + §7.5 step list.

**Acceptance check**: `DELETE /lab-instances/{id}` returns 202
with `status="terminating"` in <500 ms. Worker logs show
`vcenter_destroy_started → vcenter_destroy_completed →
task_succeeded`. Row reaches `terminated` after the destroy
completes. Guacamole connections for that instance are gone
immediately on the 202.

---

## Task 11 — Switch the terminate route to `enqueue_terminate` + 202

**Plan sections to re‑read**:

- `celery-task-instance.md` §3.5.
- `task-instance.md` §3.5 (note the 204 → 202 transition and the
  frontend hook signature change required by it).
- `task-instance.md` §4 (frontend impact for the 204 → 202 switch).

**Codebase files to view**:

- `backend/app/routers/LabDefinition/lab_instances.py` — the
  current `DELETE /lab-instances/{id}` handler.
- `frontend/src/hooks/LabInstance/useLabInstance.ts` —
  `terminateInstance` currently returns `Promise<void>` and
  ignores the body.
- `frontend/src/pages/LabInstance/detail/index.tsx` —
  `handleTerminate` is the single caller.

**Outputs**:

- Edit the terminate route to call
  `service.enqueue_terminate(db, instance_id, trainee_id)` and
  return the row with `status_code=202`. Set
  `response_model=LabInstanceResponse`.
- Edit `useLabInstance.terminateInstance` to return
  `Promise<LabInstance>` and parse the JSON body.
- Edit `handleTerminate` in `LabInstance/detail/index.tsx` to set
  the local `instance` state from the returned row before any
  redirect, so the user immediately sees `terminating`.

**Acceptance check**: trainee clicks Terminate → UI flips to
`terminating` instantly → polls until `terminated`. No flash of
stale `running` state.

---

## Task 12 — Trimmed startup reaper

**Plan sections to re‑read**:

- `celery-task-instance.md` §3.7 (the reaper now only handles
  "queued in our table but never published to Redis"; everything
  else is handled by Celery `acks_late`).

**Codebase files to view**:

- `backend/app/main.py` — existing `@app.on_event("startup")`
  hooks, where `init_db()` runs.
- The new `LabInstanceTask` model from Task 1.

**Outputs**:

- Edit `main.py`: add a startup hook that scans
  `lab_instance_tasks` for rows with `status="queued"` and
  `enqueued_at < now() - 60s` and either re‑publishes them via
  `celery_app.send_task(...)` or marks them `failed`. Decision:
  mark `failed` for the first iteration; revisit re‑publish if
  the failure mode is observed in prod.

**Acceptance check**: kill the API container while a launch is
mid‑`apply_async` (artificially — set a breakpoint). Restart;
the `provisioning` row reaches `failed` with
`error_message="task never published"` within seconds. Existing
in‑flight Celery tasks are unaffected.

---

## Task 13 — Row‑level locking on status transitions

**Plan sections to re‑read**:

- `celery-task-instance.md` §9 (multi‑worker considerations —
  `SELECT ... FOR UPDATE` is required from day one because
  workers are real separate processes).
- `task-instance.md` §8.2 Path A (the same advice, deferred under
  the BackgroundTasks plan but mandatory here).

**Codebase files to view**:

- `backend/app/services/LabDefinition/lab_instance_service.py` —
  every place that reads `lab_instance.status` and then writes a
  new value (`enqueue_launch` duplicate guard,
  `enqueue_terminate` idempotency guard, `_launch_worker` status
  re‑check after clone, `_terminate_worker` status reload).

**Outputs**:

- Edit each of the call sites above to wrap the read‑then‑write
  in a `SELECT ... FOR UPDATE` (SQLAlchemy:
  `db.query(LabInstance).filter(...).with_for_update().one()`)
  inside the same transaction that issues the `UPDATE`.

**Acceptance check**: from two terminals, fire a launch and a
terminate against the same instance within 50 ms of each other
in a tight script. The losing transaction observes the winner's
state and either no‑ops (terminate sees row already
`terminated`) or rejects (launch sees an active duplicate).
Neither succeeds twice.

---

## Task 14 — Audit endpoints

**Plan sections to re‑read**:

- `task-instance.md` §7.7 (three endpoints: `/tasks`,
  `/tasks/{task_id}`, `/events`).
- `task-instance.md` §7.1 / §7.2 (the columns the response DTOs
  expose).

**Codebase files to view**:

- `backend/app/routers/LabDefinition/lab_instances.py` — to add
  the three handlers next to the existing ones; copy the RBAC
  guard pattern from `GET /lab-instances/{id}`.
- `backend/app/schemas/` — wherever response models live; add new
  Pydantic schemas for `LabInstanceTaskResponse` and
  `LabInstanceEventLogResponse`.

**Outputs**:

- Edit the lab‑instances router: add
  `GET /lab-instances/{instance_id}/tasks`,
  `GET /lab-instances/{instance_id}/tasks/{task_id}`,
  `GET /lab-instances/{instance_id}/events`.
- New schemas file or addition to existing.

**Acceptance check**: after a successful launch + terminate cycle,
the three endpoints return populated lists; the events endpoint
shows the full lifecycle in chronological order; trainees only
see their own instances' tasks.

---

## Task 15 — Frontend: surface `failed` + `error_message`

**Plan sections to re‑read**:

- `task-instance.md` §4 (full list of frontend changes — `isTerminal`,
  `error_message` banner, Lab detail status gate).
- `celery-task-instance.md` §4 (confirms the frontend is unaware
  of Celery; same changes as the BackgroundTasks plan).

**Codebase files to view**:

- `frontend/src/pages/LabInstance/run/RunLabPage.tsx` — the
  `isTerminal` helper and the polling effect.
- `frontend/src/pages/LabInstance/detail/index.tsx` — its own
  status gate and any banner / status‑pill component.
- `frontend/src/types/` — confirm the `LabInstance` type has (or
  add) the optional `error_message` field.

**Outputs**:

- Add `"failed"` to `isTerminal` in `RunLabPage.tsx` and the
  status gate in `LabInstance/detail/index.tsx`.
- Render a red banner (`role="alert"`) showing
  `instance.error_message` when present in both pages.
- Add `error_message?: string | null` to the `LabInstance` type.

**Acceptance check**: simulate a failure (e.g. point vCenter to
an invalid host in a test instance) — UI shows the red banner
with the worker's truncated error message, polling stops.

---

## Task 16 — (Optional) Flower for monitoring

**Plan sections to re‑read**:

- `celery-task-instance.md` §8.3 (Flower service YAML; bind to
  localhost only).

**Codebase files to view**:

- `docker-compose.prod.yml` (where to add the service).

**Outputs**:

- Edit `docker-compose.prod.yml`: add the `flower` service block.

**Acceptance check**: `curl http://127.0.0.1:5555/api/workers`
on the host returns the worker(s); the audit endpoints from
Task 14 cover the same data so this is operator convenience only.

---

## Task 17 — (Future) Wire Celery Beat for periodic jobs

**Plan sections to re‑read**:

- `celery-task-instance.md` §6 (intentional out‑of‑scope items —
  TTL expiry, Guacamole GC, audit retention).

**Codebase files to view**:

- All places that currently rely on the `expires_at` column
  without enforcing it (search `expires_at`).

**Outputs**:

- Defer to a follow‑up ticket. This task is documented here only
  to keep the rollout list complete.

---

## Final checklist before merging

- [ ] Existing `task-instance.md` rollout (§9) is **not** in
      progress in parallel — pick one path.
- [ ] All 11 acceptance checks above pass on a clean stack
      (`docker compose down -v` then up).
- [ ] `lab_instance_event_logs` row count after one launch +
      terminate is in the 15–25 range (sanity bound).
- [ ] No `QueuePool limit ... overflow` warnings under a
      10‑concurrent‑launch synthetic test.
- [ ] `celery -A app.core.celery inspect active` is empty
      between launches (no leaked tasks).
- [ ] `docker compose ... down` followed by `up` recovers any
      task that was in flight at shutdown (Celery `acks_late`
      behaviour verified manually once).

