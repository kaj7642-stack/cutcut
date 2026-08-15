import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "스튜디오",
  description: "게임 영상을 업로드하고 AI가 하이라이트를 감지하여 자동으로 편집합니다.",
  alternates: { canonical: "/studio" },
  openGraph: {
    title: "클립AI 스튜디오 — 게임 하이라이트 자동 편집",
    description: "게임 영상을 업로드하면 AI가 편집점을 찾고 나레이션과 자막을 자동으로 생성합니다.",
    url: "/studio",
  },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
