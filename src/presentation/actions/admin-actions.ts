"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import {
  articleAdminCommands,
  rankingAdminCommands,
  skillAdminCommands,
  userCommands,
} from "@/src/infrastructure/composition";
import { ValidationError } from "@/src/domain/errors";
import type { UserRole } from "@/src/domain/identity/entities";
import type { SaveSkillData } from "@/src/domain/skill";
import type { SaveArticleData } from "@/src/domain/news/admin";
import type { SaveRankingData } from "@/src/domain/ranking/admin";
import { getDictionary } from "@/src/lib/i18n";
import type { Dict } from "@/src/lib/i18n/config";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "");
}

function optionalString(fd: FormData, key: string): string | undefined {
  const value = fd.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalDate(fd: FormData, key: string): Date | null {
  const value = optionalString(fd, key);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/skills");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/rankings");
  revalidatePath("/admin/users");
  revalidatePath("/admin/orders");
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

function parseSkillForm(fd: FormData, dict: Dict): SaveSkillData {
  const accessType = str(fd, "accessType") === "PAID" ? "PAID" : "FREE";

  let variables: Record<string, unknown> | null = null;
  const variablesRaw = optionalString(fd, "variablesJson");
  if (variablesRaw) {
    try {
      const parsed = JSON.parse(variablesRaw) as unknown;
      if (parsed === null || typeof parsed !== "object") {
        throw new Error("not an object");
      }
      variables = parsed as Record<string, unknown>;
    } catch {
      throw new ValidationError(dict.actions.skillJsonInvalid);
    }
  }

  const title = str(fd, "title").trim();
  const shortDescription = str(fd, "shortDescription").trim();
  const description = str(fd, "description").trim();
  const content = str(fd, "content").trim();
  if (!title) throw new ValidationError(dict.actions.skillTitleRequired);
  if (!shortDescription) throw new ValidationError(dict.actions.skillShortDescriptionRequired);
  if (!description) throw new ValidationError(dict.actions.skillDescriptionRequired);
  if (!content) throw new ValidationError(dict.actions.skillContentRequired);

  let price: { currency: string; amount: number } | null = null;
  if (accessType === "PAID") {
    const priceAmountMajor = Number(fd.get("priceAmount") ?? "0");
    const currency = optionalString(fd, "priceCurrency") ?? "USD";
    if (!Number.isFinite(priceAmountMajor) || priceAmountMajor < 0) {
      throw new ValidationError(dict.actions.skillPriceInvalid);
    }
    if (priceAmountMajor > 0) {
      price = { currency, amount: Math.round(priceAmountMajor * 100) };
    }
  }

  return {
    title,
    slug: optionalString(fd, "slug") ?? "",
    shortDescription,
    description,
    accessType,
    coverImageUrl: optionalString(fd, "coverImageUrl") ?? null,
    price,
    content,
    instructions: optionalString(fd, "instructions") ?? null,
    variables,
    changelog: optionalString(fd, "changelog") ?? null,
    industrySlugs: fd.getAll("industrySlug").map(String),
    categorySlugs: fd.getAll("categorySlug").map(String),
    useCaseSlugs: fd.getAll("useCaseSlug").map(String),
    toolSlugs: fd.getAll("toolSlug").map(String),
  };
}

export async function createSkillAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = await skillAdminCommands.create(admin, parseSkillForm(fd, await getDictionary()));
  revalidateAdmin();
  redirect(`/admin/skills/${id}`);
}

export async function updateSkillAction(id: string, fd: FormData) {
  const admin = await requireAdmin();
  await skillAdminCommands.update(admin, id, parseSkillForm(fd, await getDictionary()));
  revalidateAdmin();
  redirect(`/admin/skills/${id}`);
}

export async function deleteSkillAction(id: string) {
  const admin = await requireAdmin();
  await skillAdminCommands.remove(admin, id);
  revalidateAdmin();
  redirect("/admin/skills");
}

export async function publishSkillAction(id: string) {
  const admin = await requireAdmin();
  await skillAdminCommands.publish(admin, id);
  revalidateAdmin();
  redirect(`/admin/skills/${id}`);
}

