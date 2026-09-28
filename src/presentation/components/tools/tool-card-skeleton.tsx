import { Skeleton } from "@/src/presentation/components/shared/skeleton";

export function ToolCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>

        <div className="mt-3 space-y-0.5">
          <Skeleton className="h-[1.375rem] w-11/12 rounded-md" />
          <Skeleton className="h-[1.375rem] w-3/5 rounded-md" />
        </div>

        <div className="mt-2 space-y-0.5">
          <Skeleton className="h-[1.425rem] w-full rounded-md" />
          <Skeleton className="h-[1.425rem] w-10/12 rounded-md" />
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}
