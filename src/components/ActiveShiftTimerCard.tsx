import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "expo-router";

import { getActivePunch } from "../storage/repositories/punchRepo";
import { usePunchTimer } from "../hooks/usePunchTimer";
import { formatDuration } from "../utils/timeUtils";

export default function ActiveShiftTimerCard() {
  const [activePunch, setActivePunch] = useState<any>(null);

  const refresh = useCallback(async () => {
    const p = await getActivePunch();
    setActivePunch(p);
  }, []);

  // ✅ re-load every time this screen becomes active
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const elapsedMs = usePunchTimer(activePunch?.startedAtISO);

  if (!activePunch || elapsedMs === null) return null;

  return (
    <View
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
        Auto-closes at 14 hours
      </Text>
    </View>
  );
}
