import type { AppType } from "@rulead/backend";
import * as SecureStore from "expo-secure-store";
import Debug from "@/constants/Debug";
import { hc } from "hono/client";

const TOKEN_KEY = "device_token";
const endpoint = Debug.apiBaseUrl ?? "http://localhost:3000";
// TODO: ここにAPIのエンドポイントを設定する
const authApi = hc<AppType>(endpoint);

let tokenPromise: Promise<string> | null = null;

function getToken(): Promise<string> {
  // console.log("www");
  if (!tokenPromise) {
    tokenPromise = (async () => {
      const saved = await SecureStore.getItemAsync(TOKEN_KEY);
      if (saved) return saved;

      const res = await authApi.auth.register.$post();
      if (!res.ok) {
        throw new Error("error");
      }
      const { token } = await res.json();
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      return token;
    })();
  }
  tokenPromise.catch(() => {
    tokenPromise = null;
  });
  return tokenPromise;
}

export const api = hc<AppType>(endpoint, {
  headers: async () => ({ Authorization: `Bearer ${await getToken()}` }),
});
