# Update Lab Instance Launch — Embed Guacamole with Header‑Auth SSO

Goal: when a trainee clicks **Start Lab**, after the VM is provisioned and
`guacamole_connections` exist, the trainee is transparently signed into
Guacamole (via the same Nginx `auth_request` → `/auth/guacamole-sso` flow used
by `TestGuacamolePage`) and sees the VM inside an embedded iframe laid out
like `src/pages/LabGuide/PreviewGuidePage.tsx` (guide on the left, Guacamole
console on the right).

This document describes the implementation only — no code is changed here.

---

## 1. Current state (recap)

- **Auth SSO to Guacamole** already works end‑to‑end in `TestGuacamolePage`:
  - `useAuth` writes `access_token` cookie (`SameSite=Lax`) on login/refresh.
  - Nginx `location = /guacamole/api/tokens` triggers `auth_request /_auth_guacamole`.
  - `/_auth_guacamole` forwards the cookie as `Authorization: Bearer …` to
    `backend:8000/auth/guacamole-sso`, which validates via Keycloak and
    returns `X-Remote-User: <preferred_username>`.
  - Guacamole’s header‑auth extension auto‑provisions that user.
- **Launch pipeline** creates VMs and Guacamole connections **under ROOT with
  no per‑user permissions** (`guacamole_service.create_connection`). The
  auto‑provisioned trainee therefore sees an empty Guacamole home — the
  connections exist but aren’t visible to them.
- **Lab Instance page** (`frontend/src/pages/LabInstance/detail/index.tsx`)
  currently renders each connection as an external anchor to
  `/guacamole/#/client/{connId}` and opens it in a new tab.

## 2. Target behaviour

1. `POST /lab-definitions/lab-instances/` launches the VM (unchanged).
2. `POST /lab-definitions/lab-instances/{id}/refresh` creates/updates the
   Guacamole connections **and grants READ to the calling trainee’s
   Guacamole user** (keyed by Keycloak `preferred_username`).
3. Frontend navigates to a running‑lab page built like `PreviewGuidePage`:
   - Left: guide/steps panel (reuse `GuidePanel` if the lab has a linked
     guide, otherwise a lightweight “Lab info / connection switcher” panel).
   - Right: an `<iframe src="/guacamole/#/client/<encoded-id>" />` replacing
     the mock `VMConsole`. The cookie‑based `auth_request` flow logs the
     trainee into Guacamole automatically — exactly like `TestGuacamolePage`.
4. If the lab defines multiple connections (`ssh`, `rdp`, `vnc`, or several
   slots), expose a tab strip that swaps the iframe’s `key`/`src` so the
   browser fully reloads the Guacamole client between protocols.

---

## 3. Backend changes

### 3.1 Extend `backend/app/services/guacamole_service.py`

Add three methods (all use the existing admin token helpers):

- `ensure_user(self, username: str) -> None`
  - `GET /session/data/postgresql/users/{username}` — if 404, issue
    `POST /session/data/postgresql/users` with body
    `{"username": username, "password": "", "attributes": {}}`.
  - Header‑auth provisions on first login too, but pre‑creating prevents
    the race where we grant permissions before the user row exists.

- `grant_connection_permission(self, username: str, connection_id: str) -> None`
  - `PATCH /session/data/postgresql/users/{username}/permissions` with
    `[{"op": "add", "path": "/connectionPermissions/{connection_id}", "value": "READ"}]`.
  - Idempotent: swallow 400 “already granted” errors.

- `revoke_connection_permission(self, username: str, connection_id: str) -> None`
  - Same endpoint, `op: "remove"`; swallow 404 when the user/connection no
    longer exists.

No change to `create_connection` / `update_connection` signatures.

### 3.2 Thread the trainee’s Keycloak username through the launch flow

The service currently only receives `trainee_id` (local DB UUID). We need
`preferred_username` to key Guacamole permissions.

- In `backend/app/routers/LabDefinition/lab_instances.py`:
  - Pull `keycloak_username = userinfo.get("preferred_username")` in both
    `launch_lab_instance` and `refresh_instance_status`.
  - Raise 401 if missing.
  - Pass it to the service calls.

- In `backend/app/services/LabDefinition/lab_instance_service.py`:
  - Add `keycloak_username: str` parameter to `launch_instance` and
    `refresh_instance_status`.
  - Propagate it into `_sync_guacamole_connections(..., keycloak_username)`.
  - Alternative (no signature change): resolve it via
    `user_service.get_by_id(trainee_id).username`. Pick this if you want to
    keep callers untouched; document the assumption that the local
    `users.username` column mirrors Keycloak `preferred_username`.

### 3.3 Grant permissions during sync

Inside `_sync_guacamole_connections`, after a connection is either created
or updated:

1. `guacamole_service.ensure_user(keycloak_username)`.
2. `guacamole_service.grant_connection_permission(keycloak_username, conn_id)`.

Wrap both calls in a `try/except` that logs but does not abort the sync — a
permission failure must not prevent the VM from reaching `running`.

### 3.4 Cleanup on terminate

In `_delete_guacamole_connections`, before deleting each `conn_id`:

- `guacamole_service.revoke_connection_permission(keycloak_username, conn_id)`
  (best‑effort). Deleting the connection implicitly removes permissions in
  Guacamole’s schema, so this is mainly for hygiene on shared users.

No schema migration is required — `LabInstance.guacamole_connections`
already stores the map.

### 3.5 Do **not** change `/auth/guacamole-sso`

It already returns `X-Remote-User` from `preferred_username`. The same
endpoint serves both `TestGuacamolePage` and the new embedded iframe.

---

## 4. Nginx

No changes. The existing `location = /guacamole/api/tokens` + `/_auth_guacamole`
block already authenticates any iframe targeting `/guacamole/…`, regardless
of which React page embeds it.

