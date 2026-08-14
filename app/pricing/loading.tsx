import { Skeleton, CardSkeleton } from "@/components/skeleton";

export default function PricingLoading() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <Skeleton width="200px" height="32px" className="mx-auto mb-4" />
        <Skeleton width="300px" height="18px" className="mx-auto" />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
      </div>
    </main>
  );
}
