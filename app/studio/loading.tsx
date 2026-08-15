export default function StudioLoading() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div
          className="h-7 w-16 rounded-lg animate-pulse"
          style={{ background: "var(--bg-card)" }}
        />
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-full animate-pulse"
            style={{ background: "var(--bg-card)" }}
          />
          <div
            className="h-8 w-36 rounded-full animate-pulse"
            style={{ background: "var(--bg-card)" }}
          />
          <div
            className="h-8 w-20 rounded-lg animate-pulse"
            style={{ background: "var(--bg-card)" }}
          />
        </div>
      </div>

      {/* Upload zone skeleton */}
      <div
        className="rounded-2xl p-12 text-center animate-pulse"
        style={{
          background: "var(--bg-card)",
          border: "2px dashed var(--border)",
        }}
      >
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4"
          style={{ background: "var(--border)" }}
        />
        <div
          className="h-6 w-64 rounded mx-auto mb-3"
          style={{ background: "var(--border)" }}
        />
        <div
          className="h-4 w-48 rounded mx-auto"
          style={{ background: "var(--border)" }}
        />
      </div>

      {/* Tips skeleton */}
      <div className="grid sm:grid-cols-3 gap-3 mt-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 rounded-xl animate-pulse"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div
              className="w-8 h-8 rounded-full shrink-0"
              style={{ background: "var(--border)" }}
            />
            <div
              className="h-4 flex-1 rounded"
              style={{ background: "var(--border)" }}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
