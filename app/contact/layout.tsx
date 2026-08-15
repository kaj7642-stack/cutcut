import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "문의하기",
  description: "클립AI에 피드백을 보내세요. 버그 신고, 기능 요청, 질문 등.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
