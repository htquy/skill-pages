export const dynamic = "force-dynamic";

import { Container } from "@/src/presentation/components/layout/container";
import { appsService, toolAdminCommands } from "@/src/infrastructure/composition";
import { getDictionary } from "@/src/lib/i18n";
import {
  AppsAdminPanel,
  type AdminAppConfig,
} from "@/src/presentation/components/admin/apps-admin-panel";
import type { FeatureRecord } from "@/src/domain/apps/entities";

/**
 * Trang admin cấu hình sản phẩm & gói đăng ký: danh mục app, menu động,
 * bảng giá theo chu kỳ (tháng/quý/năm/vĩnh viễn) và cấp gói cho người dùng.
 */
export default async function AdminAppsPage() {
  const dict = await getDictionary();
  const apps = await appsService.listActiveApps();
  // Facade catalog: lấy trang giới thiệu theo appSlug, không join chéo schema.
  const catalogPages = await toolAdminCommands.listByAppSlugs(apps.map((app) => app.slug));

  const configs: AdminAppConfig[] = [];
  let features: FeatureRecord[] = [];
  for (const app of apps) {
    const config = await appsService.adminListAppConfig(app.slug);
    configs.push({
      app: config.app,
      plans: config.plans,
      menus: config.menus,
      catalogPages: catalogPages.filter((page) => page.appSlug === app.slug),
    });
    if (features.length === 0) features = config.features;
  }

  return (
    <Container className="py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">{dict.admin.apps.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{dict.admin.apps.subtitle}</p>
        <p className="mt-1 max-w-3xl text-sm text-zinc-500">{dict.admin.apps.explainer}</p>
      </header>
      <AppsAdminPanel dict={dict} configs={configs} features={features} />
    </Container>
  );
}
