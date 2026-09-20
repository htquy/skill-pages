import { AuditAction } from "@/src/domain/audit";
import type { AuditLogRepository } from "@/src/domain/audit";
import type { CurrentUser } from "@/src/domain/identity/entities";
import type { NewsAdminDetail, NewsAdminRepository, NewsAdminSummary, SaveArticleData } from "@/src/domain/news/admin";
import type { PaginatedResult, Pagination } from "@/src/domain/shared";

export interface ArticleAdminDeps {
  articles: NewsAdminRepository;
  audit: AuditLogRepository;
}

export function createArticleAdminCommands(deps: ArticleAdminDeps) {
  return {
    list(filters: { q?: string; status?: string }, pagination: Pagination): Promise<PaginatedResult<NewsAdminSummary>> {
      return deps.articles.list(
        {
          q: filters.q,
          status: filters.status === "ALL" ? undefined : (filters.status as NewsAdminSummary["status"]),
        },
        pagination,
      );
    },

    getDetail(id: string): Promise<NewsAdminDetail | null> {
      return deps.articles.findById(id);
    },

    async create(admin: CurrentUser, data: SaveArticleData): Promise<string> {
      const id = await deps.articles.create(data, admin.id);
      await deps.audit.record({
        actorUserId: admin.id,
        action: data.publish ? AuditAction.PUBLISH_ARTICLE : AuditAction.CREATE_ARTICLE,
        entityType: "NewsArticle",
        entityId: id,
      });
      return id;
    },

    async update(admin: CurrentUser, id: string, data: SaveArticleData): Promise<void> {
      await deps.articles.update(id, data);
      await deps.audit.record({
        actorUserId: admin.id,
        action: data.publish ? AuditAction.PUBLISH_ARTICLE : AuditAction.UPDATE_ARTICLE,
        entityType: "NewsArticle",
        entityId: id,
      });
    },

    async setStatus(admin: CurrentUser, id: string, publish: boolean): Promise<void> {
      await deps.articles.setStatus(id, publish ? "PUBLISHED" : "DRAFT");
      await deps.audit.record({
        actorUserId: admin.id,
        action: publish ? AuditAction.PUBLISH_ARTICLE : AuditAction.UNPUBLISH_ARTICLE,
        entityType: "NewsArticle",
        entityId: id,
      });
    },

    async remove(admin: CurrentUser, id: string): Promise<void> {
      await deps.articles.delete(id);
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.DELETE_ARTICLE,
        entityType: "NewsArticle",
        entityId: id,
      });
    },
  };
}