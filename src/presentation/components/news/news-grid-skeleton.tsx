import { SkeletonStatus } from "@/src/presentation/components/shared/skeleton";
import { NewsCardSkeleton } from "@/src/presentation/components/news/news-card-skeleton";

export function NewsGridSkeleton({
  count = 6,
  label,
}: {
  count?: number;
  label: string;
}) {
  return (
    <SkeletonStatus label={label}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, index) => (
          <NewsCardSkeleton key={index} />
        ))}
      </div>
    </SkeletonStatus>
  );
}
