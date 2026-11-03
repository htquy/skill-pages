import { cn } from "@/src/lib/utils";
import { getDictionary } from "@/src/lib/i18n";
import type { SkillAccessType } from "@/src/domain/skill";

const CLASSES: Record<SkillAccessType, string> = {
  FREE: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PAID: "bg-gradient-to-r from-spark-50 to-brand-50 text-spark-700 border border-spark-200",
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