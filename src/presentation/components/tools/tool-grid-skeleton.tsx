import { SkeletonStatus } from "@/src/presentation/components/shared/skeleton";
import { ToolCardSkeleton } from "@/src/presentation/components/tools/tool-card-skeleton";

export function ToolGridSkeleton({ count = 6, label }: { count?: number; label: string }) {
  return (
    <SkeletonStatus label={label}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, index) => (
          <ToolCardSkeleton key={index} />
        ))}
      </div>
    </SkeletonStatus>
  );
}
