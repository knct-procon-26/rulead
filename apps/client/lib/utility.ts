import Debug from "@/constants/Debug";
import { api } from "@/lib/client";
import { getT } from "@/lib/i18n";
import * as Location from "expo-location";
import { Alert } from "react-native";

export type ReverseGeocodeArea = {
  osmId: string;
  name: string;
  kind: string;
  geometry: { latitude: number; longitude: number }[];
};

type reverseGeocodeResult = {
  address: string;
  areas: ReverseGeocodeArea[];
};

type addressResult = {
  address: {
    province?: string;
    state?: string;
    region?: string;
    county?: string;
    city?: string;
    district?: string;
    suburb?: string;
    town?: string;
    village?: string;
    neighbourhood?: string;
    road?: string;
  };
};

const ADDRESS_TIMEOUT_MS = 8_000;

function addressToString(address: addressResult["address"]): string {
  const parts = [
    address.province,
    address.state,
    address.region,
    address.county,
    address.city,
    address.district,
    address.suburb,
    address.town,
    address.village,
    address.neighbourhood,
    address.road,
  ].filter((i) => i !== undefined);
  return parts.join("");
}

// Nominatim(将来的に置き換えたいけどとりあえずは素材本来の味をお楽しみください)
async function fetchAddress(
  latitude: number,
  longitude: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ADDRESS_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1`,
      {
        method: "GET",
        headers: {
          "User-Agent": "Rulead/1.0",
          Accept: "*/*",
        },
        signal: controller.signal,
      },
    );
    if (!res.ok) return "";
    const data = (await res.json()) as Partial<addressResult> | null;
    if (!data?.address || typeof data.address !== "object") return "";
    return addressToString(data.address);
  } catch (e) {
    console.warn("address lookup failed", e);
    return "";
  } finally {
    clearTimeout(timer);
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<reverseGeocodeResult> {
  const [areasRes, address] = await Promise.all([
    api.api.areas.$get({
      query: { lat: String(latitude), lng: String(longitude) },
    }),
    fetchAddress(latitude, longitude),
  ]);

  if (!areasRes.ok) {
    throw new Error(`Areas error: ${areasRes.status}`);
  }
  const data = await areasRes.json();

  return {
    address,
    areas: data.areas.map((a) => ({
      osmId: a.osmId,
      name: a.name || a.nameEn || "",
      kind: a.kind,
      geometry: a.geometry,
    })),
  };
}

const LOCATION_PERMISSION_ERROR = "E_LOCATION_PERMISSION";

export function isLocationPermissionError(e: unknown): boolean {
  return (e as { code?: unknown } | null)?.code === LOCATION_PERMISSION_ERROR;
}

export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
}> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    const err = new Error(getT().common.locationNotAllowed) as Error & {
      code: string;
    };
    err.code = LOCATION_PERMISSION_ERROR;
    throw err;
  }
  const location = await Location.getCurrentPositionAsync({});
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

const NOT_A_SIGN = "This is not rule sign.";

export function apiErrorMessage(
  status: number,
  serverMessage?: unknown,
): string {
  const t = getT();
  const detail = typeof serverMessage === "string" ? serverMessage.trim() : "";
  if (status === 429) return t.errors.rateLimited;
  if (status === 403) return t.errors.blocked;
  if (status >= 500) return t.errors.server;
  if (detail === NOT_A_SIGN) return t.errors.notASign;
  return detail === ""
    ? t.errors.requestFailed
    : `${t.errors.requestFailed}\n(${detail})`;
}

export function networkErrorMessage(): string {
  return getT().errors.network;
}

export async function viewError(message: string) {
  return new Promise((resolve) => {
    const t = getT();
    Alert.alert(t.common.errorTitle, message, [
      {
        text: t.common.ok,
        onPress: () => {
          resolve(true);
        },
      },
    ]);
  });
}
