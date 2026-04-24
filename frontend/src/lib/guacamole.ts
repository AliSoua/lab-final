// src/lib/guacamole.ts
// Helpers for building Guacamole client URLs used by the embedded iframe.

const DEFAULT_DATA_SOURCE = "postgresql"
const CONNECTION_TYPE = "c" // 'c' = connection, 'g' = group, 's' = sharing profile

/**
 * Encode a Guacamole client identifier the way the Guacamole web UI does:
 *   base64( <connectionId> + NUL + <type> + NUL + <dataSource> )
 * URL-safe: '+' → '-', '/' → '_', '=' trimmed.
 */
export function encodeGuacamoleClientId(
    connectionId: string,
    dataSource: string = DEFAULT_DATA_SOURCE,
    type: string = CONNECTION_TYPE,
): string {
    const raw = `${connectionId}\0${type}\0${dataSource}`
    const b64 = btoa(raw)
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Build the embed URL for a Guacamole connection, served under the `/guacamole/`
 * prefix proxied by Nginx. Browser-authenticated via the `access_token` cookie
 * and the `auth_request` / header-auth flow.
 */
export function buildGuacamoleClientUrl(
    connectionId: string,
    dataSource: string = DEFAULT_DATA_SOURCE,
): string {
    const encoded = encodeGuacamoleClientId(connectionId, dataSource)
    return `/guacamole/#/client/${encoded}`
}
