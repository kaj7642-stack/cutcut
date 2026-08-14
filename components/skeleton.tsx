export function Skeleton({ width, height, rounded = "8px", className = "" }: {
  width?: string;
  height?: string;
  rounded?: string;
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{
        background: "var(--bg-card)",
        borderRadius: rounded,
        width: width ?? "100%",
        height: height ?? "20px",
      }}
    />
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card space-y-3">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === 0 ? "60%" : i === lines - 1 ? "40%" : "80%"} height="16px" />
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="card text-center space-y-2 py-4">
      <Skeleton width="60px" height="36px" className="mx-auto" />
      <Skeleton width="80px" height="14px" className="mx-auto" />
    </div>
  );
}
