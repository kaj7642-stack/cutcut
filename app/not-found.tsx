import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-7xl mb-6">🎮</div>
          <h1 className="text-5xl font-extrabold mb-3" style={{ color: "var(--accent)" }}>404</h1>
          <p className="text-lg mb-2 font-semibold">페이지를 찾을 수 없습니다</p>
          <p className="text-sm mb-8" style={{ color: "var(--fg-muted)" }}>
            요청하신 페이지가 존재하지 않거나 이동되었습니다.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/" className="btn-primary">
              홈으로
            </Link>
            <Link href="/studio" className="btn-ghost">
              스튜디오
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav">
        <a href="/">
          <span className="text-base">🏠</span>
          <span>홈</span>
        </a>
        <a href="/studio">
          <span className="text-base">🎬</span>
          <span>스튜디오</span>
        </a>
        <a href="/gallery">
          <span className="text-base">🖼️</span>
          <span>갤러리</span>
        </a>
        <a href="/pricing">
          <span className="text-base">💰</span>
          <span>요금제</span>
        </a>
      </nav>
    </main>
  );
}
