export default function ResetPasswordLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="h-8 w-24 mx-auto rounded-lg animate-pulse mb-4"
            style={{ background: "var(--bg-card)" }}
          />
          <div
            className="h-7 w-48 mx-auto rounded-lg animate-pulse mb-2"
            style={{ background: "var(--bg-card)" }}
          />
          <div
            className="h-4 w-64 mx-auto rounded-lg animate-pulse"
            style={{ background: "var(--bg-card)" }}
          />
        </div>

        {/* Form card */}
        <div className="card">
          {/* Email input */}
          <div className="mb-4">
            <div
              className="h-4 w-16 rounded animate-pulse mb-2"
              style={{ background: "var(--bg)" }}
            />
            <div
              className="h-11 w-full rounded-lg animate-pulse"
              style={{ background: "var(--bg)" }}
            />
          </div>

          {/* Submit button */}
          <div
            className="h-11 w-full rounded-lg animate-pulse"
            style={{ background: "var(--bg)" }}
          />
        </div>

        {/* Back to login link */}
        <div className="text-center mt-6">
          <div
            className="h-4 w-40 mx-auto rounded animate-pulse"
            style={{ background: "var(--bg-card)" }}
          />
        </div>
      </div>
    </main>
  );
}
