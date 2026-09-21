import { cn } from "@/src/lib/utils";
import { getDictionary } from "@/src/lib/i18n";
import type { SkillAccessType } from "@/src/domain/skill";

const CLASSES: Record<SkillAccessType, string> = {
  FREE: "bg-zinc-100 text-zinc-700 border border-zinc-200",
  PAID: "bg-indigo-50 text-indigo-700 border border-indigo-200",
};

export async function SkillBadge({ accessType }: { accessType: SkillAccessType }) {
  const dict = await getDictionary();
  const label = accessType === "FREE" ? dict.filters.free : dict.filters.pro;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        CLASSES[accessType],
      )}
    >
      {label}
    </span>
  );
}