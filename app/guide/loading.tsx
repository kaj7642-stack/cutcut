export default function GuideLoading() {
  return (
    <main className="min-h-screen">
      {/* Header skeleton */}
      <div className="sticky top-0 z-40 animate-pulse" style={{ background: "var(--bg-glass)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
          <div className="h-7 w-16 rounded-lg" style={{ background: "var(--bg-card)" }} />
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-lg" style={{ background: "var(--bg-card)" }} />
          </div>
        </div>
      </div>
      {/* Hero skeleton */}
      <div className="px-6 pt-16 pb-12 text-center animate-pulse">
        <div className="h-10 w-56 rounded-xl mx-auto mb-4" style={{ background: "var(--bg-card)" }} />
        <div className="h-5 w-80 rounded-lg mx-auto" style={{ background: "var(--bg-card)" }} />
      </div>
      {/* Steps skeleton */}
      <div className="px-6 max-w-3xl mx-auto animate-pulse">
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="card">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full shrink-0" style={{ background: "var(--bg-card-hover)" }} />
                <div className="flex-1">
                  <div className="h-5 w-40 rounded-lg mb-2" style={{ background: "var(--bg-card-hover)" }} />
                  <div className="h-4 w-full rounded-lg" style={{ background: "var(--bg-card-hover)" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
