// src/screens/about.tsx
// ---------------------------------------------------------
// PayDG — About Screen
// ✅ Premium light PayDG theme
// ✅ Updated support email
// ✅ Share app, support email, optional Venmo support
// ✅ Android-friendly bottom spacing
// ---------------------------------------------------------

import React from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Sharing from "expo-sharing";

import { t } from "../i18n";
import { useLang } from "../i18n/useLang";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import Screen from "../components/Screen";

const SUPPORT_EMAIL = "shiva_prem14@hotmail.com";
const VENMO_HANDLE = "@shivaprasad1991";
const APP_VERSION = "1.0.0";

/* =========================
   SMALL COMPONENTS
========================= */

function Card({
  title,
  children,
  tone = "default",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <View
      style={[
        styles.card,
        tone === "success" && styles.successCard,
        tone === "warning" && styles.warningCard,
      ]}
    >
      <Text
        style={[
          styles.cardTitle,
          tone === "success" && styles.successTitle,
          tone === "warning" && styles.warningTitle,
        ]}
      >
        {title}
      </Text>

      {children}
    </View>
  );
}

function BodyText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bodyText}>{children}</Text>;
}

function Bullet({ text }: { text: string }) {
  return <Text style={styles.bullet}>• {text}</Text>;
}

function ActionButton({
  label,
  sub,
  onPress,
  tone = "primary",
}: {
  label: string;
  sub?: string;
  onPress: () => void;
  tone?: "primary" | "success" | "danger" | "light";
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.actionBtn,
        tone === "success" && styles.successBtn,
        tone === "danger" && styles.dangerBtn,
        tone === "light" && styles.lightBtn,
      ]}
    >
      <Text
        style={[
          styles.actionTitle,
          tone === "light" && styles.lightBtnText,
          tone === "danger" && styles.dangerBtnText,
        ]}
      >
        {label}
      </Text>

      {sub ? (
        <Text
          style={[
            styles.actionSub,
            tone === "light" && styles.lightBtnSub,
            tone === "danger" && styles.dangerBtnSub,
          ]}
        >
          {sub}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

/* =========================
   MAIN SCREEN
========================= */

export default function AboutScreen() {
  // Re-render when language changes.
  useLang();

  async function openEmail() {
    const subject = encodeURIComponent("PayDG - Feedback / Support");
    const body = encodeURIComponent(
      "Hi Shiva,\n\nI’m using PayDG and I have feedback / need help:\n\n1) Issue:\n2) Phone model (optional):\n3) Steps to reproduce:\n\nThanks!\n"
    );

    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    const can = await Linking.canOpenURL(url);

    if (can) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        "Email not available",
        `Please email manually: ${SUPPORT_EMAIL}`
      );
    }
  }

  async function openVenmo() {
    const handle = VENMO_HANDLE.replace("@", "");

    const venmoApp = `venmo://paycharge?recipients=${encodeURIComponent(
      handle
    )}`;

    const venmoWeb = `https://venmo.com/${encodeURIComponent(handle)}`;

    const can = await Linking.canOpenURL(venmoApp);
    await Linking.openURL(can ? venmoApp : venmoWeb);
  }

  async function shareApp() {
    const message =
      `PayDG (v${APP_VERSION}) — track shifts, tips, and income in seconds.\n\n` +
      `If you work in restaurants, this makes life easier 😄\n\n` +
      `Made by Shiva Prasad.\n` +
      `Support: ${SUPPORT_EMAIL}`;

    const canShare = await Sharing.isAvailableAsync();

    if (!canShare) {
      Alert.alert("Share PayDG", message);
      return;
    }

    const smsUrl =
      Platform.OS === "ios"
        ? `sms:&body=${encodeURIComponent(message)}`
        : `sms:?body=${encodeURIComponent(message)}`;

    const can = await Linking.canOpenURL(smsUrl);

    if (can) {
      await Linking.openURL(smsUrl);
    } else {
      Alert.alert("Share this message", message);
    }
  }

  return (
    <Screen bg="#F6F7FB" pad={0}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <ActiveShiftTimerCard />

        {/* Header */}
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>ℹ️ About PayDG</Text>

          <Text style={styles.title}>{t("about_title") ?? "About PayDG"}</Text>

          <Text style={styles.version}>Version {APP_VERSION}</Text>

          <Text style={styles.heroText}>
            PayDG helps restaurant workers track shifts, tips, and income
            clearly — without messy notes or guessing.
          </Text>
        </View>

        {/* What the app does */}
        <Card title={t("about_what_title") ?? "💼 What PayDG does"}>
          <BodyText>
            {t("about_what_body") ??
              "PayDG helps you understand your real earnings across shifts, workplaces, roles, tips, and hours."}
          </BodyText>

          <View style={styles.bulletBlock}>
            <Bullet text="Track shifts, hours, breaks, and tips." />
            <Bullet text="Organize income by workplace and role." />
            <Bullet text="Use History to find and edit past shifts quickly." />
            <Bullet text="Use Stats to see week, month, and year trends." />
          </View>

          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              💡 The best tracking system is the one you actually use. PayDG is
              built to be fast.
            </Text>
          </View>
        </Card>

        {/* Fun facts */}
        <Card title="🎉 Fun facts" tone="success">
          <Bullet text="Small cash tips can add up to hundreds over a month." />
          <Bullet text="Tracking even 5 shifts can reveal earning patterns." />
          <Bullet text="If you ever argue with your own memory about money, PayDG is for you 😄" />
        </Card>

        {/* Quick guide CTA */}
        <Card title="📘 Want to learn it fast?">
          <BodyText>
            Use the Quick Guide screen to understand the best PayDG workflow:
            setup, adding shifts, punch in/out, history, and stats.
          </BodyText>

          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              🔎 If something feels confusing, email me. I’ll use your feedback
              to improve the app.
            </Text>
          </View>
        </Card>

        {/* Developer note */}
        <Card title="👨‍🍳 Note from the developer">
          <BodyText>
            Hi, I’m Shiva Prasad. I built PayDG to help restaurant workers
            because I worked in restaurants for many years. I know how stressful
            it can be to track tips and hours.
          </BodyText>

          <View style={{ height: 10 }} />

          <BodyText>
            Now I work as a developer and build apps for clients, but PayDG is
            personal. I want it to stay simple, fast, and helpful for the
            restaurant community.
          </BodyText>
        </Card>

        {/* Share */}
        <Card title="📣 Help PayDG grow">
          <BodyText>
            If PayDG helps you, please share it with a coworker or friend. That
            is the biggest support you can give.
          </BodyText>

          <ActionButton
            label="Share PayDG"
            sub="Opens a message you can send to a friend."
            onPress={shareApp}
            tone="success"
          />
        </Card>

        {/* Support */}
        <Card title="💬 Feedback & customer service">
          <BodyText>
            For feedback, bugs, feature requests, or customer service, email me
            here:
          </BodyText>

          <ActionButton
            label={SUPPORT_EMAIL}
            sub="Tap to send an email"
            onPress={openEmail}
            tone="primary"
          />
        </Card>

        {/* Donations */}
        <Card title="🙏 Support the project" tone="warning">
          <BodyText>
            If PayDG saves you time or helps you understand your money better,
            you can optionally support development.
          </BodyText>

          <ActionButton
            label={`Donate on Venmo: ${VENMO_HANDLE}`}
            sub="No pressure — sharing the app also helps a lot ❤️"
            onPress={openVenmo}
            tone="success"
          />
        </Card>

        {/* Updates */}
        <Card title={t("about_updates_title") ?? "🚀 What’s included"}>
          <Bullet text="Workplaces and Roles" />
          <Bullet text="Defaults per workplace or role" />
          <Bullet text="Weekly, monthly, and yearly stats" />
          <Bullet text="Punch In/Out with auto-close safety" />
          <Bullet text="English / Español support" />
          <Bullet text="Backup / Restore" />
        </Card>

        <Text style={styles.footerText}>
          {t("about_tip") ??
            "Thanks for using PayDG. Keep tracking consistently 🙌"}
        </Text>
      </ScrollView>
    </Screen>
  );
}

