import { Skeleton } from "@/src/presentation/components/shared/skeleton";

export function NewsFiltersSkeleton() {
  return (
    <div className="mb-8 flex items-end gap-3">
      <div>
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="mt-1.5 h-10 w-48 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-20 rounded-lg" />
    </div>
  );
}
