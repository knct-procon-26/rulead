import { ConfigContext, ExpoConfig } from "expo/config";

console.log(process.env);

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
  ],
});
