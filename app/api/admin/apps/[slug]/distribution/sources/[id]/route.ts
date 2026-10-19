import { DistributionController } from "@/src/server/controllers/distribution.controller";
export async function PUT(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) { const p = await params; return DistributionController.saveSource(request, p.slug, p.id); }
export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) { const p = await params; return DistributionController.deleteSource(request, p.slug, p.id); }
