import type { AppType } from "@rulead/backend";
import { hc } from "hono/client";

export const api = hc<AppType>("http://192.168.3.11:3000/");