export async function unpublishSkillAction(id: string) {
  const admin = await requireAdmin();
  await skillAdminCommands.unpublish(admin, id);
  revalidateAdmin();
  redirect(`/admin/skills/${id}`);
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

function parseArticleForm(fd: FormData, dict: Dict): SaveArticleData {
  const title = str(fd, "title").trim();
  const content = str(fd, "content").trim();
  const sourceName = str(fd, "sourceName").trim();
  if (!title) throw new ValidationError(dict.actions.articleTitleRequired);
  if (!content) throw new ValidationError(dict.actions.articleContentRequired);
  if (!sourceName) throw new ValidationError(dict.actions.articleSourceRequired);

  return {
    title,
    slug: optionalString(fd, "slug") ?? "",
    excerpt: optionalString(fd, "excerpt") ?? null,
    content,
    coverImageUrl: optionalString(fd, "coverImageUrl") ?? null,
    sourceName,
    sourceUrl: optionalString(fd, "sourceUrl") ?? null,
    categorySlug: optionalString(fd, "categorySlug") ?? null,
    toolSlugs: fd.getAll("toolSlug").map(String),
    publish: fd.get("publish") === "1",
  };
}

export async function createArticleAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = await articleAdminCommands.create(admin, parseArticleForm(fd, await getDictionary()));
  revalidateAdmin();
  redirect(`/admin/articles/${id}`);
}

export async function updateArticleAction(id: string, fd: FormData) {
  const admin = await requireAdmin();
  await articleAdminCommands.update(admin, id, parseArticleForm(fd, await getDictionary()));
  revalidateAdmin();
  redirect(`/admin/articles/${id}`);
}

export async function deleteArticleAction(id: string) {
  const admin = await requireAdmin();
  await articleAdminCommands.remove(admin, id);
  revalidateAdmin();
  redirect("/admin/articles");
}

export async function publishArticleAction(id: string) {
  const admin = await requireAdmin();
  await articleAdminCommands.setStatus(admin, id, true);
  revalidateAdmin();
  redirect(`/admin/articles/${id}`);
}

export async function unpublishArticleAction(id: string) {
  const admin = await requireAdmin();
  await articleAdminCommands.setStatus(admin, id, false);
  revalidateAdmin();
  redirect(`/admin/articles/${id}`);
}

// ---------------------------------------------------------------------------
// Rankings
// ---------------------------------------------------------------------------

function parseRankingForm(fd: FormData, dict: Dict): SaveRankingData {
  const name = str(fd, "name").trim();
  if (!name) throw new ValidationError(dict.actions.rankingNameRequired);
  const periodTypeRaw = str(fd, "periodType");
  const periodType =
    periodTypeRaw === "WEEK" ||
    periodTypeRaw === "MONTH" ||
    periodTypeRaw === "QUARTER" ||
    periodTypeRaw === "ALL_TIME"
      ? periodTypeRaw
      : "MONTH";

  return {
    name,
    slug: optionalString(fd, "slug") ?? "",
    industryId: optionalString(fd, "industryId") ?? null,
    categoryId: optionalString(fd, "categoryId") ?? null,
    periodType,
    periodStart: optionalDate(fd, "periodStart"),
    periodEnd: optionalDate(fd, "periodEnd"),
  };
}

export async function createRankingAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = await rankingAdminCommands.create(admin, parseRankingForm(fd, await getDictionary()));
  revalidateAdmin();
  redirect(`/admin/rankings/${id}`);
}

export async function updateRankingAction(id: string, fd: FormData) {
  const admin = await requireAdmin();
  await rankingAdminCommands.update(admin, id, parseRankingForm(fd, await getDictionary()));
  revalidateAdmin();
  redirect(`/admin/rankings/${id}`);
}

export async function deleteRankingAction(id: string) {
  const admin = await requireAdmin();
  await rankingAdminCommands.remove(admin, id);
  revalidateAdmin();
  redirect("/admin/rankings");
}

export async function publishRankingAction(id: string) {
  const admin = await requireAdmin();
  await rankingAdminCommands.publish(admin, id);
  revalidateAdmin();
  redirect(`/admin/rankings/${id}`);
}

export async function unpublishRankingAction(id: string) {
  const admin = await requireAdmin();
  await rankingAdminCommands.unpublish(admin, id);
  revalidateAdmin();
  redirect(`/admin/rankings/${id}`);
}

export async function recalculateRankingAction(id: string) {
  const admin = await requireAdmin();
  await rankingAdminCommands.calculateScore(admin, id);
  revalidateAdmin();
  redirect(`/admin/rankings/${id}`);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function blockUserAction(userId: string) {
  const admin = await requireAdmin();
  await userCommands.blockUser(admin, userId);
  revalidateAdmin();
  redirect(`/admin/users/${userId}`);
}

export async function unblockUserAction(userId: string) {
  const admin = await requireAdmin();
  await userCommands.unblockUser(admin, userId);
  revalidateAdmin();
  redirect(`/admin/users/${userId}`);
}

export async function changeUserRoleAction(userId: string, role: UserRole) {
  const admin = await requireAdmin();
  await userCommands.changeRole(admin, userId, role);
  revalidateAdmin();
  redirect(`/admin/users/${userId}`);
}