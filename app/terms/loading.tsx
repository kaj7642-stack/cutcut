export default function TermsLoading() {
  return (
    <main className="min-h-screen">
      {/* Header skeleton */}
      <nav
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 max-w-4xl mx-auto"
        style={{ background: "var(--bg-glass)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        <div className="skeleton" style={{ width: "80px", height: "24px" }} />
        <div className="flex gap-3">
          <div className="skeleton" style={{ width: "60px", height: "32px", borderRadius: "8px" }} />
          <div className="skeleton" style={{ width: "70px", height: "32px", borderRadius: "8px" }} />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="skeleton mx-auto mb-3" style={{ width: "200px", height: "32px" }} />
          <div className="skeleton mx-auto" style={{ width: "160px", height: "16px" }} />
        </div>

        {/* Content sections */}
        <div className="space-y-8">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="card">
              <div className="skeleton mb-4" style={{ width: `${120 + i * 20}px`, height: "20px" }} />
              <div className="space-y-2">
                <div className="skeleton" style={{ width: "100%", height: "14px" }} />
                <div className="skeleton" style={{ width: "95%", height: "14px" }} />
                <div className="skeleton" style={{ width: "88%", height: "14px" }} />
                {i % 2 === 0 && <div className="skeleton" style={{ width: "72%", height: "14px" }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
