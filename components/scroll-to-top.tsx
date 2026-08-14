"use client";

import { useState, useEffect } from "react";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="맨 위로"
      className="fixed bottom-6 right-6 w-11 h-11 rounded-full flex items-center justify-center text-lg z-50 transition-opacity"
      style={{
        background: "var(--accent)",
        color: "#fff",
        boxShadow: "0 4px 16px var(--accent-glow)",
        opacity: visible ? 1 : 0,
      }}
    >
      ↑
    </button>
  );
}
