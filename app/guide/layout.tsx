import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "사용 가이드",
  description: "클립AI 사용 방법을 단계별로 알아보세요. 게임 영상 업로드부터 완성된 쇼츠 다운로드까지.",
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
