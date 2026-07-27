-- Row Level Security. Every operator sees only their own data. There is a
-- single login per operator (no staff accounts), so one tenant-isolation
-- policy per table -- comparing operator_id to the caller's own operator
-- row -- is sufficient; no read/write role split is needed.
--
-- Requires Supabase's auth schema (auth.uid()). This migration is
-- Supabase-only: the local PGlite verification/seed harness (db/localDb.ts)
-- applies 0000 and 0002 but skips this file, since there is no auth.uid()
-- outside Supabase. All server-side jobs (webhook processing, Inngest
-- functions, settlement/count/points jobs) run with the service role key,
-- which bypasses RLS entirely -- these policies only gate the operator's
-- own authenticated dashboard session.

CREATE OR REPLACE FUNCTION current_operator_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM operators WHERE auth_user_id = auth.uid()
$$;

-- operators: an operator can only see/update their own row (never a list).
ALTER TABLE "operators" ENABLE ROW LEVEL SECURITY;
CREATE POLICY operators_self ON "operators"
  FOR ALL USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

-- message_status_events carries no operator_id (it's a pure webhook-status
-- dedup table keyed by whatsapp_message_id) and is written only by
-- service-role Inngest jobs. RLS is enabled with no policy, so it is
-- unreachable from any authenticated client session by default.
ALTER TABLE "message_status_events" ENABLE ROW LEVEL SECURITY;

-- Every remaining tenant-scoped table follows the same shape.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'operator_slots', 'price_list_items', 'prepaid_plans', 'customers',
    'standing_orders', 'standing_order_items', 'adjustments',
    'route_stops', 'route_shares', 'delivery_ledger',
    'billing_cycles', 'billing_cycle_items', 'settlements', 'point_transactions',
    'prospects', 'messages', 'closures', 'disputes',
    'menus', 'menu_day_items', 'broadcasts', 'broadcast_recipients',
    'analytics_events', 'count_locks'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I FOR ALL USING (operator_id = current_operator_id()) WITH CHECK (operator_id = current_operator_id())',
      t
    );
  END LOOP;
END $$;
