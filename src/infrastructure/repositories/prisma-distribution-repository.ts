import { Prisma, type AppSource as PrismaSource } from "@prisma/client";
import { prisma } from "@/src/infrastructure/database/prisma";
import type { AppSourceRecord, AppReleaseRecord, DistributionRepository } from "@/src/domain/apps/distribution";
import { ConflictError, NotFoundError } from "@/src/domain/errors";

const source = (row: PrismaSource): AppSourceRecord => {
  if ((row.kind !== "APPLICATION" && row.kind !== "RESOURCE") || (row.format !== "ZIP" && row.format !== "FILE"))
    throw new ConflictError("Loại file trong database không hợp lệ");
  return { ...row, kind: row.kind, format: row.format, requiredFiles: row.requiredFiles as string[], metadata: row.metadata as Record<string, string> };
};
const releaseInclude = { items: { include: { source: true } } } as const;

export const prismaDistributionRepository: DistributionRepository = {
  async listSources(appId) { return (await prisma.appSource.findMany({ where: { appId }, orderBy: { createdAt: "desc" } })).map(source); },
  async saveSource(appId, input, id) {
    return prisma.$transaction(async tx => {
      if (id) {
        const existing = await tx.appSource.findFirst({ where: { id, appId }, include: { _count: { select: { items: true } } } });
        if (!existing) throw new NotFoundError();
        if (existing._count.items) throw new ConflictError("File đã được ghim trong release; hãy tạo phiên bản mới");
        return source(await tx.appSource.update({ where: { id }, data: input }));
      }
      return source(await tx.appSource.create({ data: { appId, ...input } }));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
  async deleteSource(appId, id) {
    // FK RESTRICT is the final concurrency-safe guard against deleting pinned sources.
    await prisma.appSource.deleteMany({ where: { id, appId, items: { none: {} } } }).then(r => {
      if (!r.count) throw new ConflictError("File không tồn tại hoặc đang được release sử dụng");
    });
  },
  async listReleases(appId) {
    return (await prisma.appRelease.findMany({ where: { appId }, include: releaseInclude, orderBy: { createdAt: "desc" } }))
      .map(({ items, ...r }) => ({ ...r, sources: items.map(i => source(i.source)) }) as AppReleaseRecord);
  },
  async createRelease(appId, input) {
    const { sourceIds, ...fields } = input;
    return prisma.$transaction(async tx => {
      // Recheck scope inside the transaction to prevent source deletion/replacement races.
      const sources = await tx.appSource.findMany({ where: { appId, id: { in: sourceIds } } });
      if (sources.length !== sourceIds.length) throw new ConflictError("Danh sách file đã thay đổi, tải lại trang");
      const row = await tx.appRelease.create({ data: { appId, ...fields, items: { create: sourceIds.map(sourceId => ({ sourceId })) } }, include: releaseInclude });
      return { ...row, sources: row.items.map(i => source(i.source)) } as AppReleaseRecord;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
  async transitionRelease(appId, id, status) {
    const result = await prisma.appRelease.updateMany({ where: { id, appId, status: status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" },
      data: { status, ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}) } });
    if (!result.count) throw new ConflictError("Chỉ phát hành bản nháp hoặc thu hồi bản đang phát hành");
  },
  async deleteRelease(appId, id) {
    if (!(await prisma.appRelease.deleteMany({ where: { id, appId, status: "DRAFT" } })).count) throw new ConflictError("Chỉ được xóa bản nháp");
  },
};
