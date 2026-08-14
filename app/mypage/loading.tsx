import { Skeleton, StatSkeleton, CardSkeleton } from "@/components/skeleton";

export default function MyPageLoading() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Skeleton width="80px" height="28px" />
        <div className="flex gap-2">
          <Skeleton width="70px" height="32px" rounded="8px" />
          <Skeleton width="70px" height="32px" rounded="8px" />
        </div>
      </div>
      <CardSkeleton lines={4} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
      <CardSkeleton lines={5} />
    </main>
  );
}
