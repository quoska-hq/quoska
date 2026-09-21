# Self-service activation

Apply migration `036_self_service_activation.sql` before running this version.
It adds optional company intent, the first non-empty report-generation timestamp
and a per-employee dismissal timestamp. Existing rows start with null values.
The regular backup already includes all columns of tenants and employees.

Administrators can optionally choose an intended team size during setup or in
the dashboard start guide. The setting is separate from actual account counts
and does not alter billing. It can be cleared. The guide uses saved company
data for invitations, completed non-import entries and generated reports;
imports are an optional separate step. Dismissal affects only the current
administrator and can be reversed with “Starthilfe anzeigen”. Fresh role reads
protect the new settings endpoints, and request bodies cannot choose a tenant.

The operator-only product overview now separates these company milestones:

- A further invited profile is confirmed, active and not banned.
- At least one non-import entry is completed with a clock-out timestamp.
- A further completed non-import entry was created on day 8–14 after the first
  completed entry's creation day. Evaluate only after this full window ends.
  Calendar days use Europe/Berlin; historical work dates do not imply presence.
- A non-empty CSV report or DATEV LODAS export was successfully generated since this release. This
  does not prove download, monthly completeness or handoff to payroll.
- Stripe returned a checkout URL to an authenticated administrator. This is
  an action count in the existing retained diagnostics, not proof of payment.
- A signature-verified `invoice.paid` webhook has been processed, with `status`
  paid, a positive integer `amount_paid`, `livemode` true and a customer linked
  to a company. Test mode, trials, zero invoices, plan status and browser return
  parameters do not qualify. Each company counts once. This is historical first
  payment evidence, not MRR, net revenue or a currently paying subscriber count.
  Later refunds/cancellations do not remove the historical milestone.

These milestones may occur in different orders. Do not divide adjacent counts
as if they were a strict funnel. Company data is historical; newer diagnostics
have a measurement start and retention limit. Missing evidence is not proof
that an action never happened. The daily snapshot saves the aggregate activation
and team-size distribution alongside the existing counts.

The production webhook endpoint must subscribe to **invoice.paid** as well as
the existing checkout/subscription events before payment evidence is complete.
No Stripe endpoint, live key or production setting is modified by this change.
Invoices are derived from the existing durable webhook log, so duplicate
deliveries and repeated report reads cannot inflate company counts.

Optional browser signals record a visible billing offer and an explicit return
from checkout cancellation, at most once per company/day/action. DNT/GPC is
respected. These signals cannot create a checkout or mark a payment and never
represent all checkout abandonments. Server failures remain separate from
input rejection. Invitation responses include a fixed plan-limit diagnostic.
No form values, session recordings or additional employee detail are collected
by these browser signals.

Validation covers payment evidence, return-window boundaries, import separation,
internal-company exclusion, current-role authorization, forged identity,
optional-answer persistence, failed saves, mobile layout, dismissal/restoration,
non-empty export progress and operator-only reporting. Local preview/testing
must use local Supabase and mail capture with all Stripe keys blank; checkout
responses are mocked in route tests without making a payment-provider request.
