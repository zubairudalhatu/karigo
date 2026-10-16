-- Additive only. No existing identities, roles, phones or business rows change.
CREATE TABLE governance_security_events (
  id uuid PRIMARY KEY,
  event text NOT NULL,
  actor uuid,
  subject uuid,
  facts jsonb NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX governance_security_events_subject_time ON governance_security_events(subject, "createdAt");
CREATE FUNCTION reject_governance_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'GOVERNANCE_AUDIT_APPEND_ONLY'; END $$;
CREATE TRIGGER governance_audit_no_mutation BEFORE UPDATE OR DELETE ON governance_security_events
FOR EACH ROW EXECUTE FUNCTION reject_governance_audit_mutation();
CREATE TRIGGER governance_audit_no_truncate BEFORE TRUNCATE ON governance_security_events
FOR EACH STATEMENT EXECUTE FUNCTION reject_governance_audit_mutation();
CREATE TABLE governance_control_state (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 0
);
-- Absent/partial roster is deliberately fail-closed. No authority seeded here.
