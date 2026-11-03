import { notFound, redirect } from "next/navigation";
import { appsService, toolQueries } from "@/src/infrastructure/composition";
import { isAppError } from "@/src/domain/errors";

type Props = { params: Promise<{ slug: string }> };

/**
 * /apps/:slug không có nội dung riêng: dẫn về trang giới thiệu (nếu có) để khách đọc trước,
 * ngược lại tới bảng giá. Tránh link/bookmark tới /apps/:slug bị 404.
 */
export default async function AppEntryPage({ params }: Props) {
  const { slug } = await params;
  try {
    await appsService.getApp(slug);
  } catch (error) {
    if (isAppError(error) && error.status === 404) notFound();
    throw error;
  }
  const tool = await toolQueries.findByAppSlug(slug);
  redirect(tool ? `/tools/${tool.slug}` : `/apps/${slug}/pricing`);
}
