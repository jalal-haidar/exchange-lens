"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState("system");

  useEffect(() => {
    const stored = localStorage.getItem("exchange-theme");
    if (stored) setMode(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem("exchange-theme", mode);
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
    setMode((prev) => (prev === "light" ? "dark" : prev === "dark" ? "system" : "light"));
  }, []);

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
