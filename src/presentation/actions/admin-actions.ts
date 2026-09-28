"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import {
  articleAdminCommands,
  rankingAdminCommands,
  skillAdminCommands,
  toolAdminCommands,
  userCommands,
} from "@/src/infrastructure/composition";
import { ValidationError } from "@/src/domain/errors";
import { toMinorUnits } from "@/src/domain/shared";
import type { UserRole } from "@/src/domain/identity/entities";
import type { SaveSkillData } from "@/src/domain/skill";
import type { SaveArticleData } from "@/src/domain/news/admin";
import type { SaveRankingData } from "@/src/domain/ranking/admin";
import type { SaveToolData, SaveToolPriceData, ToolBillingType, ToolType } from "@/src/domain/tool";
import { getDictionary } from "@/src/lib/i18n";
import type { Dict } from "@/src/lib/i18n/config";
import { isEmptyRichText, sanitizeRichText } from "@/src/lib/rich-text";

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
  revalidatePath("/admin/tools");
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
  const description = sanitizeRichText(str(fd, "description"));
  const content = str(fd, "content").trim();
  if (!title) throw new ValidationError(dict.actions.skillTitleRequired);
  if (!shortDescription) throw new ValidationError(dict.actions.skillShortDescriptionRequired);
  if (!description || isEmptyRichText(description)) {
    throw new ValidationError(dict.actions.skillDescriptionRequired);
  }
  if (!content) throw new ValidationError(dict.actions.skillContentRequired);

  let price: { currency: string; amount: number } | null = null;
  if (accessType === "PAID") {
    const priceAmountMajor = Number(fd.get("priceAmount") ?? "0");
    const currency = optionalString(fd, "priceCurrency") ?? "USD";
    if (!Number.isFinite(priceAmountMajor) || priceAmountMajor < 0) {
      throw new ValidationError(dict.actions.skillPriceInvalid);
    }
    if (priceAmountMajor > 0) {
      price = { currency, amount: toMinorUnits(priceAmountMajor, currency) };
    }
  }

  return {
    title,
    slug: optionalString(fd, "slug") ?? "",
    shortDescription,
    description,
    accessType,
    coverImageUrl: optionalString(fd, "coverImageUrl") ?? null,
    videoDemoUrl: optionalString(fd, "videoDemoUrl") ?? null,
    price,
    content,
    instructions: optionalString(fd, "instructions")
      ? sanitizeRichText(str(fd, "instructions"))
      : null,
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
// Tools
// ---------------------------------------------------------------------------

const TOOL_TYPES: ToolType[] = ["DOWNLOADABLE", "EMBED_WIDGET", "MCP_SERVER", "WEB_APP"];
const TOOL_BILLING_TYPES: ToolBillingType[] = ["FREE", "ONE_TIME", "SUBSCRIPTION"];

/** `appUrl` của WEB_APP cùng nằm trong `config`; đọc/ghi ở đây để không lệch nguồn dữ liệu. */
function mergeAppUrl(
  config: Record<string, unknown>,
  appUrl: string | null,
): Record<string, unknown> | null {
  if (appUrl) return { ...config, appUrl };
  if (!("appUrl" in config)) return Object.keys(config).length > 0 ? config : null;
  const { appUrl: _removed, ...rest } = config;
  return Object.keys(rest).length > 0 ? rest : null;
}

/** Mỗi gói giá là một dòng form; bỏ qua dòng trống ở cuối danh sách. */
function parsePricePlans(fd: FormData, dict: Dict): SaveToolPriceData[] {
  const amounts = fd.getAll("priceAmount").map(String);
  const currencies = fd.getAll("priceCurrency").map(String);
  const durations = fd.getAll("priceDuration").map(String);

  return amounts.flatMap((raw, index) => {
    if (!raw.trim()) return [];
    const amountMajor = Number(raw);
    if (!Number.isFinite(amountMajor) || amountMajor < 0) {
      throw new ValidationError(dict.actions.toolPriceInvalid);
    }
    // Ô trống = vĩnh viễn, đồng bộ với gợi ý "0 là vĩnh viễn".
    const durationRaw = (durations[index] ?? "").trim();
    const duration = durationRaw === "" ? 0 : Number(durationRaw);
    const currency = (currencies[index] ?? "").trim().toUpperCase() || "USD";
    if (!Number.isInteger(duration) || duration < 0) {
      throw new ValidationError(dict.actions.toolPriceDurationInvalid);
    }
    return [{ currency, amount: toMinorUnits(amountMajor, currency), durationDays: duration }];
  });
}

function parseToolForm(fd: FormData, dict: Dict): SaveToolData {
  const type = str(fd, "type") as ToolType;
  if (!TOOL_TYPES.includes(type)) throw new ValidationError(dict.actions.toolTypeInvalid);
  const billingType = str(fd, "billingType") as ToolBillingType;
  if (!TOOL_BILLING_TYPES.includes(billingType)) {
    throw new ValidationError(dict.actions.toolBillingInvalid);
  }

  const title = str(fd, "title").trim();
  const shortDescription = str(fd, "shortDescription").trim();
  const description = sanitizeRichText(str(fd, "description"));
  if (!title) throw new ValidationError(dict.actions.toolTitleRequired);
  if (!shortDescription) throw new ValidationError(dict.actions.toolShortDescriptionRequired);
  if (!description || isEmptyRichText(description)) {
    throw new ValidationError(dict.actions.toolDescriptionRequired);
  }

  const versionCode = str(fd, "versionCode").trim();
  if (!versionCode) throw new ValidationError(dict.actions.toolVersionRequired);

  let config: Record<string, unknown> = {};
  const configRaw = optionalString(fd, "configJson");
  if (configRaw) {
    try {
      const parsed = JSON.parse(configRaw) as unknown;
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("not an object");
      }
      config = parsed as Record<string, unknown>;
    } catch {
      throw new ValidationError(dict.actions.toolConfigInvalid);
    }
  }

  const appUrl = optionalString(fd, "appUrl") ?? null;
  const fileUrl = optionalString(fd, "fileUrl") ?? null;
  const scriptUrl = optionalString(fd, "scriptUrl") ?? null;
  if (type === "WEB_APP" && !appUrl) throw new ValidationError(dict.actions.toolAppUrlRequired);
  if (type === "DOWNLOADABLE" && !fileUrl && !scriptUrl) {
    throw new ValidationError(dict.actions.toolFileRequired);
  }

  const fileSizeRaw = optionalString(fd, "fileSize");
  const fileSize = fileSizeRaw ? Number(fileSizeRaw) : null;
  const parsedFileSize = fileSize !== null && Number.isFinite(fileSize) && fileSize > 0 ? fileSize : null;

  return {
    title,
    slug: optionalString(fd, "slug") ?? "",
    shortDescription,
    description,
    type,
    billingType,
    coverImageUrl: optionalString(fd, "coverImageUrl") ?? null,
    videoDemoUrl: optionalString(fd, "videoDemoUrl") ?? null,
    appUrl,
    config: mergeAppUrl(config, appUrl),
    prices: billingType === "FREE" ? [] : parsePricePlans(fd, dict),
    versionCode,
    changelog: optionalString(fd, "changelog") ?? null,
    fileUrl,
    fileName: optionalString(fd, "fileName") ?? null,
    fileSize: parsedFileSize,
    scriptUrl,
  };
}

