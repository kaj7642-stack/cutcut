"use client";

import { useState, useCallback, createContext, useContext, useRef } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastCtx {
  toast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const colorMap = {
    success: "var(--success)",
    error: "var(--danger)",
    info: "var(--accent)",
  };

  return (
    <ToastContext value={{ toast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 360,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              background: "var(--bg-card)",
              border: `1px solid ${colorMap[t.type]}`,
              borderLeft: `4px solid ${colorMap[t.type]}`,
              borderRadius: 10,
              padding: "12px 16px",
              color: "var(--fg)",
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              animation: "toast-in 0.3s ease",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
