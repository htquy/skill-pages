import { DistributionController } from "@/src/server/controllers/distribution.controller";
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) { return DistributionController.saveSource(request, (await params).slug); }
