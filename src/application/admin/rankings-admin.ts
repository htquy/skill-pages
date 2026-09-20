import { AuditAction } from "@/src/domain/audit";
import type { AuditLogRepository } from "@/src/domain/audit";
import type { CurrentUser } from "@/src/domain/identity/entities";
import type { RankingAdminDetail, RankingAdminRepository, RankingAdminSummary, SaveRankingData } from "@/src/domain/ranking/admin";
import type { PaginatedResult, Pagination } from "@/src/domain/shared";

export interface RankingAdminDeps {
  rankings: RankingAdminRepository;
  audit: AuditLogRepository;
}

export function createRankingAdminCommands(deps: RankingAdminDeps) {
  return {
    list(pagination: Pagination): Promise<PaginatedResult<RankingAdminSummary>> {
      return deps.rankings.list(pagination);
    },

    getDetail(id: string): Promise<RankingAdminDetail | null> {
      return deps.rankings.findById(id);
    },

    async create(admin: CurrentUser, data: SaveRankingData): Promise<string> {
      const id = await deps.rankings.create(data);
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.CREATE_SKILL,
        entityType: "Ranking",
        entityId: id,
      });
      return id;
    },

    async update(admin: CurrentUser, id: string, data: SaveRankingData): Promise<void> {
      await deps.rankings.update(id, data);
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.UPDATE_RANKING,
        entityType: "Ranking",
        entityId: id,
      });
    },

    async calculateScore(admin: CurrentUser, id: string): Promise<number> {
      const count = await deps.rankings.calculateScore(id);
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.UPDATE_RANKING,
        entityType: "Ranking",
        entityId: id,
        metadata: { recalculated: true, entries: count },
      });
      return count;
    },

    async publish(admin: CurrentUser, id: string): Promise<void> {
      await deps.rankings.setStatus(id, "PUBLISHED");
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.PUBLISH_RANKING,
        entityType: "Ranking",
        entityId: id,
      });
    },

    async unpublish(admin: CurrentUser, id: string): Promise<void> {
      await deps.rankings.setStatus(id, "DRAFT");
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.UPDATE_RANKING,
        entityType: "Ranking",
        entityId: id,
      });
    },

    async remove(admin: CurrentUser, id: string): Promise<void> {
      await deps.rankings.delete(id);
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.DELETE_RANKING,
        entityType: "Ranking",
        entityId: id,
      });
    },
  };
}