import { DistributionController } from "@/src/server/controllers/distribution.controller";

export async function POST(request: Request, props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  return DistributionController.ciRelease(request, slug);
}
