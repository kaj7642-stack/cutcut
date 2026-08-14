import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "갤러리",
  description: "클립AI로 만든 게임 하이라이트 쇼츠 모음. 롤, 배그, 발로란트 등 다양한 게임의 AI 편집 결과물을 구경하세요.",
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
