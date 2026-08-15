export default function ContactLoading() {
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
      {/* Title skeleton */}
      <div className="px-6 pt-16 pb-8 text-center animate-pulse">
        <div className="h-10 w-48 rounded-xl mx-auto mb-4" style={{ background: "var(--bg-card)" }} />
        <div className="h-5 w-72 rounded-lg mx-auto" style={{ background: "var(--bg-card)" }} />
      </div>
      {/* Form skeleton */}
      <div className="px-6 max-w-xl mx-auto animate-pulse">
        <div className="card">
          {/* Category chips */}
          <div className="flex gap-2 mb-6">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-9 w-20 rounded-full" style={{ background: "var(--bg-card-hover)" }} />
            ))}
          </div>
          {/* Textarea */}
          <div className="h-40 rounded-xl mb-4" style={{ background: "var(--bg-card-hover)" }} />
          {/* Email input */}
          <div className="h-12 rounded-xl mb-4" style={{ background: "var(--bg-card-hover)" }} />
          {/* Submit button */}
          <div className="h-12 rounded-xl" style={{ background: "var(--bg-card-hover)" }} />
        </div>
      </div>
    </main>
  );
}
