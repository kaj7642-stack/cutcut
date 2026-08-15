export default function PrivacyLoading() {
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
          <div className="skeleton mx-auto mb-3" style={{ width: "220px", height: "32px" }} />
          <div className="skeleton mx-auto" style={{ width: "180px", height: "16px" }} />
        </div>

        {/* Table of contents skeleton */}
        <div className="card mb-8">
          <div className="skeleton mb-3" style={{ width: "80px", height: "18px" }} />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="skeleton" style={{ width: `${100 + (i % 3) * 30}px`, height: "14px" }} />
            ))}
          </div>
        </div>

        {/* Content sections */}
        <div className="space-y-8">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="card">
              <div className="skeleton mb-4" style={{ width: `${140 + i * 15}px`, height: "20px" }} />
              <div className="space-y-2">
                <div className="skeleton" style={{ width: "100%", height: "14px" }} />
                <div className="skeleton" style={{ width: "93%", height: "14px" }} />
                <div className="skeleton" style={{ width: "85%", height: "14px" }} />
                {i < 3 && (
                  <>
                    <div className="skeleton" style={{ width: "90%", height: "14px" }} />
                    <div className="skeleton" style={{ width: "78%", height: "14px" }} />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
