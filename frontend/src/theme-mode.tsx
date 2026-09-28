// Persisted theme preference: "system" | "light" | "dark".
// Applies the choice through Appearance so useTheme() (which reads
// useColorScheme) follows it. Wrap the app once in _layout.tsx.

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

import { storage } from "@/src/utils/storage";
import { setColorScheme, type ColorScheme } from "@/src/theme";

export type ThemeMode = "system" | ColorScheme;

const KEY = "carikroto.theme.mode";

type Ctx = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

const ThemeModeContext = createContext<Ctx>({ mode: "system", setMode: () => {} });

function apply(mode: ThemeMode) {
  setColorScheme(mode === "system" ? null : mode);
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<ThemeMode>(KEY, "system");
      const value = (saved ?? "system") as ThemeMode;
      setModeState(value);
      apply(value);
    })();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    apply(m);
    storage.setItem(KEY, m);
  }, []);

  return <ThemeModeContext.Provider value={{ mode, setMode }}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
