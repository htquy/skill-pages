/** Distribution belongs exclusively to the apps module. */
export interface AppSourceRecord {
  id: string; appId: string; key: string; name: string; version: string;
  kind: "APPLICATION" | "RESOURCE"; format: "ZIP" | "FILE";
  platform: string; url: string; sha256: string; size: number;
  fileName: string; installDirectory: string; entryPoint: string;
  requiredFiles: string[]; description: string; metadata: Record<string, string>;
}
export type SourceInput = Omit<AppSourceRecord, "id" | "appId">;
export interface AppReleaseRecord {
  id: string; appId: string; version: string; channel: string; platform: string;
  status: "DRAFT" | "PUBLISHED" | "WITHDRAWN"; notes: string;
  publishedAt: Date | null; sources: AppSourceRecord[];
}
export interface DistributionRepository {
  listSources(appId: string): Promise<AppSourceRecord[]>;
  saveSource(appId: string, input: SourceInput, id?: string): Promise<AppSourceRecord>;
  deleteSource(appId: string, id: string): Promise<void>;
  listReleases(appId: string): Promise<AppReleaseRecord[]>;
  createRelease(appId: string, input: { version: string; channel: string; platform: string; notes: string; sourceIds: string[] }): Promise<AppReleaseRecord>;
  transitionRelease(appId: string, id: string, status: "PUBLISHED" | "WITHDRAWN"): Promise<void>;
  deleteRelease(appId: string, id: string): Promise<void>;
}
export function compareVersions(a: string, b: string): number {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  return 0;
}
/** https://github.com/{owner}/{repo}/releases/download/{tag}/{asset} → các phần; null nếu không phải asset release GitHub. */
export function parseGitHubReleaseUrl(url: string): { owner: string; repo: string; tag: string; asset: string } | null {
  let value: URL;
  try { value = new URL(url); } catch { return null; }
  if (value.protocol !== "https:" || value.hostname !== "github.com" || value.search || value.hash) return null;
  const parts = value.pathname.split("/");
  if (parts.length !== 7 || parts[3] !== "releases" || parts[4] !== "download") return null;
  try {
    const [owner, repo, , , tag, asset] = parts.slice(1).map(decodeURIComponent);
    return owner && repo && tag && asset ? { owner, repo, tag, asset } : null;
  } catch { return null; }
}
export function relativePath(value: string, allowEmpty = false): boolean {
  return (allowEmpty && value === "") || (value.length > 0 && value.length <= 240 &&
    !/[\\:*?"<>|\x00-\x1f]/.test(value) && !value.startsWith("/") &&
    value.split("/").every(p => p !== "" && p !== "." && p !== ".." && !/[. ]$/.test(p) &&
      !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)));
}
