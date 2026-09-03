import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const testItems = pgTable("test_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
