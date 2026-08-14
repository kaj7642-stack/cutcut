import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 — 클립AI",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <a href="/" className="text-xl font-bold" style={{ color: "var(--accent)" }}>
          클립AI
        </a>
      </div>

      <h1 className="text-3xl font-bold mb-8">개인정보처리방침</h1>

      <div className="space-y-8 text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>1. 개인정보의 수집 항목 및 방법</h2>
          <p className="mb-3">서비스는 다음과 같은 개인정보를 수집합니다.</p>
          <div className="card" style={{ padding: "16px" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 font-semibold" style={{ color: "var(--fg)" }}>구분</th>
                  <th className="text-left py-2 font-semibold" style={{ color: "var(--fg)" }}>수집 항목</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2">이메일 가입</td>
                  <td className="py-2">이메일, 비밀번호(암호화), 닉네임(선택)</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2">카카오 로그인</td>
                  <td className="py-2">카카오 고유 ID, 이메일(선택), 닉네임</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2">네이버 로그인</td>
                  <td className="py-2">네이버 고유 ID, 이메일(선택), 닉네임</td>
                </tr>
                <tr>
                  <td className="py-2">결제 시</td>
                  <td className="py-2">결제 ID, 결제 금액, 결제 수단 (카드번호 등 민감 정보는 수집하지 않습니다)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>2. 개인정보의 수집 및 이용 목적</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원 식별 및 서비스 이용 관리</li>
            <li>렌더링 크레딧 관리 및 결제 처리</li>
            <li>서비스 이용 기록 관리 (렌더링 횟수, 이용 내역)</li>
            <li>고객 문의 대응 및 서비스 개선</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>3. 개인정보의 보유 및 이용 기간</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원 탈퇴 시까지 보유하며, 탈퇴 요청 시 지체 없이 파기합니다.</li>
            <li>관련 법령에 의한 보존 의무가 있는 경우 해당 기간 동안 보관합니다.</li>
            <li>전자상거래법에 따른 결제 기록: 5년</li>
            <li>전자상거래법에 따른 소비자 불만 처리 기록: 3년</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>4. 개인정보의 제3자 제공</h2>
          <p>
            서비스는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다.
            다만, 결제 처리를 위해 PortOne(포트원) 결제 서비스에 필요 최소한의 정보가 전달됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>5. 개인정보의 파기</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다.</li>
            <li>전자적 파일은 복구 불가능한 방법으로 삭제합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>6. 업로드 영상의 처리</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>이용자가 업로드한 게임 녹화 영상은 편집점 분석 및 클립 추출 목적으로만 사용됩니다.</li>
            <li>처리 완료 후 서버에서 자동 삭제되며, 장기 보관하지 않습니다.</li>
            <li>생성된 편집 영상은 이용자의 브라우저에서 렌더링되며 서버에 저장되지 않습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>7. 개인정보 보호 조치</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>비밀번호는 단방향 암호화(scrypt)하여 저장합니다.</li>
            <li>세션 토큰은 HttpOnly, Secure 쿠키로 관리합니다.</li>
            <li>데이터베이스 통신은 SSL 암호화를 적용합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>8. 이용자의 권리</h2>
          <p>
            이용자는 언제든지 자신의 개인정보에 대한 열람, 수정, 삭제를 요청할 수 있습니다.
            마이페이지에서 닉네임 변경이 가능하며, 계정 삭제를 원하시면 고객센터로 문의해 주세요.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>9. 쿠키의 사용</h2>
          <p>
            서비스는 로그인 세션 유지를 위해 쿠키를 사용합니다.
            이용자는 브라우저 설정을 통해 쿠키를 거부할 수 있으나,
            이 경우 로그인이 필요한 서비스 이용에 제한이 있을 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>10. 개인정보 보호 책임자</h2>
          <p>
            개인정보 관련 문의 사항이 있으시면 아래 연락처로 문의해 주세요.
          </p>
          <p className="mt-2">이메일: support@clipai.kr</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>부칙</h2>
          <p>이 개인정보처리방침은 2024년 1월 1일부터 시행합니다.</p>
        </section>
      </div>

      <div className="mt-12 text-center text-sm" style={{ color: "var(--fg-muted)" }}>
        <a href="/" style={{ color: "var(--accent)" }}>홈으로 돌아가기</a>
      </div>
    </main>
  );
}
