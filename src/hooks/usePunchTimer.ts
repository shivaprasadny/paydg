import { useEffect, useState } from "react";

export function usePunchTimer(startedAtISO?: string | null) {
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAtISO) {
      setElapsedMs(null);
      return;
    }

    const startMs = new Date(startedAtISO).getTime();

    const tick = () => {
      setElapsedMs(Math.max(0, Date.now() - startMs));
    };

    tick();
    const id = setInterval(tick, 1000);

    return () => clearInterval(id);
  }, [startedAtISO]);

  return elapsedMs;
}
