import React from "react";
import {
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Sharing from "expo-sharing";
import { t } from "../i18n";
import { useLang } from "../i18n/useLang";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import Screen from "../components/Screen";
const SUPPORT_EMAIL = "shivaprasadnyc@gmail.com";
const VENMO_HANDLE = "@shivaprasad1991";
const APP_VERSION = "1.0.0";

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
      {"• "}
      {text}
    </Text>
  );
}

function Button({
  label,
  sub,
  onPress,
  tone = "dark",
}: {
  label: string;
  sub?: string;
  onPress: () => void;
  tone?: "dark" | "green" | "red";
}) {
  const bg =
    tone === "green" ? "#052e16" : tone === "red" ? "#3b0a0a" : "#0B0F1A";
  const border =
    tone === "green" ? "#16a34a" : tone === "red" ? "#ef4444" : "#1F2937";
  const titleColor =
    tone === "green" ? "#bbf7d0" : tone === "red" ? "#fecaca" : "white";
  const subColor = tone === "green" ? "#86efac" : "#6B7280";

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        marginTop: 10,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
      }}
    >
      <Text style={{ color: titleColor, fontSize: 15, fontWeight: "900" }}>{label}</Text>
      {!!sub && (
        <Text style={{ color: subColor, fontSize: 12, marginTop: 4, lineHeight: 16 }}>
          {sub}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function AboutScreen() {
  useLang(); // ✅ rerender when language changes

  async function openEmail() {
    const subject = encodeURIComponent("PayDG - Feedback / Support");
    const body = encodeURIComponent(
      "Hi Shiva,\n\nI’m using PayDG and I have feedback / need help:\n\n1) Issue:\n2) Phone model (optional):\n3) Steps to reproduce:\n\nThanks!\n"
    );
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    const can = await Linking.canOpenURL(url);
    if (can) await Linking.openURL(url);
    else Alert.alert("Email not available", "Please email manually: " + SUPPORT_EMAIL);
  }

  async function openVenmo() {
    // Venmo deep links are inconsistent across devices, so we do best-effort:
    const venmoApp = `venmo://paycharge?recipients=${encodeURIComponent(
      VENMO_HANDLE.replace("@", "")
    )}`;
    const venmoWeb = `https://venmo.com/${encodeURIComponent(VENMO_HANDLE.replace("@", ""))}`;

    const can = await Linking.canOpenURL(venmoApp);
    await Linking.openURL(can ? venmoApp : venmoWeb);
  }

  async function shareApp() {
    // You can update this later when you have Play Store/App Store link.
    const message =
      `PayDG (v${APP_VERSION}) — track shifts + tips in seconds.\n\n` +
      `If you work in restaurants, this makes life easier 😄\n\n` +
      `Made by Shiva Prasad.\n` +
      `Support: ${SUPPORT_EMAIL}`;

    // Prefer native share sheet via expo-sharing when available
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert("Share", message);
      return;
    }

    // expo-sharing shares files; for text we can use the OS share via Linking (SMS) fallback.
    // Easiest: copy via alert OR open SMS composer where possible.
    // We'll do a simple cross-platform approach:
    const smsUrl =
      Platform.OS === "ios"
        ? `sms:&body=${encodeURIComponent(message)}`
        : `sms:?body=${encodeURIComponent(message)}`;

    const can = await Linking.canOpenURL(smsUrl);
    if (can) await Linking.openURL(smsUrl);
    else Alert.alert("Share this message", message);
  }

  return (
    <Screen>
      {/* ✅ this replaces ScrollView padding */}
      <View style={{ padding: 20, gap: 14, paddingBottom: 30 }}>
        <ActiveShiftTimerCard />

        {/* Title */}
        <Text style={{ color: "white", fontSize: 28, fontWeight: "900" }}>
          {t("about_title")}
        </Text>

        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: -10 }}>
          Version {APP_VERSION}
        </Text>

        {/* What the app does */}
        <Card title={t("about_what_title")}>
          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20 }}>
            {t("about_what_body")}
          </Text>

          <View style={{ height: 8 }} />

          <Bullet text="Track your shifts, hours, breaks, and tips — without messy notes." />
          <Bullet text="Use Workplaces + Roles to keep everything organized." />
          <Bullet text="Entries (weekly) + History (timeline) helps you find anything fast." />
          <Bullet text="Stats shows trends so you know which days/roles pay best." />

          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 12, lineHeight: 18 }}>
            Tip: The best tracking system is the one you actually use — PayDG is built to be fast.
          </Text>
        </Card>

        {/* Fun facts */}
        <Card title="🎉 Fun Facts (yes, it matters)">
          <Bullet text="A lot of restaurant workers forget small cash tips — those add up fast over a month." />
          <Bullet text="Tracking even 5 shifts can reveal patterns like “weekends earn more” or “this role pays better”." />
          <Bullet text="If you ever argue with your own memory about money… welcome to the club 😄" />
        </Card>

        {/* Quick Guide CTA */}
        <Card title="📘 Want to learn everything fast?">
          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20 }}>
            Use the Quick Guide screen to get the best out of PayDG (setup tips + best workflow).
          </Text>

          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 10, lineHeight: 18 }}>
            If something feels confusing, email me — I’ll help.
          </Text>
        </Card>

        {/* Developer note */}
        <Card title="👨‍🍳 Note from the Developer">
          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20 }}>
            Hi, I’m Shiva Prasad. I built PayDG to help restaurant workers because I worked in restaurants
            for many years. I know how stressful it is to track tips and hours — so I wanted a simple app
            that makes it fast, clear, and reliable.
          </Text>

          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20, marginTop: 10 }}>
            Now I work as a developer and build apps for big clients — but PayDG is personal, and I want it
            to stay helpful for the restaurant community.
          </Text>
        </Card>

        {/* Share */}
        <Card title="📣 Help me grow PayDG">
          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20 }}>
            If PayDG helps you, please share it with a coworker or friend.
            That’s the biggest support you can give.
          </Text>

          <Button
            label="Share PayDG with a friend"
            sub="Opens a message you can send in SMS/WhatsApp."
            onPress={shareApp}
            tone="green"
          />
        </Card>

        {/* Support / feedback */}
        <Card title="💬 Feedback & Customer Service">
          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20 }}>
            For feedback, bugs, feature requests, or customer service:
          </Text>

          <Button
            label={SUPPORT_EMAIL}
            sub="Tap to send an email"
            onPress={openEmail}
            tone="dark"
          />
        </Card>

        {/* Donations */}
        <Card title="🙏 Support the Project (Optional)">
          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20 }}>
            If PayDG saves you time or helps you understand your money better, consider supporting development.
            Every donation helps me keep improving the app and adding features (without ads).
          </Text>

          <Button
            label={`Donate on Venmo: ${VENMO_HANDLE}`}
            sub="Thank you — seriously. This keeps the project alive ❤️"
            onPress={openVenmo}
            tone="green"
          />

          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 10, lineHeight: 18 }}>
            No pressure — even sharing the app helps a lot.
          </Text>
        </Card>

        {/* Updates */}
        <Card title={t("about_updates_title")}>
          <Text style={{ color: "#B8C0CC", fontSize: 14, lineHeight: 20 }}>
            • Workplaces + Roles{"\n"}
            • Defaults per workplace/role{"\n"}
            • Weekly/monthly stats{"\n"}
            • Punch In/Out + auto-close safety{"\n"}
            • English / Español{"\n"}
            • Backup / Restore
          </Text>
        </Card>

        {/* Footer tip */}
        <Text style={{ color: "#6B7280", fontSize: 12 }}>
          {t("about_tip")}
        </Text>
      </View></Screen>
    
  );
}
