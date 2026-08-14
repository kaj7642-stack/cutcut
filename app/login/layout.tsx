import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인",
  description: "클립AI 로그인 — 카카오, 네이버, 이메일로 간편 가입.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
