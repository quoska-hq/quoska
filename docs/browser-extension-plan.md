# Quoska Browser Extension — Product Requirements and Implementation Plan

**Owner:** Quoska
**Status:** V1 implemented; manual browser acceptance and store release pending
**Last updated:** 2026-08-19
**Target browsers:** Google Chrome first; Microsoft Edge-compatible through Manifest V3

## 1. Product goal

Make compliant time tracking available where employees already work, without
requiring them to keep the Quoska web application open and without monitoring
their browsing activity.

The extension should reduce missed clock-ins and clock-outs, shorten the common
clocking flow to one click, and create a new discoverability surface in the
Chrome Web Store. It must preserve Quoska's existing server-generated timestamps,
tenant isolation, audit trail, and German privacy positioning.

## 2. Competitive baseline

Jibble's current browser extension establishes the expected category baseline:

- toolbar popup for clock in/out;
- live state and timer visible in the browser;
- project, activity, client, and note selection;
- configurable keyboard shortcut;
- right-click actions and selected text as a note;
- injected timer buttons in common work tools;
- synchronization with the main web/mobile product;
- quick links to reports and account pages.

Quoska already has the underlying clock in/out, pause/resume, project, note,
report, notification, and cross-device server state. The missing capability is a
browser-native surface and, later, opt-in workflow integrations.

## 3. Product principles

1. **Server time remains authoritative.** The extension never supplies a clock-in,
   clock-out, pause, or resume timestamp.
2. **No employee surveillance.** No browsing history, visited-page logging,
   automatic activity detection, screenshots, or background productivity scoring.
3. **Least privilege.** Version 1 only receives access to the configured Quoska
   origin. Website integrations request optional host permissions individually.
4. **Explicit connection.** The user signs in on Quoska, sees an approval screen,
   and grants a narrow, revocable extension token. The extension never receives a
   password or Supabase session cookie.
5. **German-first UX.** All user-facing extension and approval text is German.
6. **Open source.** Extension source and its permission rationale live in this
   repository.
7. **No misleading offline mode.** If Quoska cannot be reached, clock actions fail
   visibly; they are not queued with client timestamps.

## 4. Users and jobs to be done

### Employee

- See immediately whether I am clocked in, paused, or clocked out.
- Clock in with an assigned project and optional note.
- Start/end a break and clock out without changing tabs.
- Open my times if I need to inspect or correct an entry.
- Trust that the extension is not observing unrelated browser activity.

### Administrator or owner

- Let employees use the extension without distributing credentials or permanent
  API keys.
- Revoke a connected extension without deleting the employee account.
- Retain the same audit and compliance behavior as clocking in the web app.

### Quoska

- Gain a legitimate Chrome Web Store presence and a browser-extension landing
  page after publication.
- Differentiate on privacy, transparent permissions, German UX, auditability, and
  server-side timestamps.

## 5. Version 1 requirements

### 5.1 Connection and authentication

- The popup offers **Mit Quoska verbinden** when no token exists.
- Connection opens a Quoska-hosted approval page through
  `chrome.identity.launchWebAuthFlow`.
- The background service worker owns the complete approval, token exchange, and
  local persistence flow so closing the transient toolbar popup cannot interrupt
  a connection.
- The flow uses an unpredictable state value and PKCE SHA-256 challenge.
- Authorization codes are single-use and expire after five minutes.
- Access tokens are random, stored only as SHA-256 hashes on the server, expire
  after 90 days, and can be revoked.
- Tokens are limited to the clock extension API. They are not Supabase JWTs and
  cannot access arbitrary application APIs.
- Logging out/disconnecting revokes the current token server-side and clears it
  from `chrome.storage.local`.
- If local credential persistence fails after token exchange, the newly issued
  server token is immediately revoked so the web app never reports a completed
  connection that the extension cannot use.
- A 401 response clears the local token and returns the popup to its disconnected
  state.
- The in-app connection list distinguishes an issued-but-never-used authorization
  from a connection confirmed by the extension's first authenticated status call.

### 5.2 Popup

