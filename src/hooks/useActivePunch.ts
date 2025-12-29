// src/hooks/useActivePunch.ts
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getActivePunch, ActivePunch } from "../storage/repositories/punchRepo";
import { subscribePunchChanged } from "../storage/punchStore";

export function useActivePunch() {
  const [activePunch, setActivePunch] = useState<ActivePunch | null>(null);

  const refresh = useCallback(async () => {
    const p = await getActivePunch();
    setActivePunch(p);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    refresh();

    const unsub = subscribePunchChanged(() => {
      refresh();
    });

    // ✅ always return a function
    return () => {
      unsub();
    };
  }, [refresh]);

  return activePunch;
}
