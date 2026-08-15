export default function HomeLoading() {
  return (
    <main className="min-h-screen">
      {/* Nav skeleton */}
      <nav
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 max-w-5xl mx-auto"
        style={{ background: "var(--bg-glass)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        <div className="skeleton" style={{ width: "80px", height: "24px" }} />
        <div className="flex gap-2">
          <div className="skeleton" style={{ width: "64px", height: "32px", borderRadius: "8px" }} />
          <div className="skeleton" style={{ width: "76px", height: "32px", borderRadius: "8px" }} />
        </div>
      </nav>

      {/* Hero skeleton */}
      <section className="flex flex-col items-center justify-center px-6 pt-20 pb-8 text-center">
        <div className="skeleton mx-auto mb-6" style={{ width: "240px", height: "32px", borderRadius: "9999px" }} />
        <div className="skeleton mx-auto mb-3" style={{ width: "360px", maxWidth: "90%", height: "48px" }} />
        <div className="skeleton mx-auto mb-6" style={{ width: "280px", maxWidth: "80%", height: "48px" }} />
        <div className="skeleton mx-auto mb-10" style={{ width: "320px", maxWidth: "85%", height: "20px" }} />
        <div className="flex gap-4 justify-center mb-16">
          <div className="skeleton" style={{ width: "140px", height: "44px", borderRadius: "12px" }} />
          <div className="skeleton" style={{ width: "140px", height: "44px", borderRadius: "12px" }} />
        </div>
      </section>

      {/* Mockup skeleton */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="skeleton" style={{ width: "100%", height: "300px", borderRadius: "16px" }} />
      </div>

      {/* Features skeleton */}
      <section className="px-6 py-20" style={{ background: "var(--bg-card)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="skeleton mx-auto mb-4" style={{ width: "200px", height: "32px" }} />
          <div className="skeleton mx-auto mb-12" style={{ width: "180px", height: "16px" }} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="card text-center">
                <div className="skeleton mx-auto mb-3" style={{ width: "40px", height: "40px", borderRadius: "50%" }} />
                <div className="skeleton mx-auto mb-2" style={{ width: "100px", height: "18px" }} />
                <div className="skeleton mx-auto" style={{ width: "140px", height: "14px" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps skeleton */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <div className="skeleton mx-auto mb-4" style={{ width: "200px", height: "32px" }} />
        <div className="skeleton mx-auto mb-12" style={{ width: "260px", height: "16px" }} />
        <div className="grid grid-cols-5 gap-4 hidden sm:grid">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="skeleton mb-3" style={{ width: "44px", height: "44px", borderRadius: "50%" }} />
              <div className="skeleton mb-1" style={{ width: "24px", height: "14px" }} />
              <div className="skeleton mb-1" style={{ width: "64px", height: "16px" }} />
              <div className="skeleton" style={{ width: "80px", height: "12px" }} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
