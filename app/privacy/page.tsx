import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
};

const SECTIONS = [
  {
    title: "1. 개인정보의 수집 항목 및 방법",
    content: "서비스는 다음과 같은 개인정보를 수집합니다.",
    table: [
      ["이메일 가입", "이메일, 비밀번호(암호화), 닉네임(선택)"],
      ["카카오 로그인", "카카오 고유 ID, 이메일(선택), 닉네임"],
      ["네이버 로그인", "네이버 고유 ID, 이메일(선택), 닉네임"],
      ["결제 시", "결제 ID, 결제 금액, 결제 수단 (카드번호 등 민감 정보는 수집하지 않습니다)"],
    ],
  },
  {
    title: "2. 개인정보의 수집 및 이용 목적",
    items: [
      "회원 식별 및 서비스 이용 관리",
      "렌더링 크레딧 관리 및 결제 처리",
      "서비스 이용 기록 관리 (렌더링 횟수, 이용 내역)",
      "고객 문의 대응 및 서비스 개선",
    ],
  },
  {
    title: "3. 개인정보의 보유 및 이용 기간",
    items: [
      "회원 탈퇴 시까지 보유하며, 탈퇴 요청 시 지체 없이 파기합니다.",
      "관련 법령에 의한 보존 의무가 있는 경우 해당 기간 동안 보관합니다.",
      "전자상거래법에 따른 결제 기록: 5년",
      "전자상거래법에 따른 소비자 불만 처리 기록: 3년",
    ],
  },
  {
    title: "4. 개인정보의 제3자 제공",
    content: "서비스는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 다만, 결제 처리를 위해 PortOne(포트원) 결제 서비스에 필요 최소한의 정보가 전달됩니다.",
  },
  {
    title: "5. 개인정보의 파기",
    items: [
      "보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다.",
      "전자적 파일은 복구 불가능한 방법으로 삭제합니다.",
    ],
  },
  {
    title: "6. 업로드 영상의 처리",
    items: [
      "이용자가 업로드한 게임 녹화 영상은 편집점 분석 및 클립 추출 목적으로만 사용됩니다.",
      "처리 완료 후 서버에서 자동 삭제되며, 장기 보관하지 않습니다.",
      "생성된 편집 영상은 이용자의 브라우저에서 렌더링되며 서버에 저장되지 않습니다.",
    ],
  },
  {
    title: "7. 개인정보 보호 조치",
    items: [
      "비밀번호는 단방향 암호화(scrypt)하여 저장합니다.",
      "세션 토큰은 HttpOnly, Secure 쿠키로 관리합니다.",
      "데이터베이스 통신은 SSL 암호화를 적용합니다.",
    ],
  },
  {
    title: "8. 이용자의 권리",
    content: "이용자는 언제든지 자신의 개인정보에 대한 열람, 수정, 삭제를 요청할 수 있습니다. 마이페이지에서 닉네임 변경이 가능하며, 계정 삭제를 원하시면 고객센터로 문의해 주세요.",
  },
  {
    title: "9. 쿠키의 사용",
    content: "서비스는 로그인 세션 유지를 위해 쿠키를 사용합니다. 이용자는 브라우저 설정을 통해 쿠키를 거부할 수 있으나, 이 경우 로그인이 필요한 서비스 이용에 제한이 있을 수 있습니다.",
  },
  {
    title: "10. 개인정보 보호 책임자",
    content: "개인정보 관련 문의 사항이 있으시면 문의 페이지를 통해 연락해 주세요.",
  },
  {
    title: "부칙",
    content: "이 개인정보처리방침은 2024년 1월 1일부터 시행합니다.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      {/* Sticky Header */}
      <header
        className="sticky top-0 z-30 px-4 py-3"
        style={{ background: "var(--bg-glass)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold" style={{ color: "var(--accent)" }}>
            클립AI
          </Link>
          <Link
            href="/studio"
            className="text-sm px-4 py-2 rounded-lg font-medium"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            스튜디오
          </Link>
        </div>
      </header>

      <div className="px-4 py-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">개인정보처리방침</h1>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
          {SECTIONS.map((section) => (
            <section key={section.title} className="card">
              <h2 className="font-semibold mb-3" style={{ color: "var(--fg)" }}>{section.title}</h2>
              {section.content && <p>{section.content}</p>}
              {section.table && (
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <th className="text-left py-2 font-semibold" style={{ color: "var(--fg)" }}>구분</th>
                        <th className="text-left py-2 font-semibold" style={{ color: "var(--fg)" }}>수집 항목</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.map(([cat, items]) => (
                        <tr key={cat} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td className="py-2">{cat}</td>
                          <td className="py-2">{items}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {section.items && (
                <ol className="list-decimal pl-5 space-y-1 mt-2">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 pb-20 sm:pb-8">
        <div className="max-w-3xl mx-auto text-center text-xs" style={{ color: "var(--fg-muted)" }}>
          <div className="flex justify-center gap-4 mb-3">
            <Link href="/terms" className="hover:underline">이용약관</Link>
            <Link href="/contact" className="hover:underline">문의하기</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} 클립AI. All rights reserved.</p>
        </div>
      </footer>

      <nav className="mobile-bottom-nav">
        <Link href="/"><span className="text-base">🏠</span><span>홈</span></Link>
        <Link href="/studio"><span className="text-base">🎬</span><span>스튜디오</span></Link>
        <Link href="/gallery"><span className="text-base">🖼️</span><span>갤러리</span></Link>
        <Link href="/pricing"><span className="text-base">💰</span><span>요금제</span></Link>
      </nav>
    </main>
  );
}
