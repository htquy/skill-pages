import { Prisma, type ContentStatus } from "@prisma/client";
import { slugify } from "@/src/lib/utils";
import { prisma } from "@/src/infrastructure/database/prisma";
import type { SaveToolData, ToolAdminRepository, ToolAdminSummary, ToolStatus } from "@/src/domain/tool";
import type { PaginatedResult, Pagination } from "@/src/domain/shared";
import {
  readAppUrl,
  readConfigObject,
  toPriceInfo,
  toVersionInfo,
} from "@/src/infrastructure/repositories/prisma-tool-mapper";

const listInclude = {
  prices: { where: { isActive: true }, orderBy: { amount: "asc" }, take: 1 },
  versions: { where: { isLatest: true }, take: 1 },
} satisfies Prisma.ToolInclude;

type ToolWithList = Prisma.ToolGetPayload<{ include: typeof listInclude }>;

function toSummary(tool: ToolWithList): ToolAdminSummary {
  return {
    id: tool.id,
    slug: tool.slug,
    title: tool.title,
    shortDescription: tool.shortDescription,
    type: tool.type,
    billingType: tool.billingType,
    status: tool.status as ToolStatus,
    coverImageUrl: tool.coverImageUrl,
    price: tool.prices[0] ? toPriceInfo(tool.prices[0]) : null,
    latestVersion: tool.versions[0]?.versionCode ?? null,
    publishedAt: tool.publishedAt,
    createdAt: tool.createdAt,
    updatedAt: tool.updatedAt,
  };
}

function toPaginated<T>(items: T[], total: number, pagination: Pagination): PaginatedResult<T> {
  return {
    items,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  };
}

const priceCreate = (data: SaveToolData) =>
  data.prices.map((price) => ({
    currency: price.currency,
    amount: price.amount,
    durationDays: price.durationDays,
    isActive: true,
  }));

/**
 * Form chỉ quản lý phiên bản "latest" như SkillForm quản lý SkillVersion mới nhất.
 * Mã phiên bản là duy nhất theo tool, nên đổi mã sẽ ghi đè bản ghi latest đó.
 */
async function upsertLatestVersion(tx: Prisma.TransactionClient, toolId: string, data: SaveToolData) {
  const latest = await tx.toolVersion.findFirst({
    where: { toolId, isLatest: true },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  const payload = {
    versionCode: data.versionCode,
    changelog: data.changelog,
    fileUrl: data.fileUrl,
    fileName: data.fileName,
    fileSize: data.fileSize === undefined || data.fileSize === null ? null : BigInt(data.fileSize),
    scriptUrl: data.scriptUrl,
    isLatest: true,
  };
  if (latest) {
    await tx.toolVersion.update({ where: { id: latest.id }, data: payload });
    return;
  }
  await tx.toolVersion.create({ data: { ...payload, toolId } });
}

export const prismaToolAdminRepository: ToolAdminRepository = {
  async list(filters, pagination) {
    const where: Prisma.ToolWhereInput = {};
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: "insensitive" } },
        { slug: { contains: filters.q, mode: "insensitive" } },
      ];
    }
    if (filters.status) where.status = filters.status as ContentStatus;
    if (filters.type) where.type = filters.type;
    if (filters.billingType) where.billingType = filters.billingType;

    const [rows, total] = await Promise.all([
      prisma.tool.findMany({
        where,
        include: listInclude,
        orderBy: { updatedAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.tool.count({ where }),
    ]);
    return toPaginated(rows.map(toSummary), total, pagination);
  },

  async findById(id) {
    const tool = await prisma.tool.findUnique({
      where: { id },
      include: {
        prices: { where: { isActive: true }, orderBy: [{ durationDays: "asc" }, { amount: "asc" }] },
        versions: { where: { isLatest: true }, take: 1 },
      },
    });
    if (!tool) return null;

    return {
      ...toSummary({ ...tool, prices: tool.prices.slice(0, 1), versions: tool.versions }),
      description: tool.description,
      videoDemoUrl: tool.videoDemoUrl,
      appUrl: readAppUrl(tool.config),
      config: readConfigObject(tool.config),
      version: toVersionInfo(tool.versions[0]),
      prices: tool.prices.map(toPriceInfo),
    };
  },

  async create(data) {
    const tool = await prisma.tool.create({
      data: {
        title: data.title,
        slug: data.slug || slugify(data.title),
        shortDescription: data.shortDescription,
        description: data.description,
        type: data.type,
        billingType: data.billingType,
        status: "DRAFT",
        coverImageUrl: data.coverImageUrl,
        videoDemoUrl: data.videoDemoUrl,
        config: (data.config ?? null) as object | undefined,
        prices: { create: priceCreate(data) },
      },
    });
    await upsertLatestVersion(prisma, tool.id, data);
    return tool.id;
  },

  async update(id, data) {
    const current = await prisma.tool.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw new Error("Tool not found");

    await prisma.$transaction(async (tx) => {
      await tx.tool.update({
        where: { id },
        data: {
          title: data.title,
          slug: data.slug || slugify(data.title),
          shortDescription: data.shortDescription,
          description: data.description,
          type: data.type,
          billingType: data.billingType,
          coverImageUrl: data.coverImageUrl,
          videoDemoUrl: data.videoDemoUrl,
          config: (data.config ?? null) as object | undefined,
          prices: { deleteMany: {}, create: priceCreate(data) },
        },
      });
      await upsertLatestVersion(tx, id, data);
    });
  },

  async delete(id) {
    await prisma.tool.delete({ where: { id } });
  },

  async setStatus(id, status) {
    await prisma.tool.update({
      where: { id },
      data: {
        status,
        ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
      },
    });
  },

  async countAll() {
    return prisma.tool.count();
  },

  async countPublished() {
    return prisma.tool.count({ where: { status: "PUBLISHED" } });
  },
};
