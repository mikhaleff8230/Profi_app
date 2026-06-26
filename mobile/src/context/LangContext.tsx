import React, { createContext, useCallback, useContext, useMemo } from "react";
import type { Lang } from "../i18n";
import { translate } from "../i18n";

type LangCtx = { lang: Lang; t: (key: string) => string };
const LangContext = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const t = useCallback((key: string) => translate("ru", key), []);
  const value = useMemo(() => ({ lang: "ru" as const, t }), [t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const v = useContext(LangContext);
  if (!v) throw new Error("useLang outside LangProvider");
  return v;
}
