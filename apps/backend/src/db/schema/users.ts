import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps, timestampsWithDeletedAt } from "./_timestamps";

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .$default(() => crypto.randomUUID()),
  tokenHash: text("token_hash").notNull(),
  signCount: integer("sign_count").notNull().default(0),
  apiCallCount: integer("api_call_count").notNull().default(0),
  apiCountResetAt: timestamp("api_count_reset_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  blockedAt: timestamp("blocked_at", { withTimezone: true }),
  ...timestampsWithDeletedAt,
});
