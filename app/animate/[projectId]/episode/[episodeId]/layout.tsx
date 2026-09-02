"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ReactNode } from "react";

const STEPS = [
  { key: "script", label: "대본", icon: "📝" },
  { key: "generate", label: "생성", icon: "🎨" },
  { key: "timeline", label: "타임라인", icon: "🎬" },
];

export default function EpisodeLayout({ children }: { children: ReactNode }) {
  const { projectId, episodeId } = useParams<{ projectId: string; episodeId: string }>();
  const pathname = usePathname();
  const current = STEPS.findIndex(s => pathname.endsWith(`/${s.key}`));

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link href={`/animate/${projectId}`} className="text-sm" style={{ color: "var(--fg-muted)" }}>← 프로젝트</Link>
      </div>

      <div className="flex items-center gap-1 mb-6 p-1 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        {STEPS.map((step, i) => {
          const active = i === current;
          const done = i < current;
          const href = `/animate/${projectId}/episode/${episodeId}/${step.key}`;
          return (
            <Link
              key={step.key}
              href={href}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: active ? "var(--accent)" : "transparent",
                color: active ? "#fff" : done ? "var(--accent)" : "var(--fg-muted)",
              }}
            >
              <span>{step.icon}</span>
              <span>{step.label}</span>
              {i < STEPS.length - 1 && <span className="ml-2" style={{ color: "var(--fg-muted)", opacity: 0.3 }}>→</span>}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
