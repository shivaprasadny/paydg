import React from "react";
import { View, ScrollView, StyleProp, ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets, Edge } from "react-native-safe-area-context";

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  bg?: string;
  safeTop?: boolean;          // true = respect notch/top safe area
  pad?: number;               // base padding for screen
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export default function Screen({
  children,
  scroll = true,
  bg = "#0B0F1A",
  safeTop = false,
  contentContainerStyle,
  style,
  pad = 0,
}: Props) {
  const insets = useSafeAreaInsets();

  // ✅ If safeTop is OFF, do NOT use full insets.top (too big).
  // Just a small visual breathing room.
  const topPad = safeTop ? 0 : 12;

  const edges: Edge[] = safeTop
    ? ["top", "left", "right", "bottom"]
    : ["left", "right", "bottom"];

  const baseContentStyle: ViewStyle = {
    padding: pad,
    paddingTop: pad + topPad,
    paddingBottom: (insets.bottom || 0) + 12,
  };

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: bg }, style]} edges={edges}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[baseContentStyle, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, baseContentStyle, contentContainerStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
