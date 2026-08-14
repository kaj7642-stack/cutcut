"use client";

import { ErrorBoundary } from "@/components/error-boundary";
import { ToastProvider } from "@/components/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>{children}</ToastProvider>
    </ErrorBoundary>
  );
}
