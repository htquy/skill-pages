import { cn } from "@/src/lib/utils";
import { getDictionary } from "@/src/lib/i18n";

const toneByStatus: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  INACTIVE: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DRAFT: "bg-amber-50 text-amber-700 ring-amber-200",
  ARCHIVED: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  BLOCKED: "bg-red-50 text-red-700 ring-red-200",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  EXPIRED: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  CANCELED: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  FAILED: "bg-red-50 text-red-700 ring-red-200",
  REFUNDED: "bg-sky-50 text-sky-700 ring-sky-200",
  FREE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PAID_SKILL: "bg-violet-50 text-violet-700 ring-violet-200",
};

export async function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const dict = await getDictionary();
  const tone = toneByStatus[status] ?? "bg-zinc-100 text-zinc-600 ring-zinc-200";
  const label = dict.status[status as keyof typeof dict.status] ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}

export function accessTypeLabel(accessType: string, dict: Awaited<ReturnType<typeof getDictionary>>): string {
  return accessType === "PAID" ? dict.status.PAID_SKILL : dict.status.FREE;
}