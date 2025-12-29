import React from "react";
import { Text, View } from "react-native";
import Screen from "../components/Screen";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";

/* ---------------- styles ---------------- */

const card = {
  backgroundColor: "#111827",
  borderWidth: 1,
  borderColor: "#1F2937",
  borderRadius: 16,
  padding: 14,
} as const;

const title = {
  color: "white",
  fontSize: 16,
  fontWeight: "900",
  marginBottom: 6,
} as const;

const body = {
  color: "#B8C0CC",
  fontSize: 14,
  lineHeight: 20,
} as const;

const bold = { color: "white", fontWeight: "900" } as const;

const miniTip = {
  marginTop: 10,
  backgroundColor: "#0B0F1A",
  borderWidth: 1,
  borderColor: "#1F2937",
  borderRadius: 14,
  padding: 12,
} as const;

const miniTipText = {
  color: "#9CA3AF",
  fontSize: 12,
  lineHeight: 16,
} as const;

const cardGreen = {
  backgroundColor: "#052e16",
  borderWidth: 1,
  borderColor: "#16a34a",
  borderRadius: 16,
  padding: 14,
} as const;

const titleGreen = {
  color: "#bbf7d0",
  fontSize: 16,
  fontWeight: "900",
  marginBottom: 6,
} as const;

const bodyGreen = {
  color: "#86efac",
  fontSize: 13,
  lineHeight: 18,
} as const;

const cardRed = {
  backgroundColor: "#3b0a0a",
  borderWidth: 1,
  borderColor: "#ef4444",
  borderRadius: 16,
  padding: 14,
} as const;

const titleRed = {
  color: "#fecaca",
  fontSize: 16,
  fontWeight: "900",
  marginBottom: 6,
} as const;

const bodyRed = {
  color: "#fca5a5",
  fontSize: 13,
  lineHeight: 18,
} as const;

const boldRed = { color: "#fff", fontWeight: "900" } as const;

/* ---------------- screen ---------------- */

export default function QuickGuideScreen() {
  return (
    <Screen pad={20}>
      <View style={{ gap: 14, paddingBottom: 10 }}>
        <ActiveShiftTimerCard />

        {/* Header */}
        <Text style={{ color: "white", fontSize: 24, fontWeight: "800" }}>
          📘 Quick Guide
        </Text>
        <Text style={{ color: "#B8C0CC", fontSize: 13, lineHeight: 19, marginTop: -4 }}>
          PayDG helps restaurant workers track hours + tips fast — so your paycheck never feels like a mystery.
        </Text>

        {/* Fun Fact */}
        <View style={cardGreen}>
          <Text style={titleGreen}>🎯 Fun fact</Text>
          <Text style={bodyGreen}>
            Most tip workers underestimate weekly tips when they don’t track them daily.
            Small tips add up fast — PayDG helps you see the real number. 😄
          </Text>
        </View>

        {/* 1) Setup */}
        <View style={card}>
          <Text style={title}>✅ 1) Setup (takes 2 minutes)</Text>
          <Text style={body}>
            Do this once and the app becomes effortless:
            {"\n\n"}• Add your <Text style={bold}>Workplace</Text> (example: Don Giovanni)
            {"\n"}• Add your <Text style={bold}>Role</Text> (Server, Bartender, Runner)
            {"\n"}• Optional: Set defaults in <Text style={bold}>Settings</Text> (hourly wage + break rules)
          </Text>

          <View style={miniTip}>
            <Text style={miniTipText}>
              💡 Pro tip: If you work at multiple places, add them all now — your Stats will become much stronger later.
            </Text>
          </View>
        </View>

        {/* 2) Track shifts */}
        <View style={card}>
          <Text style={title}>⏱️ 2) Track your shifts (2 options)</Text>

          <Text style={body}>
            <Text style={bold}>Option A — Add Shift:</Text>
            {"\n"}Best when you know your start/end time. You enter hours + tips manually.
            {"\n\n"}
            <Text style={bold}>Option B — Punch In/Out:</Text>
            {"\n"}Best when you’re busy. One tap in, one tap out — PayDG calculates hours automatically.
          </Text>

          <View style={miniTip}>
            <Text style={miniTipText}>
              🍕 Busy night? Use Punch. Chill shift? Use Add Shift. Both show up in History + Stats.
            </Text>
          </View>
        </View>

        {/* 3) Know your screens */}
        <View style={card}>
          <Text style={title}>📂 3) Know your screens</Text>

          <Text style={body}>
            • <Text style={bold}>Home</Text>: quick stats + last shift + shortcuts{"\n"}
            • <Text style={bold}>Entries</Text>: weekly view grouped by day (nice for planning){"\n"}
            • <Text style={bold}>History</Text>: full timeline of shifts (tap to edit){"\n"}
            • <Text style={bold}>Stats</Text>: trends by week/month/year (helps you improve)
          </Text>

          <View style={miniTip}>
            <Text style={miniTipText}>
              🔎 Tip: If you ever need to fix something, History is your “control center.”
            </Text>
          </View>
        </View>

        {/* 4) Better data = better stats */}
        <View style={card}>
          <Text style={title}>💰 4) Get better stats (small habits)</Text>

          <Text style={body}>
            Want the app to feel “smart”? These tiny habits make a big difference:
            {"\n\n"}• Always pick a <Text style={bold}>Workplace + Role</Text>
            {"\n"}• Split tips into <Text style={bold}>Cash</Text> + <Text style={bold}>Card</Text>
            {"\n"}• Add a quick note: “double shift”, “private party”, “slow night”
          </Text>

          <View style={miniTip}>
            <Text style={miniTipText}>
              ⭐ After 2–3 weeks of data you’ll start seeing patterns like “Weekends pay more” or “This role earns better.”
            </Text>
          </View>
        </View>

        {/* 5) Forgot punch out */}
        <View style={cardRed}>
          <Text style={titleRed}>🚨 5) Forgot to punch out?</Text>

          <Text style={bodyRed}>
            No stress — PayDG has a safety auto-close so it won’t run forever.
            {"\n\n"}You can always fix it in <Text style={boldRed}>History → Edit Shift</Text>.
          </Text>
        </View>

        {/* Footer */}
        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 6, lineHeight: 16 }}>
          Tip: The goal isn’t perfection — it’s consistency. Even “rough tracking” makes your money clearer. 🙌
        </Text>
      </View>
    </Screen>
  );
}
