# Auth implementation — proposed changes

Scope: fixes to authentication plumbing across backend and frontend.
Out of scope: `KEYCLOAK_CLIENT_SECRET` rotation (handled at runtime in prod).

---

## 2. `backend/app/config/connection/keycloak_client.py`

### 2.1 Remove the broken module-level `property`
- **Current:** `keycloak_openid = property(get_keycloak_openid)` at the bottom of the file.
- **Problem:** `property` only works as a class descriptor. At module level it produces an uncallable `property` object; the comment (`Use as: keycloak_openid.fget()`) confirms it is unusable. No caller uses it — every consumer already calls `get_keycloak_openid()`.
- **Change:** delete the line (and the now-useless comment above it). Keep `get_keycloak_openid()` / `get_keycloak_admin()` as the only public accessors.

### 2.2 Warn early when the client secret is missing
- **Current:** `_initialize_clients()` validates `KEYCLOAK_SERVER`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, but not `KEYCLOAK_CLIENT_SECRET`. If the Keycloak client is *confidential*, the error only surfaces on the first `.token()` call as an opaque `invalid_client`.
- **Change:** after the existing `missing` check, log a `logger.warning("KEYCLOAK_CLIENT_SECRET not set — confidential client calls will fail")` when it is `None`/empty. Do **not** raise (public clients are still valid) — just make the misconfiguration observable.

### 2.3 (Optional) Thread-safety of the singleton
- `__new__` is not locked. Under uvicorn's per-process workers it is fine; document this assumption in a one-line docstring on the class so nobody switches to threaded workers without noticing.

---

## 3. `backend/app/dependencies/keycloak/keycloak_roles.py`

### 3.1 Normalize the issuer string
- **Current:** `issuer=f"{KEYCLOAK_SERVER}/realms/{KEYCLOAK_REALM}"` (no `.rstrip('/')`), while `get_jwks_client()` does strip the trailing slash. A `.env` with a trailing `/` breaks every token with `InvalidIssuerError`.
- **Change:** compute once at module load: `ISSUER = f"{KEYCLOAK_SERVER.rstrip('/')}/realms/{KEYCLOAK_REALM}"` and reuse in both functions (and in `get_jwks_client` for the JWKS URL).

### 3.2 Fix/parametrize audience validation
- **Current:** `audience="account"` hardcoded. This only accidentally validates when the token carries the `account` client role. A backend resource server should validate against its own client id.
- **Change:**
  1. Read `KEYCLOAK_AUDIENCE` from env, default to `KEYCLOAK_CLIENT_ID` (i.e. `lab-backend`).
  2. Pass it to `pyjwt.decode(..., audience=KEYCLOAK_AUDIENCE)`.
  3. Additionally assert `payload.get("azp") == KEYCLOAK_CLIENT_ID` to reject tokens issued to other clients.
  4. Operational note: add an *Audience* mapper to the `lab-backend` client in Keycloak so the `aud` claim contains `lab-backend`.

### 3.3 Add leeway and required claims
- **Current:** `pyjwt.decode(...)` with defaults only.
- **Change:** pass `leeway=30` (seconds) and `options={"require": ["exp", "iat", "iss", "sub", "aud"]}` to enforce the presence of critical claims and tolerate small clock drift between backend and Keycloak.

### 3.4 Stop leaking exception details
- **Current:** both role checkers end with `detail=f"Token validation failed: {str(e)}"`.
- **Change:** log `e` at `logger.error` with stack context, return a generic `detail="Invalid token"`. No raw JWT/JWKS error strings should reach the client.

### 3.5 Unify return shape and clean dead code
- **Current inconsistencies:** `require_role` returns `resource_access` but no `roles`; `require_any_role` returns `roles` but no `resource_access`. Unused imports: `requests`, `KeycloakInvalidTokenError`. Dead branch: `except KeycloakConnectionError` (never raised by `PyJWKClient`).
- **Change:** extract a private helper `_decode_and_extract(token) -> dict` that both public dependencies call. It returns a single canonical dict: `sub, preferred_username, email, given_name, family_name, name, realm_access, resource_access, roles`. Remove the unused imports and the dead exception branch. If you want to distinguish JWKS-fetch failures, catch `jwt.PyJWKClientError` and return HTTP 503.

### 3.6 (Optional) Token-type assertion
- Add `if payload.get("typ") != "Bearer": raise InvalidTokenError(...)` to block ID tokens being replayed as access tokens.

---

## 4. `frontend/src/hooks/useAuth.tsx`

### 4.1 Fix the base64url decoder
- **Current:** `atob(padded)` with no `-`/`_` translation. Any JWT whose payload base64url contains `-` or `_` throws `InvalidCharacterError`, the `catch` swallows it, `extractRoles` returns `[]`, and the user silently falls back to `"trainee"`.
- **Change:** replace `atob(padded)` with:
  ```
  const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(escape(atob(b64))));
  ```
  Keep the `try/catch` but also `console.warn` on failure so the bug is visible.

