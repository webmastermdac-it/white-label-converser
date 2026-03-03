import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "genius-theme";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored || "system";
  });

  const resolved = theme === "system" ? getSystemTheme() : theme;

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  }, []);

  // Apply on mount and when theme changes
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  // Listen for OS theme changes when in system mode
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? "dark" : "light");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  return { theme, setTheme, resolved } as const;
}
