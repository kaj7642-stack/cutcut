import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "피드백",
  description: "클립AI에 대한 버그 신고, 기능 요청, 질문 등 피드백을 보내주세요.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
