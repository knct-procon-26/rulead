import { timestamp } from "drizzle-orm/pg-core";

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
};

export const timestampsWithDeletedAt = {
  ...timestamps,
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};
