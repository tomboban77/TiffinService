import { pgTable, uuid, date, jsonb, timestamp, uniqueIndex, foreignKey } from "drizzle-orm/pg-core";
import { operators, operatorSlots } from "./operators";

// Written by the scheduled Inngest job at each slot's cutoff. Before lock,
// the Today screen computes counts live from standing_orders + adjustments;
// after lock, it reads this snapshot so a late write can never change what
// the kitchen already saw for a date/slot that already passed cutoff.
export const countLocks = pgTable("count_locks", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  slotId: uuid("slot_id").notNull(),
  date: date("date").notNull(),
  snapshot: jsonb("snapshot").notNull(), // { [priceListItemId]: quantity }
  lockedAt: timestamp("locked_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqLock: uniqueIndex("count_locks_operator_slot_date_uniq").on(t.operatorId, t.slotId, t.date),
  slotFk: foreignKey({
    columns: [t.slotId, t.operatorId],
    foreignColumns: [operatorSlots.id, operatorSlots.operatorId],
    name: "count_locks_slot_operator_fk",
  }),
}));
