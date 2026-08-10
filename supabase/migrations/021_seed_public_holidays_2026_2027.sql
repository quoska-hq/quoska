-- Migration: 021_seed_public_holidays_2026_2027
-- Seeds the current and following calendar year. Municipality-specific
-- holidays are intentionally excluded because tenants currently store only a
-- Bundesland, not a municipality.

CREATE UNIQUE INDEX public_holidays_date_name_state_key
  ON public.public_holidays (date, name, bundesland);

WITH holiday_sets (date, name, states) AS (
  VALUES
    -- 2026 nationwide
    ('2026-01-01'::date, 'Neujahr', ARRAY['all']),
    ('2026-04-03'::date, 'Karfreitag', ARRAY['all']),
    ('2026-04-06'::date, 'Ostermontag', ARRAY['all']),
    ('2026-05-01'::date, 'Tag der Arbeit', ARRAY['all']),
    ('2026-05-14'::date, 'Christi Himmelfahrt', ARRAY['all']),
    ('2026-05-25'::date, 'Pfingstmontag', ARRAY['all']),
    ('2026-10-03'::date, 'Tag der Deutschen Einheit', ARRAY['all']),
    ('2026-12-25'::date, '1. Weihnachtsfeiertag', ARRAY['all']),
    ('2026-12-26'::date, '2. Weihnachtsfeiertag', ARRAY['all']),
    -- 2026 state-wide
    ('2026-01-06'::date, 'Heilige Drei Könige', ARRAY['baden-wuerttemberg', 'bayern', 'sachsen-anhalt']),
    ('2026-03-08'::date, 'Internationaler Frauentag', ARRAY['berlin', 'mecklenburg-vorpommern']),
    ('2026-06-04'::date, 'Fronleichnam', ARRAY['baden-wuerttemberg', 'bayern', 'hessen', 'nordrhein-westfalen', 'rheinland-pfalz', 'saarland']),
    ('2026-08-15'::date, 'Mariä Himmelfahrt', ARRAY['saarland']),
    ('2026-09-20'::date, 'Weltkindertag', ARRAY['thueringen']),
    ('2026-10-31'::date, 'Reformationstag', ARRAY['brandenburg', 'bremen', 'hamburg', 'mecklenburg-vorpommern', 'niedersachsen', 'sachsen', 'sachsen-anhalt', 'schleswig-holstein', 'thueringen']),
    ('2026-11-01'::date, 'Allerheiligen', ARRAY['baden-wuerttemberg', 'bayern', 'nordrhein-westfalen', 'rheinland-pfalz', 'saarland']),
    ('2026-11-18'::date, 'Buß- und Bettag', ARRAY['sachsen']),
    -- 2027 nationwide
    ('2027-01-01'::date, 'Neujahr', ARRAY['all']),
    ('2027-03-26'::date, 'Karfreitag', ARRAY['all']),
    ('2027-03-29'::date, 'Ostermontag', ARRAY['all']),
    ('2027-05-01'::date, 'Tag der Arbeit', ARRAY['all']),
    ('2027-05-06'::date, 'Christi Himmelfahrt', ARRAY['all']),
    ('2027-05-17'::date, 'Pfingstmontag', ARRAY['all']),
    ('2027-10-03'::date, 'Tag der Deutschen Einheit', ARRAY['all']),
    ('2027-12-25'::date, '1. Weihnachtsfeiertag', ARRAY['all']),
    ('2027-12-26'::date, '2. Weihnachtsfeiertag', ARRAY['all']),
    -- 2027 state-wide
    ('2027-01-06'::date, 'Heilige Drei Könige', ARRAY['baden-wuerttemberg', 'bayern', 'sachsen-anhalt']),
    ('2027-03-08'::date, 'Internationaler Frauentag', ARRAY['berlin', 'mecklenburg-vorpommern']),
    ('2027-05-27'::date, 'Fronleichnam', ARRAY['baden-wuerttemberg', 'bayern', 'hessen', 'nordrhein-westfalen', 'rheinland-pfalz', 'saarland']),
    ('2027-08-15'::date, 'Mariä Himmelfahrt', ARRAY['saarland']),
    ('2027-09-20'::date, 'Weltkindertag', ARRAY['thueringen']),
    ('2027-10-31'::date, 'Reformationstag', ARRAY['brandenburg', 'bremen', 'hamburg', 'mecklenburg-vorpommern', 'niedersachsen', 'sachsen', 'sachsen-anhalt', 'schleswig-holstein', 'thueringen']),
    ('2027-11-01'::date, 'Allerheiligen', ARRAY['baden-wuerttemberg', 'bayern', 'nordrhein-westfalen', 'rheinland-pfalz', 'saarland']),
    ('2027-11-17'::date, 'Buß- und Bettag', ARRAY['sachsen'])
)
INSERT INTO public.public_holidays (date, name, bundesland)
SELECT hs.date, hs.name, state
FROM holiday_sets hs
CROSS JOIN LATERAL unnest(hs.states) AS state
ON CONFLICT (date, name, bundesland) DO NOTHING;
