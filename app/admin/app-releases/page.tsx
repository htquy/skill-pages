import { appsService } from "@/src/infrastructure/composition";
import { DistributionAdmin } from "@/src/presentation/components/admin/distribution-admin";
import { Container } from "@/src/presentation/components/layout/container";
export const dynamic = "force-dynamic";
export default async function AppReleasesPage() {
  const apps = await appsService.listActiveApps();
  return <Container className="py-8"><h1 className="text-2xl font-semibold">Phiên bản ứng dụng & tài nguyên</h1>
    <p className="my-3 text-sm text-zinc-600">Dán link asset GitHub Release hoặc upload lên Cloudflare R2, ghim từng phiên bản file vào bản phát hành. Máy khách chỉ tải phần thay đổi.</p>
    <DistributionAdmin apps={apps.map(a => ({ slug: a.slug, name: a.name }))} /></Container>;
}
