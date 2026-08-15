export default function LoginLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-6 animate-pulse">
        <div className="text-center">
          <div className="h-8 w-20 rounded-lg mx-auto" style={{ background: "var(--bg-card)" }} />
          <div className="h-6 w-48 rounded-lg mx-auto mt-4" style={{ background: "var(--bg-card)" }} />
          <div className="h-4 w-64 rounded-lg mx-auto mt-2" style={{ background: "var(--bg-card)" }} />
        </div>
        <div className="flex flex-col gap-3">
          <div className="h-12 rounded-xl" style={{ background: "var(--bg-card)" }} />
          <div className="h-12 rounded-xl" style={{ background: "var(--bg-card)" }} />
        </div>
        <div className="h-px" style={{ background: "var(--border)" }} />
        <div className="flex flex-col gap-3">
          <div className="h-12 rounded-xl" style={{ background: "var(--bg-card)" }} />
          <div className="h-12 rounded-xl" style={{ background: "var(--bg-card)" }} />
          <div className="h-12 rounded-xl" style={{ background: "var(--bg-card)" }} />
        </div>
      </div>
    </main>
  );
}
