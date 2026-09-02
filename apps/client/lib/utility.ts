import Debug from "@/constants/Debug";
import * as Location from "expo-location";

type reverseGeocodeResult = {
  elements: {
    type: string;
    geometry: { lat: number; lon: number }[];
    tags: {
      name?: string;
      "name:en"?: string;
    };
  }[];
};

// Overpass APIを利用する。
// TODO: セルフホストした方がいいかなー
// TODO: 既にその公園エリアがサーバーに登録されているなら、そっちを使うようにする
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<reverseGeocodeResult> {
  const query = `
[out:json];
is_in(${latitude}, ${longitude})->.a;
(
  way(pivot.a);
);
out geom;`;

  console.log("Overpass query:", query);
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Rulead/1.0",
      Accept: "*/*",
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error(`Overpass error: ${res.status}`);
  }

  return await res.json();
}

export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
}> {
  if (Debug.isDebug) {
    return Debug.location;
  }
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("位置情報へのアクセスが許可されていない");
  }
  const location = await Location.getCurrentPositionAsync({});
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}
