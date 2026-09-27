import Debug from "@/constants/Debug";
import * as Location from "expo-location";
import { Alert } from "react-native";
type reverseGeocodeResult = {
  address: string;
  elements: {
    type: string;
    geometry: { lat: number; lon: number }[];
    tags: {
      name?: string;
      "name:en"?: string;
    };
  }[];
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

  const addressRes = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1`,
    {
      method: "GET",
      headers: {
        "User-Agent": "Rulead/1.0",
        Accept: "*/*",
      },
    },
  );

  if (!addressRes.ok) {
    throw new Error(`Address error: ${addressRes.status}`);
  }

  const addressData = await addressRes.json();
  console.log(addressData);
  return {
    ...(await res.json()),
    address: addressToString(addressData.address),
  };
}

export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
}> {
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

export async function viewError(message: string) {
  return new Promise((resolve) => {
    Alert.alert("error", message, [
      {
        text: "OK",
        onPress: () => {
          resolve(true);
        },
      },
    ]);
  });
}
