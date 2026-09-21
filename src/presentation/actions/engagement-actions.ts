"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/infrastructure/authentication/authorization";
import { engagementCommands } from "@/src/infrastructure/composition";
import { toggleFavoriteSchema, type ToggleFavoriteInput } from "@/src/lib/validation";
import { ValidationError } from "@/src/domain/errors";
import type { CurrentUser } from "@/src/domain/identity/entities";
import { getDictionary } from "@/src/lib/i18n";

export async function toggleFavoriteAction(input: ToggleFavoriteInput) {
  const parsed = toggleFavoriteSchema.safeParse(input);
  if (!parsed.success) {
    const dict = await getDictionary();
    throw new ValidationError(dict.actions.invalidSkillReference);
  }

  const user: CurrentUser | null = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return engagementCommands.toggleFavorite(user.id, parsed.data.skillSlug);
}