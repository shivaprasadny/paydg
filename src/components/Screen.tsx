import React from "react";
import { View, ScrollView, StyleProp, ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function Screen({
  children,
  scroll = true,
  bg = "#0B0F1A",
  safeTop = false,
  contentContainerStyle,
  style,
  pad = 0, // ✅ add default padding control
}: {
  children: React.ReactNode;
  scroll?: boolean;
  bg?: string;
  safeTop?: boolean;
  pad?: number;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor: bg }, style]}
      edges={safeTop ? ["top", "left", "right", "bottom"] : ["left", "right", "bottom"]}
    >
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            {
              padding: pad,
              paddingBottom: (insets.bottom || 0) + 10, // ✅ Android cut fix
            },
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding: pad, paddingBottom: (insets.bottom || 0) + 16 }}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
