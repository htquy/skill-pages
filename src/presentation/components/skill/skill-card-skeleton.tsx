import { Bookmark, Eye, Star } from "lucide-react";
import { Skeleton } from "@/src/presentation/components/shared/skeleton";

export function SkillCardSkeleton({ showBuyButton = false }: { showBuyButton?: boolean }) {
  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>

        <div className="mt-4 space-y-0.5">
          <Skeleton className="h-[1.55rem] w-4/5 rounded-md" />
          <Skeleton className="h-[1.55rem] w-3/5 rounded-md" />
        </div>

        <div className="mt-2 space-y-0.5">
          <Skeleton className="h-[1.425rem] w-full rounded-md" />
          <Skeleton className="h-[1.425rem] w-11/12 rounded-md" />
        </div>

        <div className="mt-4 space-y-1.5">
          <Skeleton className="h-5 w-1/2 rounded-md" />
          <Skeleton className="h-5 w-2/3 rounded-md" />
          <Skeleton className="h-5 w-5/12 rounded-md" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
        <div className="flex items-center gap-1">
          <span className="flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, index) => (
              <Star key={index} className="skeleton size-3.5 fill-zinc-200 text-zinc-200" />
            ))}
          </span>
          <Skeleton className="h-4 w-8 rounded-md" />
          <Skeleton className="h-4 w-7 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <Bookmark className="skeleton size-4 fill-zinc-200 text-zinc-200" />
            <Skeleton className="h-4 w-6 rounded-md" />
          </span>
          <span className="flex items-center gap-1">
            <Eye className="skeleton size-4 fill-zinc-200 text-zinc-200" />
            <Skeleton className="h-4 w-6 rounded-md" />
          </span>
        </div>
      </div>

      {showBuyButton ? <Skeleton className="mt-4 h-[1.875rem] w-full rounded-lg" /> : null}
    </div>
  );
}
