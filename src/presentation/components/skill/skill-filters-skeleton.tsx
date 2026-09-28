import { Skeleton } from "@/src/presentation/components/shared/skeleton";

function FilterField({ className, labelWidth }: { className?: string; labelWidth: string }) {
  return (
    <div className={className}>
      <Skeleton className={`h-3 ${labelWidth} rounded`} />
      <Skeleton className="mt-1.5 h-10 w-full rounded-lg" />
    </div>
  );
}

export function SkillFiltersSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <FilterField className="sm:col-span-2 lg:col-span-2" labelWidth="w-14" />
        <FilterField labelWidth="w-20" />
        <FilterField labelWidth="w-16" />
        <FilterField labelWidth="w-10" />
        <FilterField labelWidth="w-12" />
      </div>
      <div className="mt-3 flex items-center justify-end">
        <Skeleton className="h-10 w-20 rounded-lg" />
      </div>
    </div>
  );
}
