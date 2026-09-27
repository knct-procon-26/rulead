import { Hono } from "hono";
import { getConnInfo } from "hono/bun";
import { generateToken, hashToken } from "./auth";
import { db } from "./db/client";
import { users } from "./db/schema";
import { allowRegister } from "./lib/rateLimit";

const app = new Hono();

function clientIp(c: Parameters<typeof getConnInfo>[0]): string | null {
  const cf = c.req.header("cf-connecting-ip");
  if (cf) return cf;
  try {
    return getConnInfo(c).remote.address ?? null;
  } catch {
    return null;
  }
}

const register = app.post("/", async (c) => {
  if (!allowRegister(clientIp(c))) {
    return c.json(
      { error: "しばらく時間をおいてから、もう一度お試しください。" },
      429,
    );
  }
  const token = generateToken();
  const [user] = await db
    .insert(users)
    .values({
      tokenHash: await hashToken(token),
    })
    .returning({ id: users.id });
  return c.json({ userId: user.id, token }, 200);
});

export default register;
