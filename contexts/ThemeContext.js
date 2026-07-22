"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

const ThemeContext = createContext(undefined);
const THEME_KEY = "exchange-theme";
const THEME_EVENT = "exchange-theme-change";
const VALID_MODES = new Set(["light", "dark", "system"]);

function subscribeToTheme(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_EVENT, callback);
  };
}

function getThemeSnapshot() {
  const stored = localStorage.getItem(THEME_KEY);
  return VALID_MODES.has(stored) ? stored : "system";
}

function getServerThemeSnapshot() {
  return "system";
}

export function ThemeProvider({ children }) {
  const mode = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const setMode = useCallback((nextMode) => {
    const resolvedMode = typeof nextMode === "function"
      ? nextMode(getThemeSnapshot())
      : nextMode;
    if (!VALID_MODES.has(resolvedMode)) return;

    localStorage.setItem(THEME_KEY, resolvedMode);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (mode === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(prefersDark ? "dark" : "light");
    } else {
      root.classList.add(mode);
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.content = mode === "dark" ? "#0c1222" : "#ffffff";
    }
  }, [mode]);

  const cycleTheme = useCallback(() => {
    setMode((previous) => (
      previous === "light" ? "dark" : previous === "dark" ? "system" : "light"
    ));
  }, [setMode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
