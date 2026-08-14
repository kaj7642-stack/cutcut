import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 — 클립AI",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <a href="/" className="text-xl font-bold" style={{ color: "var(--accent)" }}>
          클립AI
        </a>
      </div>

      <h1 className="text-3xl font-bold mb-8">이용약관</h1>

      <div className="space-y-8 text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>제1조 (목적)</h2>
          <p>
            이 약관은 클립AI(이하 &ldquo;서비스&rdquo;)가 제공하는 게임 하이라이트 자동 편집 서비스의 이용과 관련하여
            서비스와 이용자 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>제2조 (정의)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>&ldquo;서비스&rdquo;란 클립AI가 제공하는 영상 편집, 나레이션 생성, 렌더링 등 일체의 기능을 말합니다.</li>
            <li>&ldquo;이용자&rdquo;란 서비스에 접속하여 이 약관에 따라 서비스를 이용하는 자를 말합니다.</li>
            <li>&ldquo;크레딧&rdquo;이란 서비스 내 유료 기능(영상 렌더링)을 이용하기 위한 가상의 이용권을 말합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>제3조 (약관의 효력 및 변경)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
            <li>서비스는 합리적인 사유가 발생할 경우 관련 법령에 위배되지 않는 범위에서 약관을 변경할 수 있으며, 변경된 약관은 공지 후 효력이 발생합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>제4조 (서비스의 내용)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>게임 녹화 영상의 편집점 자동 감지</li>
            <li>AI 기반 나레이션 대본 생성</li>
            <li>TTS 음성 합성</li>
            <li>자막, 배경음악이 포함된 영상 렌더링</li>
            <li>쇼츠(세로) 및 롱폼(가로) 편집 지원</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>제5조 (이용 요금)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>서비스는 회원가입 후 무료 렌더링 3회를 제공합니다.</li>
            <li>무료 이용 횟수 소진 후에는 크레딧을 구매하여 렌더링 기능을 이용할 수 있습니다.</li>
            <li>크레딧은 구매 시점의 요금제에 명시된 금액으로 결제되며, 유효기간은 없습니다.</li>
            <li>결제는 PortOne 결제 서비스를 통해 처리됩니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>제6조 (환불 정책)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>미사용 크레딧에 한하여 구매일로부터 7일 이내 환불을 요청할 수 있습니다.</li>
            <li>일부 사용된 크레딧은 사용분을 제외한 나머지에 대해 환불이 가능합니다.</li>
            <li>환불 요청은 고객센터를 통해 접수해 주세요.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>제7조 (이용자의 의무)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>이용자는 본인이 권리를 가진 영상만 업로드해야 합니다.</li>
            <li>타인의 저작권을 침해하는 콘텐츠를 업로드할 경우 이용자가 모든 법적 책임을 부담합니다.</li>
            <li>서비스를 부정한 목적으로 이용하거나 타인에게 피해를 주는 행위를 해서는 안 됩니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>제8조 (서비스 이용 제한)</h2>
          <p>
            서비스는 다음 각 호에 해당하는 경우 이용자의 서비스 이용을 제한하거나 정지할 수 있습니다.
          </p>
          <ol className="list-decimal pl-5 space-y-1 mt-2">
            <li>타인의 개인정보나 계정을 도용한 경우</li>
            <li>서비스의 정상적 운영을 방해하는 경우</li>
            <li>불법적인 콘텐츠를 업로드하는 경우</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>제9조 (면책 사항)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>서비스는 AI 기반으로 생성된 콘텐츠의 정확성이나 적합성을 보장하지 않습니다.</li>
            <li>이용자가 서비스를 통해 생성한 콘텐츠의 저작권 및 사용 책임은 이용자에게 있습니다.</li>
            <li>천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--fg)" }}>부칙</h2>
          <p>이 약관은 2024년 1월 1일부터 시행합니다.</p>
        </section>
      </div>

      <div className="mt-12 text-center text-sm" style={{ color: "var(--fg-muted)" }}>
        <a href="/" style={{ color: "var(--accent)" }}>홈으로 돌아가기</a>
      </div>
    </main>
  );
}
