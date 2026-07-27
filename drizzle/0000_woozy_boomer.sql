DO $$ BEGIN
 CREATE TYPE "public"."adjustment_kind" AS ENUM('skip', 'pause', 'resume', 'extra', 'set_quantity', 'address_change', 'food_notes_change', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."adjustment_source" AS ENUM('bot', 'operator');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."billing_cycle_item_status" AS ENUM('unpaid', 'partial', 'paid');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."billing_mode" AS ENUM('prepaid', 'billed_arrears');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."broadcast_recipient_status" AS ENUM('queued', 'sent', 'delivered', 'read', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."cadence" AS ENUM('per_day', 'batch');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."delivery_method" AS ENUM('delivery', 'pickup');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."delivery_status" AS ENUM('delivered', 'failed_charged', 'failed_not_charged');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."dispute_status" AS ENUM('open', 'credited', 'resent', 'resolved_other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."flag_resolution_type" AS ENUM('credited', 'resent', 'resolved_other', 'dismissed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."message_status" AS ENUM('received', 'sent', 'delivered', 'read', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."message_type" AS ENUM('text', 'voice', 'image', 'template', 'button', 'unsupported');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."point_txn_type" AS ENUM('credit_renewal', 'debit_delivery', 'manual_adjust', 'expiry');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."prospect_status" AS ENUM('new', 'trial_offered', 'converted', 'dismissed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."route_stop_status" AS ENUM('pending', 'delivered', 'not_delivered');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."settlement_method" AS ENUM('e_transfer', 'cash', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'lapsed', 'canceled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "operator_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"cutoff_time" time DEFAULT '20:00:00' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "operator_slots_id_operator_uniq" UNIQUE("id","operator_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "operators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"business_name" text NOT NULL,
	"owner_name" text NOT NULL,
	"email" text NOT NULL,
	"timezone" text NOT NULL,
	"bot_language" text DEFAULT 'en' NOT NULL,
	"whatsapp_phone_number_id" text,
	"whatsapp_business_account_id" text,
	"whatsapp_connected_at" timestamp with time zone,
	"billing_frequency" text,
	"billing_day_of_week" integer,
	"billing_day_of_month" integer,
	"grace_period_days" integer DEFAULT 1 NOT NULL,
	"trial_started_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"subscription_status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prepaid_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"name" text NOT NULL,
	"points_per_renewal" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"rollover_enabled" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prepaid_plans_id_operator_uniq" UNIQUE("id","operator_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_list_items_id_operator_uniq" UNIQUE("id","operator_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone_e164" text NOT NULL,
	"address" text,
	"food_notes" text,
	"billing_mode" "billing_mode" NOT NULL,
	"prepaid_plan_id" uuid,
	"points_balance" integer DEFAULT 0 NOT NULL,
	"route_sort_order" integer DEFAULT 0 NOT NULL,
	"opted_out_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_id_operator_uniq" UNIQUE("id","operator_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whatsapp_message_id" text NOT NULL,
	"status" "message_status" NOT NULL,
	"raw_payload" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"customer_id" uuid,
	"prospect_id" uuid,
	"whatsapp_message_id" text,
	"direction" "message_direction" NOT NULL,
	"type" "message_type" NOT NULL,
	"raw_payload" jsonb,
	"text" text,
	"transcript" text,
	"language_detected" text,
	"intent" text,
	"confidence" numeric,
	"status" "message_status" DEFAULT 'received' NOT NULL,
	"fail_reason" text,
	"needs_attention" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolution_type" "flag_resolution_type",
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_id_operator_uniq" UNIQUE("id","operator_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"phone_e164" text NOT NULL,
	"name" text,
	"status" "prospect_status" DEFAULT 'new' NOT NULL,
	"converted_customer_id" uuid,
	"first_contact_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prospects_id_operator_uniq" UNIQUE("id","operator_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"standing_order_id" uuid,
	"effective_date" date NOT NULL,
	"kind" "adjustment_kind" NOT NULL,
	"price_list_item_id" uuid,
	"quantity" integer,
	"adjustment_group_id" uuid,
	"note" text,
	"source" "adjustment_source" NOT NULL,
	"created_by_message_id" uuid,
	"supersedes_adjustment_id" uuid,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "adjustments_id_operator_uniq" UNIQUE("id","operator_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "standing_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"standing_order_id" uuid NOT NULL,
	"price_list_item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "standing_order_items_uniq" UNIQUE("standing_order_id","price_list_item_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "standing_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"day_pattern" integer[] NOT NULL,
	"cadence" "cadence" DEFAULT 'per_day' NOT NULL,
	"period_days" integer,
	"delivery_method" "delivery_method" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "standing_orders_id_operator_uniq" UNIQUE("id","operator_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "delivery_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"route_stop_id" uuid,
	"date" date NOT NULL,
	"slot_id" uuid NOT NULL,
	"price_list_item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"status" "delivery_status" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_ledger_id_operator_uniq" UNIQUE("id","operator_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "route_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"date" date NOT NULL,
	"driver_name" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "route_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"date" date NOT NULL,
	"delivery_method" "delivery_method" NOT NULL,
	"sort_order" integer NOT NULL,
	"status" "route_stop_status" DEFAULT 'pending' NOT NULL,
	"charge_on_fail" boolean,
	"note" text,
	"marked_by" text,
	"marked_at" timestamp with time zone,
	"lat" double precision,
	"lng" double precision,
	"photo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "route_stops_id_operator_uniq" UNIQUE("id","operator_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_cycle_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"billing_cycle_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"previous_balance_cents" integer DEFAULT 0 NOT NULL,
	"new_charges_cents" integer NOT NULL,
	"total_due_cents" integer NOT NULL,
	"amount_paid_cents" integer DEFAULT 0 NOT NULL,
	"status" "billing_cycle_item_status" DEFAULT 'unpaid' NOT NULL,
	"grace_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_cycle_items_id_operator_uniq" UNIQUE("id","operator_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"cycle_date" date NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_cycles_id_operator_uniq" UNIQUE("id","operator_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "point_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" "point_txn_type" NOT NULL,
	"points" integer NOT NULL,
	"related_settlement_id" uuid,
	"related_delivery_ledger_id" uuid,
	"note" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"billing_cycle_item_id" uuid,
	"amount_cents" integer NOT NULL,
	"method" "settlement_method" DEFAULT 'e_transfer' NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"note" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settlements_id_operator_uniq" UNIQUE("id","operator_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"event" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "broadcast_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"broadcast_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"whatsapp_message_id" text,
	"status" "broadcast_recipient_status" DEFAULT 'queued' NOT NULL,
	"fail_reason" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "broadcasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"menu_id" uuid,
	"message_template" text NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "broadcasts_id_operator_uniq" UNIQUE("id","operator_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "closures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"date" date NOT NULL,
	"reason" text,
	"broadcast_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"delivery_ledger_id" uuid,
	"message_id" uuid,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"credit_cents" integer,
	"resolution_note" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "menu_day_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"price_list_item_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"label" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menus_id_operator_uniq" UNIQUE("id","operator_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "count_locks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"date" date NOT NULL,
	"snapshot" jsonb NOT NULL,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operator_slots" ADD CONSTRAINT "operator_slots_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prepaid_plans" ADD CONSTRAINT "prepaid_plans_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_prepaid_plan_operator_fk" FOREIGN KEY ("prepaid_plan_id","operator_id") REFERENCES "public"."prepaid_plans"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_customer_operator_fk" FOREIGN KEY ("customer_id","operator_id") REFERENCES "public"."customers"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_prospect_operator_fk" FOREIGN KEY ("prospect_id","operator_id") REFERENCES "public"."prospects"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prospects" ADD CONSTRAINT "prospects_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prospects" ADD CONSTRAINT "prospects_converted_customer_operator_fk" FOREIGN KEY ("converted_customer_id","operator_id") REFERENCES "public"."customers"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_customer_operator_fk" FOREIGN KEY ("customer_id","operator_id") REFERENCES "public"."customers"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_standing_order_operator_fk" FOREIGN KEY ("standing_order_id","operator_id") REFERENCES "public"."standing_orders"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_price_item_operator_fk" FOREIGN KEY ("price_list_item_id","operator_id") REFERENCES "public"."price_list_items"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_message_operator_fk" FOREIGN KEY ("created_by_message_id","operator_id") REFERENCES "public"."messages"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_supersedes_self_fk" FOREIGN KEY ("supersedes_adjustment_id","operator_id") REFERENCES "public"."adjustments"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "standing_order_items" ADD CONSTRAINT "standing_order_items_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "standing_order_items" ADD CONSTRAINT "standing_order_items_order_operator_fk" FOREIGN KEY ("standing_order_id","operator_id") REFERENCES "public"."standing_orders"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "standing_order_items" ADD CONSTRAINT "standing_order_items_price_item_operator_fk" FOREIGN KEY ("price_list_item_id","operator_id") REFERENCES "public"."price_list_items"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "standing_orders" ADD CONSTRAINT "standing_orders_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "standing_orders" ADD CONSTRAINT "standing_orders_customer_operator_fk" FOREIGN KEY ("customer_id","operator_id") REFERENCES "public"."customers"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "standing_orders" ADD CONSTRAINT "standing_orders_slot_operator_fk" FOREIGN KEY ("slot_id","operator_id") REFERENCES "public"."operator_slots"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery_ledger" ADD CONSTRAINT "delivery_ledger_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery_ledger" ADD CONSTRAINT "delivery_ledger_customer_operator_fk" FOREIGN KEY ("customer_id","operator_id") REFERENCES "public"."customers"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery_ledger" ADD CONSTRAINT "delivery_ledger_route_stop_operator_fk" FOREIGN KEY ("route_stop_id","operator_id") REFERENCES "public"."route_stops"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery_ledger" ADD CONSTRAINT "delivery_ledger_slot_operator_fk" FOREIGN KEY ("slot_id","operator_id") REFERENCES "public"."operator_slots"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery_ledger" ADD CONSTRAINT "delivery_ledger_price_item_operator_fk" FOREIGN KEY ("price_list_item_id","operator_id") REFERENCES "public"."price_list_items"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "route_shares" ADD CONSTRAINT "route_shares_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_customer_operator_fk" FOREIGN KEY ("customer_id","operator_id") REFERENCES "public"."customers"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_slot_operator_fk" FOREIGN KEY ("slot_id","operator_id") REFERENCES "public"."operator_slots"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_cycle_items" ADD CONSTRAINT "billing_cycle_items_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_cycle_items" ADD CONSTRAINT "billing_cycle_items_cycle_operator_fk" FOREIGN KEY ("billing_cycle_id","operator_id") REFERENCES "public"."billing_cycles"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_cycle_items" ADD CONSTRAINT "billing_cycle_items_customer_operator_fk" FOREIGN KEY ("customer_id","operator_id") REFERENCES "public"."customers"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_cycles" ADD CONSTRAINT "billing_cycles_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_customer_operator_fk" FOREIGN KEY ("customer_id","operator_id") REFERENCES "public"."customers"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_settlement_operator_fk" FOREIGN KEY ("related_settlement_id","operator_id") REFERENCES "public"."settlements"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_ledger_operator_fk" FOREIGN KEY ("related_delivery_ledger_id","operator_id") REFERENCES "public"."delivery_ledger"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "settlements" ADD CONSTRAINT "settlements_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "settlements" ADD CONSTRAINT "settlements_customer_operator_fk" FOREIGN KEY ("customer_id","operator_id") REFERENCES "public"."customers"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "settlements" ADD CONSTRAINT "settlements_cycle_item_operator_fk" FOREIGN KEY ("billing_cycle_item_id","operator_id") REFERENCES "public"."billing_cycle_items"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_broadcast_operator_fk" FOREIGN KEY ("broadcast_id","operator_id") REFERENCES "public"."broadcasts"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_customer_operator_fk" FOREIGN KEY ("customer_id","operator_id") REFERENCES "public"."customers"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_menu_operator_fk" FOREIGN KEY ("menu_id","operator_id") REFERENCES "public"."menus"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "closures" ADD CONSTRAINT "closures_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "closures" ADD CONSTRAINT "closures_broadcast_operator_fk" FOREIGN KEY ("broadcast_id","operator_id") REFERENCES "public"."broadcasts"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_customer_operator_fk" FOREIGN KEY ("customer_id","operator_id") REFERENCES "public"."customers"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_ledger_operator_fk" FOREIGN KEY ("delivery_ledger_id","operator_id") REFERENCES "public"."delivery_ledger"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_message_operator_fk" FOREIGN KEY ("message_id","operator_id") REFERENCES "public"."messages"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "menu_day_items" ADD CONSTRAINT "menu_day_items_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "menu_day_items" ADD CONSTRAINT "menu_day_items_menu_operator_fk" FOREIGN KEY ("menu_id","operator_id") REFERENCES "public"."menus"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "menu_day_items" ADD CONSTRAINT "menu_day_items_price_item_operator_fk" FOREIGN KEY ("price_list_item_id","operator_id") REFERENCES "public"."price_list_items"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "menus" ADD CONSTRAINT "menus_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "count_locks" ADD CONSTRAINT "count_locks_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "count_locks" ADD CONSTRAINT "count_locks_slot_operator_fk" FOREIGN KEY ("slot_id","operator_id") REFERENCES "public"."operator_slots"("id","operator_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "operator_slots_operator_key_uniq" ON "operator_slots" USING btree ("operator_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "operators_auth_user_uniq" ON "operators" USING btree ("auth_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customers_operator_phone_uniq" ON "customers" USING btree ("operator_id","phone_e164");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "message_status_events_uniq" ON "message_status_events" USING btree ("whatsapp_message_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "messages_wa_id_uniq" ON "messages" USING btree ("whatsapp_message_id") WHERE "messages"."whatsapp_message_id" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_needs_attention_idx" ON "messages" USING btree ("operator_id","customer_id") WHERE "messages"."needs_attention" = true;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "prospects_operator_phone_uniq" ON "prospects" USING btree ("operator_id","phone_e164");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "adjustments_operator_date_idx" ON "adjustments" USING btree ("operator_id","effective_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "adjustments_customer_idx" ON "adjustments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "adjustments_group_idx" ON "adjustments" USING btree ("adjustment_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "standing_orders_operator_active_idx" ON "standing_orders" USING btree ("operator_id","active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "standing_orders_customer_idx" ON "standing_orders" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "delivery_ledger_stop_item_uniq" ON "delivery_ledger" USING btree ("route_stop_id","price_list_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_ledger_operator_date_idx" ON "delivery_ledger" USING btree ("operator_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_ledger_customer_date_idx" ON "delivery_ledger" USING btree ("customer_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "route_shares_token_uniq" ON "route_shares" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "route_shares_operator_date_idx" ON "route_shares" USING btree ("operator_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "route_stops_operator_customer_slot_date_uniq" ON "route_stops" USING btree ("operator_id","customer_id","slot_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "route_stops_operator_date_idx" ON "route_stops" USING btree ("operator_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_cycle_items_cycle_customer_uniq" ON "billing_cycle_items" USING btree ("billing_cycle_id","customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_cycle_items_customer_idx" ON "billing_cycle_items" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_cycles_operator_date_uniq" ON "billing_cycles" USING btree ("operator_id","cycle_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "point_transactions_idempotency_uniq" ON "point_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "point_transactions_customer_idx" ON "point_transactions" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "settlements_idempotency_uniq" ON "settlements" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "settlements_customer_idx" ON "settlements" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "broadcast_recipients_uniq" ON "broadcast_recipients" USING btree ("broadcast_id","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "closures_operator_date_uniq" ON "closures" USING btree ("operator_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "count_locks_operator_slot_date_uniq" ON "count_locks" USING btree ("operator_id","slot_id","date");