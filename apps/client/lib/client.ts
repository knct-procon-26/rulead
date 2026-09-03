import type { AppType } from "@rulead/backend";
import { hc } from "hono/client";

// TODO: ここにAPIのエンドポイントを設定する
export const api = hc<AppType>("http://localhost:3000/");
