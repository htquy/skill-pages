import { Skeleton } from "@/src/presentation/components/shared/skeleton";

export function SkillCardSkeleton({ showBuyButton = false }: { showBuyButton?: boolean }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-surface shadow-sm">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="flex flex-1 flex-col p-5">
        <Skeleton className="h-3 w-1/3 rounded-md" />
        <div className="mt-2.5 space-y-1">
          <Skeleton className="h-[1.55rem] w-4/5 rounded-md" />
          <Skeleton className="h-[1.55rem] w-3/5 rounded-md" />
        </div>
        <div className="mt-2.5 space-y-1">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-11/12 rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
        </div>
      </div>
      {showBuyButton ? <Skeleton className="mx-5 mb-5 h-[1.875rem] rounded-full" /> : null}
    </div>
  );
}
