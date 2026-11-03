import { AppWindow, BookOpenCheck, Download, Globe, Plug, type LucideIcon } from "lucide-react";
import type { ToolType } from "@/src/domain/tool";

/** Số liệu thật của kho mà trang chủ cần (đếm từ DB qua `statistics.getPublicMetrics`). */
export interface StoreCounts {
  toolsByType: Record<ToolType, number>;
  publishedSkills: number;
}

export type ProductLineKey = ToolType | "SKILLS";

export interface ProductLine {
  key: ProductLineKey;
  href: string;
  Icon: LucideIcon;
  /** Sắc của ô icon, mỗi dòng sản phẩm một màu. */
  tile: string;
}

// Thứ tự = thứ tự ưu tiên phát triển: web app & MCP trước, kho skill là dòng bổ trợ.
export const productLines: ProductLine[] = [
  { key: "WEB_APP", href: "/tools?type=WEB_APP", Icon: Globe, tile: "bg-brand-100 text-brand-600" },
  { key: "MCP_SERVER", href: "/tools?type=MCP_SERVER", Icon: Plug, tile: "bg-violet-100 text-violet-600" },
  { key: "EMBED_WIDGET", href: "/tools?type=EMBED_WIDGET", Icon: AppWindow, tile: "bg-emerald-100 text-emerald-600" },
  { key: "DOWNLOADABLE", href: "/tools?type=DOWNLOADABLE", Icon: Download, tile: "bg-sky-100 text-sky-600" },
  { key: "SKILLS", href: "/skills", Icon: BookOpenCheck, tile: "bg-spark-100 text-spark-600" },
];

export function countFor(line: ProductLineKey, counts: StoreCounts) {
  return line === "SKILLS" ? counts.publishedSkills : counts.toolsByType[line];
}
