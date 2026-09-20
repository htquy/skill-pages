import { prisma } from "@/src/infrastructure/database/prisma";
import type { SkillAccess, SkillAccessRepository, SkillAccessSource, SkillAccessView } from "@/src/domain/access";

function toAccess(row: {
  id: string;
  userId: string;
  skillId: string;
  orderId: string | null;
  source: string;
  grantedAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): SkillAccess {
  return {
    id: row.id,
    userId: row.userId,
    skillId: row.skillId,
    orderId: row.orderId,
    source: row.source as SkillAccessSource,
    grantedAt: row.grantedAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toView(row: {
  skillId: string;
  skillSlug: string;
  skillTitle: string;
  source: string;
  grantedAt: Date;
  revokedAt: Date | null;
  orderCode: string | null;
}): SkillAccessView {
  return {
    skillId: row.skillId,
    skillSlug: row.skillSlug,
    skillTitle: row.skillTitle,
    source: row.source as SkillAccessSource,
    grantedAt: row.grantedAt,
    revokedAt: row.revokedAt,
    orderCode: row.orderCode,
  };
}

export const prismaSkillAccessRepository: SkillAccessRepository = {
  async findActive(userId, skillId) {
    const row = await prisma.skillAccess.findUnique({
      where: { userId_skillId: { userId, skillId } },
    });
    return row && !row.revokedAt ? toAccess(row) : null;
  },

  async listActiveByUser(userId) {
    const rows = await prisma.skillAccess.findMany({
      where: { userId, revokedAt: null },
      include: {
        skill: { select: { id: true, slug: true, title: true } },
        order: { select: { orderCode: true } },
      },
      orderBy: { grantedAt: "desc" },
    });
    return rows.map((row) =>
      toView({
        skillId: row.skillId,
        skillSlug: row.skill.slug,
        skillTitle: row.skill.title,
        source: row.source,
        grantedAt: row.grantedAt,
        revokedAt: row.revokedAt,
        orderCode: row.order?.orderCode ?? null,
      }),
    );
  },

  async listActiveByUserFetch(userId) {
    const rows = await prisma.skillAccess.findMany({
      where: { userId, revokedAt: null },
    });
    return rows.map(toAccess);
  },

  async grant(input) {
    const row = await prisma.skillAccess.upsert({
      where: { userId_skillId: { userId: input.userId, skillId: input.skillId } },
      create: {
        userId: input.userId,
        skillId: input.skillId,
        orderId: input.orderId,
        source: input.source,
      },
      update: {
        revokedAt: null,
        source: input.source,
        grantedAt: new Date(),
      },
    });
    return toAccess(row);
  },

  async revoke(userId, skillId) {
    await prisma.skillAccess.update({
      where: { userId_skillId: { userId, skillId } },
      data: { revokedAt: new Date() },
    });
  },

  async listByUserForAdmin(userId) {
    const rows = await prisma.skillAccess.findMany({
      where: { userId },
      include: {
        skill: { select: { id: true, slug: true, title: true } },
        order: { select: { orderCode: true } },
      },
      orderBy: { grantedAt: "desc" },
    });
    return rows.map((row) =>
      toView({
        skillId: row.skillId,
        skillSlug: row.skill.slug,
        skillTitle: row.skill.title,
        source: row.source,
        grantedAt: row.grantedAt,
        revokedAt: row.revokedAt,
        orderCode: row.order?.orderCode ?? null,
      }),
    );
  },
};