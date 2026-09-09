# Operator product overview

The allowlisted operator can open `/app/product-analytics` or download the same
report at `/api/v1/product-analytics`. Customer administrators cannot access
cross-company data. Access uses the existing `ANALYTICS_ADMIN_EMAILS` allowlist
and requires `ANALYTICS_HASH_SECRET`. In self-hosted installations it is disabled
until both are configured.

Set `PRODUCT_ANALYTICS_EXCLUDED_TENANTS` to exact internal company names separated
by `|`. No default exclusions or production company names ship in the repository.

## Definitions

- Usable accounts are confirmed, unblocked Auth users with active employee profiles.
  Invitations, blocked users and accounts without a company are separate counts.
- Registration progress uses Auth/database records, including signups without a
  marketing CTA. Each company's earliest administrator identifies its founder;
  unlinked registrations are included, invited employees are excluded. Account
  and company totals are different units, not an anonymous website conversion rate.
- First activation means at least one retained time entry, including an import.
- Entry activity uses creation dates in Europe/Berlin, not backdated work dates.
  Imports, manual entries and live clock entries are separate.
- Active companies include new profiles/projects, created entries, successful
  measured actions and observed app opens. This measures product adoption, not
  employee attendance or productivity.
- Return in the following week uses the complete next Monday–Sunday period for
  each registration cohort. Young cohorts stay unscored until that week ends.
- Browser presence is optional and deduplicated to one company/day. It starts
  with this release. Historical activity only includes reconstructable changes;
  reports never invent past sessions or treat `last_sign_in_at` as daily activity.
- A non-free plan is a tariff state, not proof that an invoice was paid.
- Open running/paused entries older than 24 hours appear as operator issues and
  as a notice in the affected user's clock screen. No time data is auto-corrected.

## Diagnostics

Fixed server action/outcome counters cover clock start/stop/pause/resume,
extension clock actions, invitations, import previews/commits and setup. Import
row validation errors count even if a preview returned HTTP 200. Access denial,
conflicts, validation and server failures remain distinct. Expected rejection is
not classified as an application crash. Browser login/signup reports are
explicitly unverified signals with body-size, origin and rate limits.

Action counters contain only the Berlin day, fixed category, count and an HMAC
company pseudonym. They never store employee identifiers, request/response
bodies, passwords, CSV contents or free-form error text. The request context gets
its tenant from the existing authentication and is isolated across concurrent
requests. Telemetry performs no additional network authentication and a storage
failure cannot change the business response. Diagnostic failures emit the fixed
`product_observation_unavailable` marker in server logs.

The existing analytics SQLite database stores diagnostic counters, daily
aggregate snapshots and optional aggregate operational status. Existing retention
removes diagnostics and snapshots after 180 days; the existing SQLite backup
includes these tables. Operational data older than two hours is labelled stale.
A missing product source makes report generation fail instead of showing zeros.

## Scheduled reporting

Install `deploy/quoska-product-analytics.service` and `.timer`, update the deployed
`run-cron.sh`, and enable the timer. It invokes the existing CRON_SECRET-protected
endpoint at 23:50 Europe/Berlin and saves a daily snapshot. The overview compares
the last two complete weeks and shows the current incomplete week separately.
The endpoint returns only status/date, never company data, in cron logs.

Optional host monitoring can publish `{label,value}` strings into
`product_operations(id=1,at,data)`; this must contain aggregate operational facts
only. Private mail tooling and configuration are intentionally separate.
