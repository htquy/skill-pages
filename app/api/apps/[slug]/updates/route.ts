import { DistributionController } from "@/src/server/controllers/distribution.controller";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) { return DistributionController.manifest(request, (await params).slug); }
