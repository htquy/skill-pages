import { AppsController } from "@/src/server/controllers/apps.controller";

export async function POST(
  request: Request,
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;
  return AppsController.adminCreateMenuItem(request, slug);
}
