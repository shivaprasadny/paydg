// src/i18n/langStore.ts
// ---------------------------------------------------------
// Tiny event bus so screens re-render when language changes.
// ---------------------------------------------------------

type Listener = () => void;

let listeners: Listener[] = [];

export function subscribeLanguage(cb: Listener) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((x) => x !== cb);
  };
}

export function notifyLanguageChanged() {
  for (const cb of listeners) cb();
}
