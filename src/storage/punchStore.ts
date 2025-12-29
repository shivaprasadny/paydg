// src/storage/punchStore.ts
// simple pub-sub for punch state changes

type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribePunchChanged(cb: Listener) {
  listeners.add(cb);

  // ✅ MUST return an unsubscribe function
  return () => {
    listeners.delete(cb);
  };
}

export function notifyPunchChanged() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
}
