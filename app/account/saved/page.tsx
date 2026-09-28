export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { Container } from "@/src/presentation/components/layout/container";
import { SkillGrid } from "@/src/presentation/components/skill/skill-grid";
import { SkillGridSkeleton } from "@/src/presentation/components/skill/skill-grid-skeleton";
import { EmptyState } from "@/src/presentation/components/shared/empty-state";
import { Skeleton } from "@/src/presentation/components/shared/skeleton";
import { toSkillCardViewModel, createOwnershipLookup } from "@/src/presentation/view-models/skill";
import { accountQueries, accessCommands } from "@/src/infrastructure/composition";
import { requireUser } from "@/src/infrastructure/authentication/authorization";
import type { CurrentUser } from "@/src/domain/identity/entities";
import { getDictionary, trans } from "@/src/lib/i18n";

async function SavedSkills({ user }: { user: CurrentUser }) {
  const [saved, ownedSkillIds] = await Promise.all([
    accountQueries.listSavedSkills(user),
    accessCommands.listOwnedSkillIds(user.id),
  ]);
  const isOwned = createOwnershipLookup(ownedSkillIds);
  const cards = saved.map((skill) => toSkillCardViewModel(skill, { isOwned: isOwned(skill.id) }));
  const dict = await getDictionary();

  const subtitle =
    saved.length > 0
      ? trans(saved.length === 1 ? dict.account.skillsInLibraryOne : dict.account.skillsInLibraryOther, {
          count: saved.length,
        })
      : dict.account.libraryEmpty;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {dict.account.savedSkills}
        </h1>
        <p className="mt-3 text-lg text-zinc-600">{subtitle}</p>
      </div>

      {cards.length > 0 ? (
        <SkillGrid skills={cards} />
      ) : (
        <EmptyState title={dict.account.emptyTitle} description={dict.account.emptyDescription} />
      )}
    </>
  );
}

function SavedSkillsSkeleton({ label }: { label: string }) {
  return (
    <>
      <div className="mb-8">
        <Skeleton className="h-9 w-64 rounded-md sm:h-12" />
        <Skeleton className="mt-3 h-7 w-80 max-w-full rounded-md" />
      </div>

      <SkillGridSkeleton count={6} label={label} />
    </>
  );
}

export default async function SavedSkillsPage() {
  const user = await requireUser();
  const dict = await getDictionary();

  return (
    <Container className="py-12 md:py-16">
      <Suspense fallback={<SavedSkillsSkeleton label={dict.common.loading} />}>
        <SavedSkills user={user} />
      </Suspense>
    </Container>
  );
}
