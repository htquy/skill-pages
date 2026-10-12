import { CatalogController } from "@/src/server/controllers/catalog.controller";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  return CatalogController.getSkillContent(request, id);
}
