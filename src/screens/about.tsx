import React from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { t } from "../i18n";
import { useLang } from "../i18n/useLang";

export default function AboutScreen() {
  // ✅ Re-render when language changes
  useLang();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0F1A" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <Text style={{ color: "white", fontSize: 28, fontWeight: "900" }}>
          {t("about_title")}
        </Text>

        <View
          style={{
            backgroundColor: "#111827",
            borderWidth: 1,
            borderColor: "#1F2937",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "800", marginBottom: 6 }}>
            {t("about_what_title")}
          </Text>
          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20 }}>
            {t("about_what_body")}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#111827",
            borderWidth: 1,
            borderColor: "#1F2937",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "800", marginBottom: 6 }}>
            {t("about_dev_title")}
          </Text>
          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20 }}>
            {t("about_dev_body")}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#111827",
            borderWidth: 1,
            borderColor: "#1F2937",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "800", marginBottom: 6 }}>
            {t("about_updates_title")}
          </Text>
          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20 }}>
            • Workplaces + Roles{"\n"}
            • Defaults per workplace/role{"\n"}
            • Weekly/monthly stats{"\n"}
            • English / Español
          </Text>
        </View>

        <Text style={{ color: "#6B7280", fontSize: 12 }}>
          {t("about_tip")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
