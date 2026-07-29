DROP INDEX IF EXISTS "operator_slots_operator_key_uniq";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "prepaid_plans_operator_name_uniq" ON "prepaid_plans" USING btree ("operator_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "price_list_items_operator_name_uniq" ON "price_list_items" USING btree ("operator_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "operator_slots_operator_key_uniq" ON "operator_slots" USING btree ("operator_id",lower("key"));