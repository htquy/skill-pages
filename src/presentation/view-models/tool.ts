import type { ToolPriceInfo, ToolSummary } from "@/src/domain/tool";
import { formatMoney, toMajorUnits } from "@/src/domain/shared";
import { trans } from "@/src/lib/i18n";
import type { Dict } from "@/src/lib/i18n/config";

export type ToolPeriod = "month" | "year" | "lifetime" | "custom";

/** 0 = vĩnh viễn, 30 = theo tháng, 365 = theo năm; còn lại hiển thị số ngày. */
export function periodOf(durationDays: number): ToolPeriod {
  if (durationDays <= 0) return "lifetime";
  if (durationDays >= 365) return "year";
  if (durationDays >= 28) return "month";
  return "custom";
}

export function periodLabel(price: ToolPriceInfo, dict: Dict): string {
  const period = periodOf(price.durationDays);
  if (period === "month") return dict.tools.periods.month;
  if (period === "year") return dict.tools.periods.year;
  if (period === "lifetime") return dict.tools.periods.lifetime;
  return trans(dict.tools.periods.days, { count: price.durationDays });
}

export interface ProductLink {
  href: string;
  kind: "access" | "download";
}

/** Web app → mở URL truy cập; app/tool/MCP/widget → tải về. null = admin chưa nhập (tool cũ). */
export function productLinkOf(tool: Pick<ToolSummary, "type" | "appUrl" | "downloadUrl">): ProductLink | null {
  if (tool.type === "WEB_APP") return tool.appUrl ? { href: tool.appUrl, kind: "access" } : null;
  return tool.downloadUrl ? { href: tool.downloadUrl, kind: "download" } : null;
}

export interface ToolCardViewModel {
  slug: string;
  title: string;
  description: string;
  type: ToolSummary["type"];
  billingType: ToolSummary["billingType"];
  coverImageUrl: string | null;
  /** null = miễn phí hoặc chưa có giá, component tự hiển thị nhãn phù hợp. */
  priceLabel: string | null;
  latestVersion: string | null;
  /** true = tool bán gói qua app liên kết, giá lấy từ gói của app. */
  hasPlans: boolean;
  productLink: ProductLink | null;
}

/** Giá nhỏ nhất trong các gói đang bán của app (cùng tiền tệ với kỳ rẻ nhất). */
export function lowestPlanPrice(
  plans: Array<{ prices: Array<{ amount: number; currency: string }> }>,
): { amount: number; currency: string } | null {
  let lowest: { amount: number; currency: string } | null = null;
  for (const plan of plans) {
    for (const price of plan.prices) {
      if (!lowest || price.amount < lowest.amount) lowest = price;
    }
  }
  return lowest;
}

export function toToolCardViewModel(
  tool: ToolSummary,
  appPrices: Map<string, { amount: number; currency: string } | null> = new Map(),
  dict?: Dict,
): ToolCardViewModel {
  const appPrice = tool.appSlug ? appPrices.get(tool.appSlug) : undefined;
  if (tool.appSlug && appPrice !== undefined) {
    return {
      slug: tool.slug,
      title: tool.title,
      description: tool.shortDescription,
      type: tool.type,
      billingType: tool.billingType,
      coverImageUrl: tool.coverImageUrl,
      priceLabel: appPrice
        ? dict
          ? trans(dict.tools.plansFrom, { price: formatMoney(appPrice.amount, appPrice.currency) })
          : formatMoney(appPrice.amount, appPrice.currency)
        : null,
      latestVersion: tool.latestVersion,
      hasPlans: appPrice !== null,
      productLink: productLinkOf(tool),
    };
  }
  return {
    slug: tool.slug,
    title: tool.title,
    description: tool.shortDescription,
    type: tool.type,
    billingType: tool.billingType,
    coverImageUrl: tool.coverImageUrl,
    priceLabel: tool.lowestPrice ? formatMoney(tool.lowestPrice.amount, tool.lowestPrice.currency) : null,
    latestVersion: tool.latestVersion,
    hasPlans: false,
    productLink: productLinkOf(tool),
  };
}

/** Giá trị nhập được của form admin (major units) từ giá lưu trong DB (minor units). */
export function toPriceInputValue(price: ToolPriceInfo): string {
  return String(toMajorUnits(price.amount, price.currency));
}
