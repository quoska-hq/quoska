# Browser Extension Threat Model

**Status:** reviewed for Version 1
**Last reviewed:** 2026-08-19
**Scope:** extension source, connection flow, extension APIs, and token management

## Assets

- employee clock and pause state;
- assigned project names and IDs;
- optional employee-entered clock-in notes;
- authority to clock in/out and pause/resume for one employee;
- tenant and employee identifiers;
- browser-extension access token.

Passwords, Supabase session cookies, other employees' time entries, reports,
settings, absence data, and browsing activity are explicitly outside the token's
authority.

## Trust boundaries

```text
Quoska browser session ── consent ──▶ one-time authorization code
        │                                      │
        │                                      ▼
        │                           extension local storage
        │                                      │ bearer token
        ▼                                      ▼
Supabase auth/RLS                         extension-only APIs
                                                │ fixed tenant/employee
                                                ▼
                                    existing clock/break services
```

The application session approves a connection, but is never copied into the
extension. Extension APIs use an opaque credential that the normal Quoska APIs
do not accept.

## Threats and controls

### Authorization-code interception

- 256-bit random codes expire after five minutes.
- Codes are stored only as SHA-256 hashes.
- Codes are single-use through an atomic database function.
- PKCE SHA-256 binds the code to the initiating extension instance.
- OAuth state is generated and verified by the extension.
- The redirect URI must be an exact Chromium identity callback.

### Malicious extension impersonation

- Production rejects callbacks unless the 32-character extension ID appears in
  `BROWSER_EXTENSION_IDS`.
- Development accepts valid unpacked-extension IDs so localhost testing remains
  possible.
- The approval screen describes the exact requested authority.

### Token theft or database disclosure

- Access tokens contain 256 random bits and use a recognizable `qbe_` prefix.
- Only SHA-256 token hashes are stored server-side.
- Tokens expire after 90 days and have explicit revocation timestamps.
- The settings page lets employees revoke their own connections and tenant
  administrators revoke any tenant connection.
- Authentication rechecks that the employee is active and still belongs to the
  token's user and tenant on every request.

The plaintext token remains in `chrome.storage.local`; compromise of the browser
profile or extension execution context can expose it. The limited scope,
expiration, employee validation, and remote revocation reduce that residual risk.

### Cross-tenant access

- Token rows bind user, tenant, and employee IDs.
- Every clock/project query receives the bound tenant and employee explicitly.
- Assigned project IDs are revalidated on clock-in.
- Account-side connection listing and revocation are tenant-filtered; non-admins
  receive an additional employee filter.
- Credential tables have RLS enabled with no end-user policies and are accessible
  only through service-role server code.

### CSRF and open redirects

- Authorization requires an authenticated session and same-origin POST.
- Callback URLs accept only HTTPS `chromiumapp.org` URLs with a valid extension
  ID and the exact `/connected` path.
- Login and OAuth continuation paths accept only same-origin relative paths.

### Client clock manipulation and offline replay

- Extension actions never contain an event timestamp.
- Existing clock and break services generate authoritative timestamps server-side.
- Failed network actions are shown immediately and are never queued for replay.

### Excessive browser access

Version 1 permissions are limited to `identity`, `storage`, and `alarms`, with one
Quoska host permission selected at build time. It requests no access to tabs,
history, page scripting, idle state, location, or all HTTPS sites. It contains no
remote scripts or analytics SDK.

Future website integrations must be opt-in and request optional per-site host
permissions. Any such change requires a new threat-model and privacy review.

## Abuse and operational controls

- Concurrent active entries are rejected by the existing clock service.
- Paused entries cannot be clocked out without resuming.
- Break duration rules and audit records are identical to web-app actions.
- Unknown, expired, revoked, malformed, or wrong-scope tokens return 401.
- Token endpoints return `Cache-Control: no-store` where credentials or state are
  returned.
- Logs must not contain authorization codes, access tokens, or note contents.

## Residual risks and release requirements

- A compromised browser profile can use its still-valid employee clock token
  until it is revoked or expires.
- A user can intentionally clock inaccurately; the extension does not change the
  existing organizational and audit controls around truthful recording.
- Browser-store distribution metadata is handled by the respective browser-store
  operator and must be covered in the final store disclosure.
- Chrome and Edge UI/keyboard behavior require a manual acceptance pass before
  store submission.
- Store signing and the final production extension ID must be completed before
  production authorization is enabled.
