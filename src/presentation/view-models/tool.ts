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
}

export function toToolCardViewModel(tool: ToolSummary): ToolCardViewModel {
  return {
    slug: tool.slug,
    title: tool.title,
    description: tool.shortDescription,
    type: tool.type,
    billingType: tool.billingType,
    coverImageUrl: tool.coverImageUrl,
    priceLabel: tool.lowestPrice ? formatMoney(tool.lowestPrice.amount, tool.lowestPrice.currency) : null,
    latestVersion: tool.latestVersion,
  };
}

/** Giá trị nhập được của form admin (major units) từ giá lưu trong DB (minor units). */
export function toPriceInputValue(price: ToolPriceInfo): string {
  return String(toMajorUnits(price.amount, price.currency));
}