---

## 5. Frontend changes

### 5.1 New page: `src/pages/LabInstance/run/RunLabPage.tsx`

Modelled on `PreviewGuidePage`. Route: `/lab-instances/:instanceId/run`.

- Use `useLabInstance` (`getInstance`, `refreshInstanceStatus`) exactly like
  the current `LabInstance/detail/index.tsx`.
- Poll `refreshInstanceStatus` every 10 s until `status === "running"` and
  `guacamole_connections` is non‑empty (the existing detail page already
  does something similar on a 30 s timer — reuse that logic).
- While provisioning, render the same waiting card used today
  (“Waiting for network…”).
- Once connections exist, render a `ResizableSplit`:
  - `left`: `GuidePanel` if the lab has a guide (fetch via `useLabGuides`
    with the lab’s `default_guide_id`), otherwise a small panel listing
    connection metadata (slug, protocol, IP, port) — same data shown on
    the current detail page, minus the “Open in new tab” button.
  - `right`: new `GuacamoleConsole` component (see 5.2).

### 5.2 New component: `src/components/LabInstance/run/GuacamoleConsole.tsx`

Direct port of `TestGuacamolePage`’s iframe, parameterised:

```tsx
interface Props {
  connectionId: string   // raw Guacamole connection identifier
  title?: string
}
```

Behaviour:

- Compute the Guacamole client identifier the same way Guacamole does:
  `btoa(<connId> + "\0" + "c" + "\0" + "postgresql")` (URL‑safe: replace
  `+/=` as Guacamole expects). The current detail page uses the raw id in
  `/guacamole/#/client/{connId}` — keep a single helper
  `buildGuacamoleClientUrl(connId)` in `src/lib/guacamole.ts` and reuse it
  in both the detail page and the embedded iframe.
- Render the header bar from `TestGuacamolePage` (user badge + “Reload
  connection” button driven by `iframeKey`).
- `<iframe src={url} key={iframeKey} allow="clipboard-read; clipboard-write" />`.

### 5.3 Connection switcher (multi‑protocol labs)

If `Object.keys(instance.guacamole_connections).length > 1`, render a tab
strip above the iframe (one tab per key, labelled by
`PROTOCOL_CONFIG[protocol]`). Clicking a tab sets
`activeConnectionId` and bumps `iframeKey` to force reload.

### 5.4 Wire up `Start Lab`

In `src/pages/LabDefinition/detail/index.tsx`, change `handleStartLab`
navigation target from `/lab-instances/${instance.id}` to
`/lab-instances/${instance.id}/run`. Leave the existing
`/lab-instances/:instanceId` detail page for
metadata/stop/terminate actions, and add a “Launch console” button there
that navigates to `/run`.

### 5.5 Router

Register the new route in `src/App.tsx` (or whichever file owns the
`<Routes>` tree for the authenticated layout), protected by the same role
guard used by the detail page.

### 5.6 Cookie timing

`useAuth` already sets the `access_token` cookie on `login` and on every
`performRefresh`. No new work here — the iframe will carry it on first
render. If the token is near expiry when the user lands on the run page,
call `performRefresh()` (exposed via `useAuth`) before mounting the iframe
so the cookie covers the initial `/guacamole/api/tokens` call.

---

## 6. Edge cases / failure modes

- **Username missing from token**: router raises 401; frontend should show
  the existing “Not Authenticated” card.
- **Permission grant fails but connection creation succeeds**: instance
  still transitions to `running`; iframe will render an empty Guacamole
  home. Surface a non‑blocking toast (“Connection created but not yet
  assigned, retry in a few seconds”) driven off a follow‑up
  `refreshInstanceStatus` call.
- **Guacamole header‑auth user not yet provisioned when grant runs**:
  `ensure_user` precreates; if the `PATCH` still 404s, retry once after a
  short sleep in `_sync_guacamole_connections`.
- **Multiple simultaneous instances of the same lab by one trainee**: the
  duplicate guard in `launch_instance` already prevents this.
- **Stale cookie inside iframe after token refresh**: the iframe will
  continue with the old session cookie issued by Guacamole; no action
  needed until that cookie expires, at which point Nginx re‑runs
  `auth_request` and picks up the refreshed `access_token` cookie.

---

## 7. Testing checklist

Backend (pytest):

- Unit: `guacamole_service.ensure_user` / `grant_connection_permission` /
  `revoke_connection_permission` against a mocked `requests` session
  (happy path, 404 user, 400 duplicate‑grant).
- Unit: `_sync_guacamole_connections` grants permission for every created
  and every updated connection, and tolerates grant failures.
- Integration (if a Guacamole container is available in CI): full
  launch → refresh → verify the user has READ via
  `GET /session/data/postgresql/users/{username}/permissions`.

Frontend:

- `RunLabPage` renders the waiting card while `status === "provisioning"`.
- Once `guacamole_connections` is populated, the iframe mounts with the
  correct `buildGuacamoleClientUrl(connId)`.
- Tab switch bumps `iframeKey` and changes `src`.
- Manual E2E: login as `testtrainee`, start a lab with one RDP slot,
  verify the Guacamole session loads inside the iframe without a login
  prompt.

---

## 8. Rollout order

1. Land `guacamole_service` additions (safe, additive).
2. Land service + router username propagation and permission grants
   (backwards compatible — existing external‑tab flow keeps working).
3. Add `buildGuacamoleClientUrl` helper and refactor the current detail
   page to use it.
4. Add `RunLabPage` + `GuacamoleConsole` and the `/run` route.
5. Flip the `Start Lab` navigation target.
6. Remove the external‑tab “Open … Session” buttons from the detail page
   once the embedded flow is verified (optional — can coexist).
