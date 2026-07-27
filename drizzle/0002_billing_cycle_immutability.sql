-- Billing cycles are generated once by the billing-day Inngest job and are
-- frozen from that point on. Anything that happens after a cycle closes -
-- a dispute credit granted the day after billing, a skip reported late - is
-- new adjustment/ledger data that must flow into the *next* cycle's
-- new_charges_cents, never mutate a cycle that already closed. These
-- triggers make that a database guarantee, not an application convention.

-- billing_cycles: no column may change after insert, and rows are never deleted.
CREATE OR REPLACE FUNCTION billing_cycles_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'billing_cycles rows are immutable (id=%)', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER billing_cycles_no_update
  BEFORE UPDATE ON "billing_cycles"
  FOR EACH ROW EXECUTE FUNCTION billing_cycles_immutable();

CREATE TRIGGER billing_cycles_no_delete
  BEFORE DELETE ON "billing_cycles"
  FOR EACH ROW EXECUTE FUNCTION billing_cycles_immutable();

-- billing_cycle_items: the frozen math (which operator/cycle/customer it
-- belongs to, and the previous/new/total due amounts computed at generation
-- time) may never change. Only payment-tracking columns -- amount_paid_cents,
-- status, grace_ends_at, updated_at -- are mutable, since settlements land
-- against a cycle item after it's created.
CREATE OR REPLACE FUNCTION billing_cycle_items_freeze_math() RETURNS trigger AS $$
BEGIN
  IF NEW.operator_id             IS DISTINCT FROM OLD.operator_id
     OR NEW.billing_cycle_id     IS DISTINCT FROM OLD.billing_cycle_id
     OR NEW.customer_id          IS DISTINCT FROM OLD.customer_id
     OR NEW.previous_balance_cents IS DISTINCT FROM OLD.previous_balance_cents
     OR NEW.new_charges_cents    IS DISTINCT FROM OLD.new_charges_cents
     OR NEW.total_due_cents      IS DISTINCT FROM OLD.total_due_cents
     OR NEW.created_at           IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'billing_cycle_items: previous_balance_cents/new_charges_cents/total_due_cents and cycle/customer linkage are frozen after creation (id=%). Record new charges in the next cycle instead.', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER billing_cycle_items_freeze_math_trigger
  BEFORE UPDATE ON "billing_cycle_items"
  FOR EACH ROW EXECUTE FUNCTION billing_cycle_items_freeze_math();

CREATE OR REPLACE FUNCTION billing_cycle_items_no_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'billing_cycle_items rows are never deleted (id=%)', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER billing_cycle_items_no_delete_trigger
  BEFORE DELETE ON "billing_cycle_items"
  FOR EACH ROW EXECUTE FUNCTION billing_cycle_items_no_delete();