- Show employee name and current state: **Ausgestempelt**, **Arbeitszeit läuft**,
  or **Pause läuft**.
- Show a live elapsed duration based on the server timestamp and server/client
  clock offset. The display is informational only.
- Show a live daily progress bar using today’s net tracked time and the
  employee’s configured target for the current weekday; cap the visual fill at
  100% while continuing to display the full recorded duration.
- Support clock in, clock out, pause, and resume.
- Allow an assigned project and an optional note of at most 500 characters when
  clocking in.
- Show clear loading, connection, authentication, and service errors in German.
- Include links to **Meine Zeiten** and the Quoska dashboard.
- Use Quoska's visual language and work at a compact 360 px popup width.

### 5.3 Browser behavior

- The toolbar keeps the original white, theme-safe logo treatment, scales the
  rabbit for legibility at toolbar size, and uses no Chrome text badge:
  - a tiny green corner dot for running;
  - a tiny amber corner dot for paused;
  - no dot for clocked out or disconnected;
  - a tiny red corner dot for a connection error.
- Refresh status when the browser starts, when the extension is installed, after
  each clock action, and periodically while connected.
- Provide a configurable shortcut that opens the extension popup. It must not
  clock users in or out without showing the current state.

### 5.4 API

- `POST /api/v1/browser-extension/authorize` creates a short-lived code after a
  signed-in user explicitly approves the connection.
- `POST /api/v1/browser-extension/token` exchanges code + PKCE verifier for a
  token.
- `DELETE /api/v1/browser-extension/token` revokes the active bearer token.
- `GET /api/v1/browser-extension/connections` lists active connections for the
  current employee, or the whole tenant for administrators.
- `DELETE /api/v1/browser-extension/connections/:id` lets an employee revoke an
  own connection and an administrator revoke a tenant connection.
- `GET /api/v1/browser-extension/status` returns only the employee name, current
  entry/break, server time, and assigned projects needed by the popup.
- `POST /api/v1/browser-extension/clock` accepts one of `clock-in`, `clock-out`,
  `pause`, or `resume`, then returns the refreshed status.
- Every route validates input, uses generic client errors, and never logs secrets.
- Bearer-token lookups additionally verify that the employee is active and still
  belongs to the token's tenant and user.

## 6. Security, privacy, and compliance requirements

- Manifest V3 only; no remotely hosted executable code.
- Required permissions in V1: `identity`, `storage`, and `alarms`.
- Required host permission in production: `https://quoska.de/*` only.
- No `tabs`, `history`, `idle`, `scripting`, or all-sites (`https://*/*`)
  permission in V1.
- Extension secrets use at least 256 bits of cryptographic randomness.
- Token and authorization-code plaintext must never be stored in the database.
- Connection redirect URIs are restricted to the exact Chromium identity callback
  shape: `https://<32-character-extension-id>.chromiumapp.org/connected`.
- Production additionally accepts only extension IDs explicitly configured in
  `BROWSER_EXTENSION_IDS`; development accepts valid unpacked-extension IDs.
- OAuth `state`, redirect URI, and PKCE verifier must all be verified before a
  token is issued.
- Authorization mutations require a valid Quoska browser session and a
  same-origin form submission.
- All clock mutations continue through the existing Quoska services, including
  ownership checks, project assignment, audit records, automatic break handling,
  and §4 ArbZG minimum-break behavior.
- Tokens are tenant- and employee-scoped, have an expiry, `last_used_at`, and
  revocation timestamp.
- Store listing and privacy policy must explain every permission and explicitly
  state that unrelated browsing data is neither read nor stored.

## 7. Out of scope for Version 1

- Activity/client taxonomy separate from Quoska projects.
- Automatic offline clock-event synchronization.
- Reading browser history or measuring active-tab time.
- Injected timer buttons on third-party websites.
- Selected-text notes and context-menu clock actions.
- Mobile browser support.
- Employer-controlled silent installation.

## 8. Follow-up phases

### Version 1.1 — browser ergonomics