/* =========================
   PAYDG PREMIUM LIGHT THEME
========================= */

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingBottom: 52,
    gap: 14,
  },

  heroCard: {
    backgroundColor: "#1E293B",
    borderRadius: 28,
    padding: 22,
  },
  eyebrow: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "800",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 4,
  },
  version: {
    color: "#D97706",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 6,
  },
  heroText: {
    color: "#E2E8F0",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    marginTop: 10,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  bodyText: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
  },
  bulletBlock: {
    marginTop: 8,
  },
  bullet: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
    marginTop: 4,
  },

  successCard: {
    backgroundColor: "#ECFDF5",
    borderColor: "#86EFAC",
  },
  successTitle: {
    color: "#15803D",
  },
  warningCard: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
  },
  warningTitle: {
    color: "#92400E",
  },

  tipBox: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: 18,
    padding: 12,
    marginTop: 12,
  },
  tipText: {
    color: "#92400E",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
  },

  actionBtn: {
    marginTop: 12,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  successBtn: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  dangerBtn: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  lightBtn: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  actionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  actionSub: {
    color: "#E2E8F0",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    fontWeight: "700",
  },
  lightBtnText: {
    color: "#1E293B",
  },
  lightBtnSub: {
    color: "#64748B",
  },
  dangerBtnText: {
    color: "#B91C1C",
  },
  dangerBtnSub: {
    color: "#991B1B",
  },

  footerText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 4,
  },
});