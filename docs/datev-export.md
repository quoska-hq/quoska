# DATEV LODAS hours export

Status: free beta for all plans, including Free. A real DATEV test import is
still required; no certification is claimed. No DATEV registration, API subscription or transmission occurs.

Administrators open **Berichte → DATEV**, choose a date in the reporting month,
and save their payroll office's advisor/client numbers. Each person with entries
must explicitly be included with a LODAS personnel number and wage type or
excluded. Wage types are never guessed. Previously deactivated people remain
available when reviewing historical time records.

The first format is **LODAS standard movement data, processing key 01 (hours)**.
It is not a Lohn und Gehalt format or a financial-accounting EXTF export. It
contains one row per included person/month/wage type, without names or notes.
Only recorded net work is included. Imported time is included with a warning.
Paid absence, holiday pay, supplements, overtime payout, salary calculations,
cost centres and retroactive payroll adjustments are outside this version.
Do not use it as an additional wage payment for salaried staff without agreeing
the wage-type mapping with the payroll office.

## Format and primary references

- [DATEV LODAS interface manual, 94th edition, June 2026](https://help-center.apps.datev.de/api/amr/knowledge-common/v1/entities/st81064830359671307_de.pdf),
  sections 2 (file/record structure), 3 (sample movement records), and 4
  (`u_lod_bwd_buchung_standard`).
- [DATEV staff explanation of a standard movement record](https://www.datev-community.de/t5/Personalwirtschaft/ASCII-Bewegungsdaten-aus-Drittanbieter-Software-nach-LODAS/m-p/408631).
- [DATEV payroll interfaces](https://www.datev.de/web/de/unternehmen/loesungen/lohn-und-personal/lohn-und-gehaltsabrechnung/schnittstellen).

Checked on 19.09.2026. General section includes `Ziel=LODAS`, `BeraterNr`,
`MandantenNr`, and explicit date/decimal/field separators. A record declaration
specifies period, hours, processing key, wage type and personnel number.
The period is represented by its first day, DD.MM.YYYY. The numeric-only payload
is ASCII (also valid Windows-1252), without BOM, with CRLF and decimal commas.
No hardcoded LODAS database version, master-data changes or removal records.
The generated format must still be validated in a real LODAS test client.

## Calculation and guards

- Actual elapsed time minus `break_minutes` once; the automatic-break field is
  a subset and must not be subtracted again. Sum before rounding to two decimal
  hours per person. This preserves DST and sub-minute durations.
- Pending corrections, running entries, invalid durations, overlaps and missing
  mappings block export. Month-crossing shifts from either side block export;
  splitting their breaks automatically would invent an allocation.
- Missing work days are not automatically filled or treated as worked time.
  The administrator must review completeness.
- Preview fingerprints cover settings, people, entries and pending corrections.
  Download rereads a consistent snapshot and rejects a changed preview.
- Generated files are recorded before responding. Identical retries reuse the
  same file record. A previously generated month requires explicit repeat
  confirmation because importing again can duplicate payroll bookings.
- This is a generated snapshot, not a month lock or confirmation of a download,
  transmission, successful DATEV import, or payment.

## Storage and access

Apply migration `037_datev_lodas_export.sql` before using the feature. During
development this was applied only to the dedicated local preview database.
`datev_settings` stores revisioned mappings; `datev_exports` stores generated
numeric files, their fingerprint, month, server timestamp and creator.
Tenant deletion cascades; creator deletion removes the creator reference.

Tables and RPCs are unavailable directly to anonymous and authenticated clients.
The server checks the current, non-deleted employee and administrator role before
using its service client. Tenant identity never comes from request data.
The SQL snapshot avoids REST row limits; settings writes validate employee
ownership and use optimistic revisions under a tenant row lock.
All API responses are private/no-store. No settings/content is logged.

The owner approved release as a free beta on 20.09.2026. There is no paid-plan
gate. Marketing and the export screen disclose the outstanding real LODAS test
import. Before relying on the file for payroll, validate representative imports
in a disposable LODAS test client, including personnel/wage mappings, decimals
and repeat-import handling. A download is not proof of successful import.
The production backup includes both DATEV tables.

## Verification

- Service tests: documented file structure, elapsed-time/rounding/DST behavior,
  invalid data, explicit exclusions, fingerprints and import warnings.
- API tests: current roles, tenant scope, malformed requests, stale snapshots,
  repeated downloads and database failures.
- Browser/database tests: full configuration/download flow, mobile layout,
  private table/RPC access, foreign employees, stale settings, 1,100 entries and
  a shift entering the month from the previous month.

These checks do not replace an actual DATEV test import.
