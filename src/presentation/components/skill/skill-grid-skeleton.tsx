import { SkeletonStatus } from "@/src/presentation/components/shared/skeleton";
import { SkillCardSkeleton } from "@/src/presentation/components/skill/skill-card-skeleton";

export function SkillGridSkeleton({
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
          <SkillCardSkeleton key={index} showBuyButton={index % 2 === 1} />
        ))}
      </div>
    </SkeletonStatus>
  );
}
