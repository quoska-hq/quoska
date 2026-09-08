# Administratorzugang erhalten

Jedes Unternehmen braucht mindestens einen aktiven Admin. Vor einer Herabstufung
oder Deaktivierung des letzten Admins muss zuerst ein anderer Mitarbeiter die
Admin-Rolle erhalten. Die API antwortet bei einem solchen Konflikt mit HTTP 409
und einem Hinweis auf diesen Ablauf.

Migration `032_preserve_last_admin.sql` sichert Rollenänderungen, Deaktivierungen
und Unternehmenswechsel in der Datenbank ab. Sie serialisiert das Entfernen von
Admins über die Unternehmenszeile. Dadurch können zwei gleichzeitige Änderungen
nicht beide den jeweils anderen Admin mitzählen. Bei einem veralteten
REPEATABLE-READ-Snapshot bricht PostgreSQL die zweite Änderung ab. Die bestehende
vollständige Kontolöschung bleibt möglich.

Die Umsetzung berücksichtigt die PostgreSQL-Dokumentation zur
[Sichtbarkeit in Triggern](https://www.postgresql.org/docs/current/trigger-datachanges.html)
und zur [Transaktionsisolation](https://www.postgresql.org/docs/current/transaction-iso.html).

Bereits betroffene Konten werden durch die Migration nicht automatisch verändert.
Bei einer Supportreparatur müssen das ursprüngliche Administratorkonto und die
Unternehmenszugehörigkeit geprüft werden. Anschließend werden Rolle und Auth-Claims
gezielt wiederhergestellt. Erneutes Anmelden aktualisiert die Sitzung.

Tests: `tests/integration/last-admin.sql` prüft die Datenbankregeln einschließlich
Unternehmensgrenzen und deaktivierter Admins. `tests/e2e/last-admin.spec.ts` prüft
die abgewiesene Herabstufung und den danach weiterhin möglichen Projektzugriff.
