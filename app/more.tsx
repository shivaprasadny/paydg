import React from "react";
import { SafeAreaView, Text, View } from "react-native";

export default function More() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0F1A" }}>
      <View style={{ padding: 20 }}>
        <Text style={{ color: "white", fontSize: 22, fontWeight: "800" }}>More</Text>
        <Text style={{ color: "#B8C0CC", marginTop: 8 }}>Profile, workplaces, settings later.</Text>
      </View>
    </SafeAreaView>
  );
}
