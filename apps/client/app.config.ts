import { ConfigContext, ExpoConfig } from "expo/config";

const mapsKey = process.env.GOOGLE_MAPS_API_KEY;

module.exports = ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  slug: "rulead",
  name: "rulead",
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: mapsKey },
    },
    package: "club.prolab.rulead",
  },
  ios: {
    ...config.ios,
    config: {
      ...config.ios?.config,
      googleMapsApiKey: mapsKey,
    },
  },
  plugins: [
    ...(config.plugins ?? []),
    [
      "react-native-maps",
      {
        androidGoogleMapsApiKey: mapsKey,
        iosGoogleMapsApiKey: mapsKey,
      },
    ],
    ["expo-secure-store"],
    [
      "expo-media-library",
      {
        photosPermission:
          "公園日記に、公園にいた時間に撮った写真を表示するために使います。",
        savePhotosPermission: false,
        isAccessMediaLocationEnabled: false,
        granularPermissions: ["photo"],
      },
    ],
  ],
});
