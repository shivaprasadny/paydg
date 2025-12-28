import React from "react";
import { Linking, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { t } from "../i18n";
import { useLang } from "../i18n/useLang";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";

import Screen from "../components/Screen";

const SUPPORT_EMAIL = "shivaprasadnyc@gmail.com";
const VENMO_HANDLE = "@shivaprasad1991";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "#1F2937",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <Text style={{ color: "white", fontSize: 16, fontWeight: "800", marginBottom: 8 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20, marginTop: 6 }}>
      {"• "}{text}
    </Text>
  );
}

export default function AboutScreen() {
  // ✅ Re-render when language changes
  useLang();

  async function openEmail() {
    const subject = encodeURIComponent("PayDG - Feedback / Support");
    const body = encodeURIComponent(
      "Hi Shiva,\n\nI’m using PayDG and I have feedback / need help:\n\n1) Issue:\n2) Phone model (optional):\n3) Steps to reproduce:\n\nThanks!\n"
    );
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    const can = await Linking.canOpenURL(url);
    if (can) await Linking.openURL(url);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0F1A" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 30 }}>

        <ActiveShiftTimerCard />
        {/* Title */}
        <Text style={{ color: "white", fontSize: 28, fontWeight: "900" }}>
          {t("about_title")}
        </Text>

        {/* What the app does */}
        <Card title={t("about_what_title")}>
          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20 }}>
            {t("about_what_body")}
          </Text>

          <Bullet text="Track your shifts (start time, end time, breaks)" />
          <Bullet text="Log cash tips + card tips and see total earnings" />
          <Bullet text="Use Workplaces + Roles so your data stays organized" />
          <Bullet text="View Entries (weekly) and History (timeline) anytime" />
          <Bullet text="Stats helps you understand your week/month trends" />
        </Card>

        {/* How to use */}
        <Card title="How to use PayDG (Quick Guide)">
          <Bullet text="Step 1: Add your Workplace (example: Don Giovanni)" />
          <Bullet text="Step 2: Add your Role (Server / Runner / Bartender)" />
          <Bullet text="Step 3: Go to Settings and set default wage + break time (optional)" />
          <Bullet text="Step 4: Add Shift → pick workplace + role → pick date/time → save" />
          <Bullet text="Step 5: Entries shows your week (Mon–Sun). Tap a day for details." />
          <Bullet text="Step 6: History shows all shifts. Tap a shift to edit." />

          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 10, lineHeight: 18 }}>
            Tip: If you choose a workplace/role with defaults, PayDG can auto-fill wage and break.
          </Text>
        </Card>

        {/* Developer note */}
        <Card title="Note from the Developer">
          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20 }}>
            Hi, I’m Shiva Prasad. I built PayDG to help restaurant workers because I worked
            in restaurants for many years. I know how stressful it is to track tips and hours,
            so I wanted a simple app that makes income tracking fast and clear.
          </Text>

          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20, marginTop: 10 }}>
            Now I work as a developer and build apps for big clients — but PayDG is personal
            to me, and I want it to stay helpful for the restaurant community.
          </Text>
        </Card>

        {/* Support / feedback */}
        <Card title="Feedback & Customer Service">
          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20 }}>
            For feedback, bugs, feature requests, or customer service, email me:
          </Text>

          <TouchableOpacity
            onPress={openEmail}
            style={{
              marginTop: 10,
              backgroundColor: "#0B0F1A",
              borderWidth: 1,
              borderColor: "#1F2937",
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: "white", fontSize: 15, fontWeight: "900" }}>
              {SUPPORT_EMAIL}
            </Text>
            <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>
              Tap to send an email
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Donations */}
        <Card title="Support the Project (Optional)">
          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20 }}>
            If PayDG saves you time and helps you track income, you can support development:
          </Text>

          <View
            style={{
              marginTop: 10,
              backgroundColor: "#0B0F1A",
              borderWidth: 1,
              borderColor: "#1F2937",
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: "white", fontSize: 15, fontWeight: "900" }}>
              Venmo: {VENMO_HANDLE}
            </Text>
            <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>
              Thank you for supporting future updates 🙏
            </Text>
          </View>
        </Card>

        {/* Updates */}
        <Card title={t("about_updates_title")}>
          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20 }}>
            • Workplaces + Roles{"\n"}
            • Defaults per workplace/role{"\n"}
            • Weekly/monthly stats{"\n"}
            • English / Español{"\n"}
            • Backup / Restore (optional)
          </Text>
        </Card>

        {/* Footer tip */}
        <Text style={{ color: "#6B7280", fontSize: 12 }}>
          {t("about_tip")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
