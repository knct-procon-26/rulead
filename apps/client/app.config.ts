import { ConfigContext, ExpoConfig } from "expo/config";

module.exports = ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  slug: "rulead",
  name: "rulead",
  android: {
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
    package: "club.prolab.rulead",
  },
  ios: {
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    },
  },
  plugins: [
    [
      "react-native-maps",
      {
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
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
