import { Skeleton } from "@/src/presentation/components/shared/skeleton";
import { getDictionary } from "@/src/lib/i18n";

export default async function RootLoading() {
  const dict = await getDictionary();

  return (
    <div
      className="flex flex-1 items-center justify-center px-6 py-24"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{dict.common.loading}</span>
      <div aria-hidden="true" className="w-full max-w-xs space-y-3">
        <Skeleton className="h-4 w-1/3 rounded-md" />
        <Skeleton className="h-3 w-full rounded-md" />
        <Skeleton className="h-3 w-4/5 rounded-md" />
      </div>
    </div>
  );
}
