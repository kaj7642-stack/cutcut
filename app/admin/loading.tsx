export default function AdminLoading() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-4 py-3"
        style={{ background: "var(--bg-glass)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="h-7 w-20 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
          <div className="h-8 w-24 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
        </div>
      </header>

      <div className="px-4 py-8 max-w-6xl mx-auto">
        {/* Title */}
        <div className="h-8 w-48 rounded-lg animate-pulse mb-6" style={{ background: "var(--bg-card)" }} />

        {/* Tab bar */}
        <div className="flex gap-2 mb-8">
          {[80, 64, 72].map((w, i) => (
            <div
              key={i}
              className="h-9 rounded-lg animate-pulse"
              style={{ background: "var(--bg-card)", width: `${w}px` }}
            />
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card text-center">
              <div className="h-8 w-16 mx-auto rounded animate-pulse mb-2" style={{ background: "var(--bg)" }} />
              <div className="h-4 w-20 mx-auto rounded animate-pulse" style={{ background: "var(--bg)" }} />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="card">
          <div className="h-5 w-32 rounded animate-pulse mb-4" style={{ background: "var(--bg)" }} />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full animate-pulse" style={{ background: "var(--bg)" }} />
                  <div>
                    <div className="h-4 w-32 rounded animate-pulse mb-1" style={{ background: "var(--bg)" }} />
                    <div className="h-3 w-48 rounded animate-pulse" style={{ background: "var(--bg)" }} />
                  </div>
                </div>
                <div className="h-4 w-16 rounded animate-pulse" style={{ background: "var(--bg)" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
