# Supabase Auth email templates

These files are the source of truth for Quoska's transactional Auth messages:

| Supabase template | Subject | Local file |
| --- | --- | --- |
| Confirm signup | `E-Mail-Adresse für Quoska bestätigen` | `supabase/templates/confirmation.html` |
| Invite user | `Deine Einladung zu Quoska` | `supabase/templates/invite.html` |
| Reset password | `Quoska-Passwort zurücksetzen` | `supabase/templates/recovery.html` |
| Change email address | `Neue E-Mail-Adresse für Quoska bestätigen` | `supabase/templates/email-change.html` |

The hosted project is configured in **Authentication → Email Templates**. The
four templates and subjects were applied through the Supabase Management API
and verified against these files by SHA-256 on 2026-08-11. The Supabase MCP
exposes database, logs, functions and documentation, but not hosted
Auth-template mutation; do not try to store these templates in SQL.

The links lead first to `/auth/confirm`, which does not consume the token on a
GET request. A real person must submit the confirmation button before
`verifyOtp()` runs. This reduces accidental consumption by mailbox link
scanners. The token is still single-use and subject to the hosted Auth OTP
expiry.

After changing a hosted template, test confirmation, invitation, recovery and
email change separately. Check that the visible sender is
`Quoska <no-reply@auth.quoska.de>`, that the link starts with
`https://quoska.de/auth/confirm`, and that a reused link fails safely.
