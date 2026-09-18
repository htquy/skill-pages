export const dynamic = "force-dynamic";

import { Container } from "@/src/presentation/components/layout/container";
import { SkillGrid } from "@/src/presentation/components/skill/skill-grid";
import { EmptyState } from "@/src/presentation/components/shared/empty-state";
import { toSkillCardViewModel } from "@/src/presentation/view-models/skill";
import { accountQueries } from "@/src/infrastructure/composition";
import { requireUser } from "@/src/infrastructure/authentication/authorization";

export default async function SavedSkillsPage() {
  const user = await requireUser();
  const saved = await accountQueries.listSavedSkills(user);
  const cards = saved.map(toSkillCardViewModel);

  return (
    <Container className="py-12 md:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Saved skills
        </h1>
        <p className="mt-3 text-lg text-zinc-600">
          {saved.length > 0
            ? `${saved.length} ${saved.length === 1 ? "skill" : "skills"} in your library.`
            : "You haven't saved anything yet."}
        </p>
      </div>

      {cards.length > 0 ? (
        <SkillGrid skills={cards} />
      ) : (
        <EmptyState
          title="No saved skills yet"
          description="Browse the library and hit Save on anything you want to keep."
        />
      )}
    </Container>
  );
}