import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";
import { generateToken, hashToken } from "./auth";
import { db } from "./db/client";
import { users } from "./db/schema";

const app = new Hono();

const register = app.post("/", async (c) => {
  const token = generateToken();
  const [user] = await db
    .insert(users)
    .values({
      tokenHash: await hashToken(token),
    })
    .returning({ id: users.id });
  return c.json({ userId: user.id, token });
});

export default register;
