import { z } from "zod";

export const skillFiltersSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  industry: z.string().trim().max(64).optional(),
  category: z.string().trim().max(64).optional(),
  useCase: z.string().trim().max(64).optional(),
  tool: z.string().trim().max(64).optional(),
  access: z.enum(["FREE", "PAID"]).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().max(500).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(24).optional().default(12),
});

export const newsFiltersSchema = z.object({
  category: z.string().trim().max(64).optional(),
});

export const rankingFiltersSchema = z.object({
  industry: z.string().trim().max(64).optional(),
  category: z.string().trim().max(64).optional(),
  period: z.enum(["WEEK", "MONTH", "QUARTER", "ALL_TIME"]).optional(),
});

export type SkillFiltersInput = z.infer<typeof skillFiltersSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type NewsFiltersInput = z.infer<typeof newsFiltersSchema>;
export type RankingFiltersInput = z.infer<typeof rankingFiltersSchema>;

export const toggleFavoriteSchema = z.object({
  skillSlug: z.string().trim().min(1).max(180),
});

export type ToggleFavoriteInput = z.infer<typeof toggleFavoriteSchema>;