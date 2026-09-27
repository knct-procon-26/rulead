import type { AppType } from "@rulead/backend";
import * as SecureStore from "expo-secure-store";
import Debug from "@/constants/Debug";
import { ApplyGlobalResponse, hc } from "hono/client";

const TOKEN_KEY = "device_token";
const endpoint = Debug.apiBaseUrl ?? "http://localhost:3000";
// TODO: ここにAPIのエンドポイントを設定する

const authApi = hc<AppType>(endpoint);

let tokenPromise: Promise<string> | null = null;

let invalidating: Promise<void> | null = null;
const tokenListeners = new Set<() => void>();

export function getToken(): Promise<string> {
  if (!tokenPromise) {
    const p = (async () => {
      if (invalidating) await invalidating;
      const saved = await SecureStore.getItemAsync(TOKEN_KEY);
      if (saved) return saved;

      const res = await authApi.auth.register.$post();
      if (!res.ok) {
        throw new Error(`register failed: ${res.status}`);
      }
      const { token } = await res.json();
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      tokenListeners.forEach((l) => l());
      return token;
    })();
    tokenPromise = p;
    p.catch(() => {
      if (tokenPromise === p) tokenPromise = null;
    });
  }
  return tokenPromise;
}

export function onTokenChange(listener: () => void): () => void {
  tokenListeners.add(listener);
  return () => {
    tokenListeners.delete(listener);
  };
}

export async function resetToken(stale?: string): Promise<void> {
  if (stale !== undefined) {
    const current = tokenPromise
      ? await tokenPromise.catch(() => null)
      : await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
    if (current !== stale) return;
  }
  if (!invalidating) {
    const p = (async () => {
      tokenPromise = null;
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    })();
    invalidating = p;
    p.catch(() => {}).finally(() => {
      if (invalidating === p) invalidating = null;
    });
  }
  await invalidating;
}

function withAuth(init: RequestInit | undefined, token: string): RequestInit {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

const authFetch: typeof fetch = async (input, init) => {
  const token = await getToken();
  const res = await fetch(input, withAuth(init, token));
  if (res.status !== 401) return res;
  await resetToken(token);
  return fetch(input, withAuth(init, await getToken()));
};

type AppWithErrors = ApplyGlobalResponse<
  AppType,
  {
    400: { json: { error: string } };
    403: { json: { error: string } };
    404: { json: { error: string } };
    409: { json: { error: string } };
    429: { json: { error: string } };
    503: { json: { error: string } };
    500: { json: { error: string } };
  }
>;

export const api = hc<AppWithErrors>(endpoint, { fetch: authFetch });
