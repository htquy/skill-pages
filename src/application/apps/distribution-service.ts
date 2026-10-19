import type { AppRepository } from "@/src/domain/apps/entities";
import { compareVersions, relativePath, type DistributionRepository, type SourceInput } from "@/src/domain/apps/distribution";
import { NotFoundError, ValidationError } from "@/src/domain/errors";

export class DistributionService {
  constructor(private apps: AppRepository, private repository: DistributionRepository,
    private storage: { verify(url: string, size: number): Promise<void> }) {}
  private async app(slug: string) {
    const app = await this.apps.findAppBySlug(slug);
    if (!app) throw new NotFoundError("App không tồn tại");
    return app;
  }
  async config(slug: string) {
    const app = await this.app(slug);
    const [sources, releases] = await Promise.all([this.repository.listSources(app.id), this.repository.listReleases(app.id)]);
    return { app, sources, releases };
  }
  async saveSource(slug: string, input: SourceInput, id?: string) {
    const app = await this.app(slug);
    if (![input.entryPoint, ...input.requiredFiles].every(p => relativePath(p)) ||
        !relativePath(input.installDirectory, input.kind === "APPLICATION" || input.format === "FILE") ||
        !relativePath(input.fileName) || input.fileName.includes("/")) throw new ValidationError("Đường dẫn cài đặt phải tương đối và an toàn");
    if (input.kind === "APPLICATION" && (input.key !== "app" || input.format !== "ZIP" || input.installDirectory !== ""))
      throw new ValidationError("Ứng dụng dùng key app, ZIP và thư mục gốc");
    if (input.kind === "RESOURCE" && input.key === "app") throw new ValidationError("Key app dành riêng cho ứng dụng");
    if (input.format === "FILE" && (input.installDirectory !== "" || input.entryPoint !== input.fileName))
      throw new ValidationError("FILE dùng thư mục Binaries và entryPoint bằng fileName");
    if ((input.format === "ZIP") !== input.fileName.toLowerCase().endsWith(".zip")) throw new ValidationError("Định dạng và đuôi file không khớp");
    await this.storage.verify(input.url, input.size);
    return this.repository.saveSource(app.id, input, id);
  }
  async deleteSource(slug: string, id: string) { return this.repository.deleteSource((await this.app(slug)).id, id); }
  async createRelease(slug: string, input: { version: string; channel: string; platform: string; notes: string; sourceIds: string[] }) {
    const app = await this.app(slug);
    const sources = (await this.repository.listSources(app.id)).filter(s => input.sourceIds.includes(s.id));
    if (sources.length !== input.sourceIds.length || new Set(sources.map(s => s.key)).size !== sources.length ||
        sources.filter(s => s.kind === "APPLICATION").length !== 1 || sources.some(s => s.platform !== input.platform))
      throw new ValidationError("Chọn đúng một gói ứng dụng và tối đa một phiên bản mỗi tài nguyên, cùng platform");
    const roots: string[] = [];
    for (const source of sources.filter(s => s.kind === "RESOURCE")) {
      const path = (source.format === "ZIP" ? source.installDirectory : source.fileName).toLowerCase();
      if (roots.some(p => p === path || p.startsWith(path + "/") || path.startsWith(p + "/"))) throw new ValidationError("Đường dẫn các gói tài nguyên bị chồng lấn");
      roots.push(path);
    }
    return this.repository.createRelease(app.id, input);
  }
  async transition(slug: string, id: string, status: "PUBLISHED" | "WITHDRAWN") {
    return this.repository.transitionRelease((await this.app(slug)).id, id, status);
  }
  async deleteRelease(slug: string, id: string) { return this.repository.deleteRelease((await this.app(slug)).id, id); }
  async manifest(slug: string, channel: string, platform: string) {
    const app = await this.app(slug);
    if (app.status !== "ACTIVE") throw new NotFoundError("App không hoạt động");
    const releases = (await this.repository.listReleases(app.id)).filter(r => r.status === "PUBLISHED" && r.channel === channel && r.platform === platform);
    releases.sort((a, b) => compareVersions(b.version, a.version));
    const release = releases[0];
    if (!release) return null;
    // Public contract deliberately excludes publisher paths and private metadata.
    const artifact = (s: typeof release.sources[number]) => ({ key: s.key, name: s.name, version: s.version,
      format: s.format, url: s.url, sha256: s.sha256, size: s.size, fileName: s.fileName,
      installDirectory: s.installDirectory, entryPoint: s.entryPoint, requiredFiles: s.requiredFiles, description: s.description });
    return { schemaVersion: 1, appSlug: slug, releaseId: release.id, version: release.version, channel, platform,
      notes: release.notes, publishedAt: release.publishedAt,
      application: artifact(release.sources.find(s => s.kind === "APPLICATION")!),
      resources: release.sources.filter(s => s.kind === "RESOURCE").map(artifact) };
  }
}
