import { DistributionController } from "@/src/server/controllers/distribution.controller";
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) { return DistributionController.config((await params).slug); }