### 4.2 Schedule refresh from `expires_in`
- **Current:** `TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000` regardless of realm policy; also `TOKEN_REFRESH_RETRY_DELAY` is declared and never used.
- **Change:** after every successful login/refresh, schedule the next refresh at `Math.max((expires_in - 60), 30) * 1000` using `setTimeout` instead of a fixed `setInterval`. Remove the unused `TOKEN_REFRESH_RETRY_DELAY` constant.

### 4.3 Derive `isAuthenticated` from `user`
- **Current:** `isAuthenticated` is a separate `useState` that can drift out of sync with `user`.
- **Change:** remove the state and expose `const isAuthenticated = !!user;` in the context value. One source of truth.

### 4.4 Resolve `logout`-before-`startTokenRefresh` ordering
- **Current:** `startTokenRefresh` references `logout` (declared later as `const`) and does not list it in its `useCallback` deps, so the interval closes over a stale reference and ESLint flags a TDZ/no-use-before-define hazard.
- **Change:** declare `logout` before `startTokenRefresh`, or factor the "max-retries → hard logout" logic into a small `forceLogout` callback defined first. Add it to the dep array.

### 4.5 Drop the eager refresh right after login
- **Current:** `startTokenRefresh()` calls `performRefresh()` immediately, causing an unnecessary token call right after login.
- **Change:** only schedule the next refresh; do not call `performRefresh()` inline.

### 4.6 Surface login errors
- **Current:** `if (!response.ok) return false;` in `login` throws away the backend's error detail.
- **Change:** on non-ok, `await response.json().catch(() => ({}))`, then either `throw new Error(detail || "Login failed")` or return a discriminated result (`{ ok: false, reason }`). The login UI can then distinguish 401 (bad creds) from 503 (Keycloak down).

### 4.7 Guard logout vs. in-flight refresh
- **Current:** if `performRefresh` resolves after `logout`, it rewrites `localStorage` and the cookie.
- **Change:** set a `loggedOutRef.current = true` at the top of `logout`, and have `performRefresh` bail out (`return false`) when that flag is set just before writing storage. Reset the flag on successful login.

### 4.8 Centralized 401 → refresh-and-retry (optional)
- Export an `authFetch(input, init)` helper from this hook (or a sibling module) that: attaches `Authorization`, on 401 calls `/auth/refresh` once, and replays the request. Replaces ad-hoc refresh loops across the app.

---

## 5. (Optional, larger) Move token storage to HttpOnly cookies

Goal: eliminate XSS exposure of tokens currently held in `localStorage` and in a JS-set cookie.

### 5.1 Backend changes (`backend/app/routers/auth/routes.py`)
- On `/auth/login` and `/auth/refresh`, after obtaining the Keycloak token, set two cookies on the `Response`:
  - `access_token` — `HttpOnly; Secure; SameSite=None; Path=/; Max-Age=expires_in` (SameSite=None is needed for the Guacamole iframe; requires HTTPS).
  - `refresh_token` — `HttpOnly; Secure; SameSite=Strict; Path=/auth; Max-Age=refresh_expires_in` (narrower path so it's only sent to auth routes).
- Keep returning the token JSON as today for backward compatibility during the transition, then remove it from the response body once the frontend is migrated.
- On `/auth/logout`, clear both cookies via `response.delete_cookie(...)`.
- Add CSRF protection for cookie-authenticated state-changing routes (double-submit token or `Origin`/`Referer` check) since cookies are sent automatically.

### 5.2 Frontend changes (`useAuth.tsx` + fetch layer)
- Stop writing `access_token` / `refresh_token` to `localStorage` and stop calling `setAccessTokenCookie` from JS.
- Switch all backend calls to `fetch(url, { credentials: "include", ... })`; drop the `Authorization: Bearer` header for same-origin calls (the cookie is enough).
- `checkAuth` becomes a simple `GET /auth/check` with credentials; no token reading in JS at all.
- Role extraction for UI: either (a) have `/auth/check` return `roles` explicitly (preferred) or (b) expose a read-only `GET /auth/me` that returns the same shape the JWT carried.
- `logout` becomes a single `POST /auth/logout` with `credentials: "include"`; no body needed.

### 5.3 nginx (`frontend/nginx/default.conf`)
- Ensure the reverse proxy forwards cookies and the `Host`/`Origin`/`X-Forwarded-Proto` headers so `Secure` cookies work behind TLS termination.
- For the Guacamole iframe path, confirm `SameSite=None` cookies are actually sent; otherwise use a same-site proxy path (e.g. `/guac/`) so `SameSite=Strict` remains viable.

### 5.4 Migration order
1. Ship backend cookie-setting *in addition to* the JSON body (no breaking change).
2. Migrate the frontend to cookies + `credentials: "include"`.
3. Remove the token JSON from the login/refresh response bodies.
4. Remove the JS cookie helpers and `localStorage` usage from `useAuth.tsx`.
