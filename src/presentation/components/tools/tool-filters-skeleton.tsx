import { Skeleton } from "@/src/presentation/components/shared/skeleton";

export function ToolFiltersSkeleton() {
  return (
    <div className="mb-8 flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1 basis-64">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="mt-1.5 h-10 w-full rounded-lg" />
      </div>
      <div>
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="mt-1.5 h-10 w-44 rounded-lg" />
      </div>
      <div>
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="mt-1.5 h-10 w-40 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-20 rounded-lg" />
    </div>
  );
}
