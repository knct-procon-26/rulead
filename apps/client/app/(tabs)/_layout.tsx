import { SymbolView } from "expo-symbols";
import { Tabs } from "expo-router";

import Colors from "@/constants/Colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
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
        name="index"
        options={{
          title: "Rules",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "chevron.left.forwardslash.chevron.right",
                android: "front_hand",
                web: "front_hand",
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: "Diary",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "chevron.left.forwardslash.chevron.right",
                android: "history",
                web: "history",
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "chevron.left.forwardslash.chevron.right",
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
        name="collection"
        options={{
          title: "Collection",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "chevron.left.forwardslash.chevron.right",
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
        name="you"
        options={{
          title: "You",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "chevron.left.forwardslash.chevron.right",
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
