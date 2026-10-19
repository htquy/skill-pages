import { DistributionController } from "@/src/server/controllers/distribution.controller";
export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) { const p = await params; return DistributionController.changeRelease(request, p.slug, p.id); }
export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) { const p = await params; return DistributionController.deleteRelease(request, p.slug, p.id); }
