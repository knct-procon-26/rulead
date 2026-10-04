import { ConfigContext, ExpoConfig } from "expo/config";

const mapsKey = process.env.GOOGLE_MAPS_API_KEY;

// 地図は Google Maps（PROVIDER_GOOGLE）を使うので、キーが無いまま iOS ビルドすると
// 地図画面でアプリが落ちる。EAS のクラウドビルドでは、キーが無ければビルドを止める。
if (process.env.EAS_BUILD && !mapsKey) {
  throw new Error(
    "GOOGLE_MAPS_API_KEY が設定されていません（eas env:create で登録してください）",
  );
}

// iOS 専用（撮影者の機能のみ）の設定。
// 権限の説明文は App Store 審査で「何のために使うか」が具体的に書かれていることを求められる。
module.exports = ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  slug: "rulead",
  name: "rulead",
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
        iosGoogleMapsApiKey: mapsKey,
      },
    ],
    // 生体認証は使わないので Face ID の説明文は入れない
    ["expo-secure-store", { faceIDPermission: false }],
    [
      "expo-camera",
      {
        cameraPermission:
          "公園のルールが書かれた看板を撮影するためにカメラを使います。撮影した写真は、ルールを読み取るためにサーバーへ送信されます。",
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "撮影した看板がどの公園のものかを地図で特定するために、現在地を使います。",
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
        motionUsagePermission: false,
      },
    ],
  ],
});
