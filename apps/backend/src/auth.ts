import { createMiddleware } from "hono/factory";
import { db } from "./db/client";
import { users } from "./db/schema";
import { and, eq, isNull } from "drizzle-orm";

export function generateToken() {
  return toHexString(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashToken(token: string) {
  return toHexString(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
  );
}

function toHexString(buffer: ArrayBuffer | Uint8Array): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type AuthContext = {
  Variables: {
    userId: string;
  };
};

export const requireAuth = createMiddleware<AuthContext>(async (c, next) => {
  const header = c.req.header("Authorization");
  let token: string;
  if (header?.startsWith("Bearer ")) {
    token = header.slice(7);
  } else {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const [user] = await db
    .select({ id: users.id, blockedAt: users.blockedAt })
    .from(users)
    .where(
      and(eq(users.tokenHash, await hashToken(token)), isNull(users.deletedAt)),
    );

  if (!user || user.blockedAt) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("userId", user.id);
  await next();
});
