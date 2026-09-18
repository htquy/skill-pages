import type { SkillCardViewModel } from "@/src/presentation/view-models/skill";
import { SkillCard } from "@/src/presentation/components/skill/skill-card";

export function SkillGrid({ skills }: { skills: SkillCardViewModel[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {skills.map((skill) => (
        <SkillCard key={skill.slug} skill={skill} />
      ))}
    </div>
  );
}