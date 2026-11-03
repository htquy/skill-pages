import { AppsController } from "@/src/server/controllers/apps.controller";

export async function POST(request: Request, props: { params: Promise<{ slug: string; planId: string }> }) {
  const { slug, planId } = await props.params;
  return AppsController.adminUpsertPlanPrice(request, slug, planId);
}