export async function createToolAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = await toolAdminCommands.create(admin, parseToolForm(fd, await getDictionary()));
  revalidateAdmin();
  redirect(`/admin/tools/${id}`);
}

export async function updateToolAction(id: string, fd: FormData) {
  const admin = await requireAdmin();
  await toolAdminCommands.update(admin, id, parseToolForm(fd, await getDictionary()));
  revalidateAdmin();
  redirect(`/admin/tools/${id}`);
}

export async function deleteToolAction(id: string) {
  const admin = await requireAdmin();
  await toolAdminCommands.remove(admin, id);
  revalidateAdmin();
  redirect("/admin/tools");
}

export async function publishToolAction(id: string) {
  const admin = await requireAdmin();
  await toolAdminCommands.publish(admin, id);
  revalidateAdmin();
  redirect(`/admin/tools/${id}`);
}

export async function unpublishToolAction(id: string) {
  const admin = await requireAdmin();
  await toolAdminCommands.unpublish(admin, id);
  revalidateAdmin();
  redirect(`/admin/tools/${id}`);
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

function parseArticleForm(fd: FormData, dict: Dict): SaveArticleData {
  const title = str(fd, "title").trim();
  const rawContent = str(fd, "content").trim();
  const content = sanitizeRichText(rawContent);
  const sourceName = str(fd, "sourceName").trim();
  if (!title) throw new ValidationError(dict.actions.articleTitleRequired);
  if (!content || isEmptyRichText(content)) throw new ValidationError(dict.actions.articleContentRequired);
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