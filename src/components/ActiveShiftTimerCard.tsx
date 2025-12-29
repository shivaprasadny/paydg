import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useActivePunch } from "../hooks/useActivePunch";
import { usePunchTimer } from "../hooks/usePunchTimer";
import { formatDuration } from "../utils/timeUtils";

export default function ActiveShiftTimerCard() {
  const router = useRouter();

  const activePunch = useActivePunch(); // ✅ auto refresh on punch in/out
  const elapsedMs = usePunchTimer(activePunch?.startedAtISO);

  if (!activePunch || elapsedMs == null) return null;

  return (
    <Pressable
      onPress={() => router.push("/punch")}
      style={{
        backgroundColor: "#052e16",
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#16a34a",
      }}
    >
      <Text style={{ color: "#bbf7d0", fontWeight: "900", fontSize: 16 }}>
        🟢 Shift In Progress
      </Text>

      <Text style={{ color: "#86efac", marginTop: 6 }}>
        {activePunch.workplaceName ?? "Workplace"}
        {activePunch.roleName ? ` • ${activePunch.roleName}` : ""}
      </Text>

      <Text style={{ color: "white", fontSize: 28, fontWeight: "900", marginTop: 8 }}>
        ⏱ {formatDuration(elapsedMs)}
      </Text>

      <Text style={{ color: "#86efac", fontSize: 12, marginTop: 4 }}>
        Tap to open Punch screen • Auto-closes at 16 hours
      </Text>
    </Pressable>
  );
}
