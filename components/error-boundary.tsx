"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 32,
              textAlign: "center",
              maxWidth: 400,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>😵</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              문제가 발생했습니다
            </h2>
            <p style={{ color: "var(--fg-muted)", fontSize: 14, marginBottom: 20 }}>
              {this.state.error?.message || "알 수 없는 오류가 발생했습니다."}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "var(--accent)",
                color: "#fff",
                padding: "10px 24px",
                borderRadius: 10,
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
