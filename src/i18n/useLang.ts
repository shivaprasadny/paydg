// src/i18n/useLang.ts
// ---------------------------------------------------------
// Hook: call useLang() inside a screen so it re-renders when
// language changes.
// ---------------------------------------------------------

import { useEffect, useState } from "react";
import { subscribeLanguage } from "./langStore";
import { getLanguage } from "./index";

export function useLang() {
  const [lang, setLang] = useState(getLanguage());

  useEffect(() => {
    return subscribeLanguage(() => {
      setLang(getLanguage());
    });
  }, []);

  return lang;
}
