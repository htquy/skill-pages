import { prisma } from "@/src/infrastructure/database/prisma";
import type { EngagementRepository } from "@/src/domain/identity/entities";
import { ConflictError } from "@/src/domain/errors";

export const prismaEngagementRepository: EngagementRepository = {
  async isFavorite(userId, skillId) {
    const favorite = await prisma.skillFavorite.findUnique({
      where: { userId_skillId: { userId, skillId } },
      select: { skillId: true },
    });
    return favorite !== null;
  },

  async addFavorite(userId, skillId) {
    try {
      await prisma.skillFavorite.create({ data: { userId, skillId } });
    } catch {
      throw new ConflictError("This skill is already in your saved list");
    }
  },

  async removeFavorite(userId, skillId) {
    await prisma.skillFavorite.deleteMany({ where: { userId, skillId } });
  },

  async listFavoriteSkillIds(userId) {
    const favorites = await prisma.skillFavorite.findMany({
      where: { userId },
      select: { skillId: true },
      orderBy: { createdAt: "desc" },
    });
    return favorites.map((favorite) => favorite.skillId);
  },

  async recordSkillView(skillId, opts) {
    await prisma.skillView.create({
      data: { skillId, userId: opts.userId, sessionHash: opts.sessionHash },
    });
  },
};