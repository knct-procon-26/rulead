import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { desc } from "drizzle-orm";
import z from "zod";
import { db } from "./db/client";
import { testItems } from "./db/schema";

const app = new Hono();

const createItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const test = app
  .post("/", zValidator("json", createItemSchema), async (c) => {
    const data = c.req.valid("json");

    const [inserted] = await db
      .insert(testItems)
      .values({
        name: data.name,
        description: data.description ?? null,
      })
      .returning();

    const items = await db
      .select()
      .from(testItems)
      .orderBy(desc(testItems.createdAt))
      .limit(20);

    return c.json({
      success: true,
      inserted,
      items,
    });
  })
  .get("/", async (c) => {
    const items = await db
      .select()
      .from(testItems)
      .orderBy(desc(testItems.createdAt))
      .limit(20);

    return c.json({
      success: true,
      items,
    });
  });

export default test;
