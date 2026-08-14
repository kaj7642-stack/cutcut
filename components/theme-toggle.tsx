"use client";

import { useState, useEffect } from "react";

type Theme = "system" | "dark" | "light";

const STORAGE_KEY = "clipai_theme";

function getInitial(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(STORAGE_KEY) as Theme) || "system";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const t = getInitial();
    setTheme(t);
    applyTheme(t);
  }, []);

  const cycle = () => {
    const order: Theme[] = ["system", "dark", "light"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const icon = theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🖥️";

  return (
    <button
      onClick={cycle}
      aria-label={`테마: ${theme === "system" ? "시스템" : theme === "dark" ? "다크" : "라이트"}`}
      className="text-sm px-2 py-1.5 rounded-lg"
      style={{ border: "1px solid var(--border)", color: "var(--fg-muted)", minWidth: "36px" }}
    >
      {icon}
    </button>
  );
}
