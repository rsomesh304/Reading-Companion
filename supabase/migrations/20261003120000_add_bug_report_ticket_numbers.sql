CREATE SEQUENCE if NOT EXISTS PUBLIC.bug_reports_ticket_number_seq;
ALTER TABLE
  PUBLIC.bug_reports
ADD
  column if NOT EXISTS ticket_number bigint;
SELECT
  setval(
    'public.bug_reports_ticket_number_seq',
    COALESCE(
      (
        SELECT
          MAX(ticket_number)
        FROM
          PUBLIC.bug_reports
      ),
      0
    ) + 1,
    FALSE
  );
UPDATE
  PUBLIC.bug_reports set ticket_number = NEXTVAL('public.bug_reports_ticket_number_seq')
WHERE
  ticket_number IS NULL;
ALTER TABLE
  PUBLIC.bug_reports
ALTER COLUMN
  ticket_number set DEFAULT NEXTVAL('public.bug_reports_ticket_number_seq');
GRANT usage,
SELECT
  ON SEQUENCE PUBLIC.bug_reports_ticket_number_seq TO anon,
  authenticated,
  service_role;
SELECT
  setval(
    'public.bug_reports_ticket_number_seq',
    COALESCE(
      (
        SELECT
          MAX(ticket_number)
        FROM
          PUBLIC.bug_reports
      ),
      0
    ) + 1,
    FALSE
  );
ALTER TABLE
  PUBLIC.bug_reports
ALTER COLUMN
  ticket_number set NOT NULL;
CREATE UNIQUE INDEX if NOT EXISTS bug_reports_ticket_number_key
  ON PUBLIC.bug_reports (ticket_number);
CREATE
  OR REPLACE FUNCTION PUBLIC.next_bug_report_ticket_number() returns bigint LANGUAGE SQL volatile security definer set search_path = PUBLIC AS $$
SELECT
  NEXTVAL('public.bug_reports_ticket_number_seq');$$;
REVOKE ALL
  ON FUNCTION PUBLIC.next_bug_report_ticket_number()
FROM
  PUBLIC,
  anon,
  authenticated;
GRANT EXECUTE
  ON FUNCTION PUBLIC.next_bug_report_ticket_number() TO service_role;