- Right-click menu for clock in/out and pause/resume.
- **Auswahl als Notiz verwenden** for explicitly selected page text.
- Optional browser notification/reminder settings.
- A settings page showing connection, API origin, version, privacy link, and
  token revocation.
- Connected-device management inside Quoska settings.

### Version 2 — opt-in workflow integrations

Prioritize from real customer interviews and extension analytics that contain no
page contents. Likely first candidates are Google Calendar and one task tracker
(Jira, Asana, or ClickUp).

Each integration must:

- be disabled by default;
- request its website permission only when enabled;
- add a visible, user-triggered timer button;
- read only the item title/identifier required to prefill a note;
- document exactly what is read and sent;
- continue to work as a normal popup if permission is declined.

### Version 3 — distribution and growth

- Publish to the Chrome Web Store and validate Microsoft Edge packaging.
- Add a real `/browser-extension` landing page with installation link,
  screenshots, privacy explanation, FAQ, and structured data.
- Add an in-product extension prompt only after the store listing is live.
- Track privacy-safe funnel events: landing-page visit, store-link click, connect
  success, and coarse error category. Never track visited sites or note contents.

## 9. Technical architecture

```text
Extension popup/background
        │  Bearer token (clock-extension scope)
        ▼
/api/v1/browser-extension/*
        │  validated tenant + employee context
        ▼
Existing clock / break / project services
        │
        ▼
Supabase tables + existing audit trail

Connection:
extension ──PKCE challenge──▶ Quoska approval page
extension ◀──one-time code── Chromium identity callback
extension ──code+verifier──▶ token endpoint ──▶ revocable token
```

The extension is plain HTML/CSS/JavaScript so the unpacked package has no runtime
dependency tree and no remote code. A small build script injects either the
production origin or `http://localhost:3000` and generates the matching single
host permission.

## 10. Delivery plan

### Milestone A — secure foundation

- [x] Product and technical specification.
- [x] Database migration for hashed authorization codes and tokens.
- [x] Redirect, state, PKCE, hashing, expiry, and bearer-auth services.
- [x] Approval page and authorization/token endpoints.
- [x] Focused security tests.

### Milestone B — usable Version 1

- [x] Status and clock endpoints backed by existing services.
- [x] Manifest V3 package, build script, popup, badge, refresh alarm, and shortcut.
- [x] Production and local-development builds.
- [x] Manual unpacked-extension test instructions.
- [x] Lint, typecheck, unit tests, production build, and clock-flow regression.
- [x] End-to-end approval/token/clock pass against a migrated local Supabase stack.

### Milestone C — release readiness

- [x] In-app connected-device list and revoke controls.
- [x] Threat-model review and application privacy-policy disclosure update.
- [ ] Accessibility and keyboard-only review.
- [ ] Chrome and Edge acceptance testing with employee/admin accounts.
- [ ] Store icon, screenshots, short/long descriptions, and reviewer notes.
- [ ] Chrome Web Store developer account, submission, and review.

## 11. Version 1 acceptance criteria

1. A signed-in user can approve and connect an unpacked extension without giving
   the extension a password or copying an API key.
2. A disconnected or expired token cannot read status or mutate time entries.
3. A connected employee sees the same running/paused/off state as the web app.
4. Clock in/out and pause/resume update both surfaces using server timestamps.
5. Only assigned, active projects are offered and accepted.
6. Network failures never create a locally timestamped or queued clock event.
7. Disconnect revokes the server token, and reusing it returns 401.
8. Production manifest requests access only to `https://quoska.de/*` plus the
   three declared browser permissions.
9. The extension contains no third-party scripts or analytics SDK.
10. Existing compliance, unit, type, lint, build, and relevant E2E checks pass.

## 12. Release metrics

Measure only product-level, content-free events after a consent and analytics
review:

- store listing impressions and installs (store-provided aggregates);
- connection completion rate;
- weekly connected users;
- clock action success/error rate by coarse error code;
- 7-day and 30-day extension retention;
- support reports involving authentication or state synchronization.

Success means more reliably recorded workdays and repeated extension use, not
more browsing data collected.
