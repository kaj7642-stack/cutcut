import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🎮</div>
        <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--accent)" }}>404</h1>
        <p className="text-lg mb-8" style={{ color: "var(--fg-muted)" }}>
          페이지를 찾을 수 없습니다
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/" className="btn-primary">
            홈으로
          </Link>
          <Link href="/studio" className="btn-ghost">
            스튜디오
          </Link>
        </div>
      </div>
    </main>
  );
}
