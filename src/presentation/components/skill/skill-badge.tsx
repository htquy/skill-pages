import { cn } from "@/src/lib/utils";
import type { SkillAccessType } from "@/src/domain/skill";

const LABELS: Record<SkillAccessType, { label: string; className: string }> = {
  FREE: {
    label: "FREE",
    className: "bg-zinc-100 text-zinc-700 border border-zinc-200",
  },
  PAID: {
    label: "PRO",
    className: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  },
};

export function SkillBadge({ accessType }: { accessType: SkillAccessType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        LABELS[accessType].className,
      )}
    >
      {LABELS[accessType].label}
    </span>
  );
}