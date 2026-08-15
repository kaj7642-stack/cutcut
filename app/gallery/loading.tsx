export default function GalleryLoading() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div
          className="h-7 w-16 rounded-lg animate-pulse"
          style={{ background: "var(--bg-card)" }}
        />
        <div
          className="h-9 w-28 rounded-lg animate-pulse"
          style={{ background: "var(--bg-card)" }}
        />
      </div>

      {/* Title skeleton */}
      <div className="text-center mb-12">
        <div
          className="h-10 w-80 rounded mx-auto mb-3 animate-pulse"
          style={{ background: "var(--bg-card)" }}
        />
        <div
          className="h-5 w-64 rounded mx-auto animate-pulse"
          style={{ background: "var(--bg-card)" }}
        />
      </div>

      {/* Filter skeleton */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-9 w-24 rounded-full animate-pulse"
            style={{ background: "var(--bg-card)" }}
          />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden animate-pulse"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div
              className="aspect-video"
              style={{ background: "var(--border)" }}
            />
            <div className="p-4">
              <div
                className="h-5 w-3/4 rounded mb-2"
                style={{ background: "var(--border)" }}
              />
              <div
                className="h-4 w-full rounded mb-1"
                style={{ background: "var(--border)" }}
              />
              <div
                className="h-4 w-2/3 rounded"
                style={{ background: "var(--border)" }}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
