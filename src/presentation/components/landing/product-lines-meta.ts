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
  { key: "WEB_APP", href: "/tools?type=WEB_APP", Icon: Globe, tile: "bg-zinc-200 text-zinc-700 ring-1 ring-white/[0.06]" },
  { key: "MCP_SERVER", href: "/tools?type=MCP_SERVER", Icon: Plug, tile: "bg-zinc-200 text-zinc-700 ring-1 ring-white/[0.06]" },
  { key: "EMBED_WIDGET", href: "/tools?type=EMBED_WIDGET", Icon: AppWindow, tile: "bg-zinc-200 text-zinc-700 ring-1 ring-white/[0.06]" },
  { key: "DOWNLOADABLE", href: "/tools?type=DOWNLOADABLE", Icon: Download, tile: "bg-zinc-200 text-zinc-700 ring-1 ring-white/[0.06]" },
  { key: "SKILLS", href: "/skills", Icon: BookOpenCheck, tile: "bg-zinc-200 text-zinc-700 ring-1 ring-white/[0.06]" },
];

export function countFor(line: ProductLineKey, counts: StoreCounts) {
  return line === "SKILLS" ? counts.publishedSkills : counts.toolsByType[line];
}
