import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "갤러리",
  description: "클립AI로 만든 게임 하이라이트 쇼츠를 구경해보세요. 롤, 배그, 발로란트 등.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    title: "클립AI 갤러리 — 게임 하이라이트 모음",
    description: "AI가 자동 편집한 게임 하이라이트 쇼츠를 구경해보세요.",
    url: "/gallery",
  },
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
