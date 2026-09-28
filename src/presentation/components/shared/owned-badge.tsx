import { BadgeCheck } from "lucide-react";
import type { Dict } from "@/src/lib/i18n/config";
import { cn } from "@/src/lib/utils";

export function OwnedBadge({
  dict,
  variant = "card",
}: {
  dict: Dict;
  variant?: "card" | "detail";
}) {
  const label = dict.skillCard.owned;
  return (
    <span
      title={dict.skillCard.ownedAria}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100",
        variant === "card" ? "px-2.5 py-0.5 text-xs" : "w-full justify-center px-4 py-3 text-sm",
      )}
    >
      <BadgeCheck className={variant === "card" ? "size-3.5" : "size-4"} aria-hidden="true" />
      {label}
    </span>
  );
}
