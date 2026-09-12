# Feedback and support

The authenticated app has a permanent **Hilfe & Feedback** link in the sidebar,
the mobile **Mehr** menu and settings. All employee roles can send feedback,
bug reports and feature requests. Attachments go through the adjacent email link.

An invitation is offered after visits on three distinct German calendar dates.
Only a capped counter, the last visit date and the handled timestamp are stored.
The popup waits 30 seconds on Cockpit or Stempeln and waits while another dialog
or text field is active. A database claim marks it handled before rendering, so
closing it, reloading or switching devices cannot trigger another invitation.
Opening the permanent form also suppresses future invitations. The counter does
not depend on optional product analytics and contains no interaction history.

Apply migration `035_feedback.sql` before deploying the UI. Submission identity
and reply address come from the authenticated account, never the request body.
Messages are limited to 4,000 characters and five submissions per 24 hours per
account. A stable request ID prevents duplicates on retries; a database lock
enforces the limit across simultaneous requests. RLS permits users to read only
their own messages; ordinary company administrators cannot read team feedback.

Messages are stored before acknowledging receipt. The existing operator allowlist
(`ANALYTICS_ADMIN_EMAILS`) grants access to the latest 50 messages at `/app/help`.
Messages are also sent to `FEEDBACK_TO_EMAIL` using the `FEEDBACK_SMTP_*` settings
in `.env.example`. The sender must be a mailbox/domain authorized by that SMTP
server; the verified account address is used as Reply-To. Credentials are runtime
secrets. Use TLS or STARTTLS for production; `none` is for an isolated mail catcher.

Each submission has at most one SMTP attempt. Errors and interrupted delivery
remain visible in the operator inbox and must be checked against the mailbox
before any manual resend. The stable Message-ID is `feedback-<id>@<sender-domain>`.
Delivery logs contain only the feedback ID. Missing SMTP settings preserve the
message in the inbox and show that email delivery needs review. Success in the
form acknowledges durable receipt, not a claim about inbox delivery or reading.

App-generated mail uses `Auto-Submitted: auto-generated` to prevent auto-reply
loops. Feedback and feature requests are for operator review, not instructions
authorizing automatic customer-account changes or new feature releases.

User/employee/tenant deletion cascades to submitted feedback. The prompt state is
deleted with the authentication account. The personal data export includes the
user's own feedback, with spreadsheet formulas treated as plain text.
Local preview and E2E configurations use
an isolated mail catcher and must not reuse production mail credentials.

SMTP implementation reference: [Nodemailer SMTP transport](https://nodemailer.com/smtp)
and [message configuration](https://nodemailer.com/message).
