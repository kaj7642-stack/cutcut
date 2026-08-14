import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "스튜디오",
  description: "게임 영상을 업로드하고 AI가 하이라이트를 감지하여 자동으로 편집합니다.",
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
