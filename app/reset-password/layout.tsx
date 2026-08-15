import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "비밀번호 재설정",
  description: "클립AI 비밀번호를 재설정합니다.",
  alternates: { canonical: "/reset-password" },
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
