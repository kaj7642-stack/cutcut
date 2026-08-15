export default function PricingLoading() {
  return (
    <main className="min-h-screen">
      {/* Header skeleton */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div
            className="h-7 w-16 rounded-lg animate-pulse"
            style={{ background: "var(--bg-card)" }}
          />
          <div
            className="h-8 w-20 rounded-lg animate-pulse"
            style={{ background: "var(--bg-card)" }}
          />
        </div>
      </div>

      {/* Hero skeleton */}
      <div className="px-4 pt-16 pb-12">
        <div className="max-w-5xl mx-auto text-center">
          <div
            className="h-6 w-48 rounded-full mx-auto mb-6 animate-pulse"
            style={{ background: "var(--bg-card)" }}
          />
          <div
            className="h-12 w-96 max-w-full rounded mx-auto mb-4 animate-pulse"
            style={{ background: "var(--bg-card)" }}
          />
          <div
            className="h-5 w-80 max-w-full rounded mx-auto animate-pulse"
            style={{ background: "var(--bg-card)" }}
          />
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="px-4 mb-16">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-8 animate-pulse"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div
                className="h-8 w-24 rounded mx-auto mb-3"
                style={{ background: "var(--border)" }}
              />
              <div
                className="h-12 w-32 rounded mx-auto mb-3"
                style={{ background: "var(--border)" }}
              />
              <div
                className="h-5 w-20 rounded-full mx-auto mb-6"
                style={{ background: "var(--border)" }}
              />
              <div className="space-y-2 mb-6">
                {[1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className="h-4 w-full rounded"
                    style={{ background: "var(--border)" }}
                  />
                ))}
              </div>
              <div
                className="h-12 w-full rounded-xl mb-2"
                style={{ background: "var(--border)" }}
              />
              <div
                className="h-12 w-full rounded-xl"
                style={{ background: "var(--border)" }}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
