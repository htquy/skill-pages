import { ArrowRight, Clock } from "lucide-react";
import { Skeleton } from "@/src/presentation/components/shared/skeleton";

export function FeaturedNewsCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm md:flex-row">
      <Skeleton className="aspect-[16/9] w-full rounded-none md:aspect-auto md:w-1/2" />

      <div className="flex flex-1 flex-col justify-center p-6 md:p-10">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>

        <div className="mt-4 space-y-1">
          <Skeleton className="h-8 w-4/5 rounded-md md:h-[2.35rem]" />
          <Skeleton className="h-8 w-2/3 rounded-md md:h-[2.35rem]" />
        </div>

        <div className="mt-3 space-y-0.5">
          <Skeleton className="h-[1.625rem] w-full rounded-md" />
          <Skeleton className="h-[1.625rem] w-4/5 rounded-md" />
        </div>

        <div className="mt-6 flex items-center gap-4">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
          <span className="flex items-center gap-1">
            <Clock className="skeleton size-4 fill-zinc-200 text-zinc-200" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </span>
        </div>

        <div className="mt-6 flex items-center gap-1.5">
          <Skeleton className="h-4 w-28 rounded-md" />
          <ArrowRight className="skeleton size-4 fill-zinc-200 text-zinc-200" />
        </div>
      </div>
    </div>
  );
}
