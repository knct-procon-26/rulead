import { SymbolView } from "expo-symbols";
import { Tabs } from "expo-router";

import Colors from "@/constants/Colors";
import { useT } from "@/lib/i18n";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// iOS 版は撮影者の機能だけ：コレクション（左）・スキャン（中央）・You（右）。
// スキャンは "/"（index）なので、起動時はスキャンタブが開く。
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: false,
        sceneStyle: {
          paddingTop: insets.top,
          backgroundColor: Colors.background,
        },
      }}
    >
      <Tabs.Screen
        name="collection"
        options={{
          title: t.tabs.collection,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "books.vertical",
                android: "collections_bookmark",
                web: "collections_bookmark",
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.scan,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "camera.viewfinder",
                android: "photo",
                web: "photo",
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: t.tabs.you,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "person.crop.circle",
                android: "person",
                web: "person",
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
    </Tabs>
  );
}
