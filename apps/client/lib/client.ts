import type { AppType } from "@rulead/backend";
import Debug from "@/constants/Debug";
import { hc } from "hono/client";

// TODO: ここにAPIのエンドポイントを設定する
export const api = hc<AppType>(Debug.apiBaseUrl ?? "http://localhost:3000");
