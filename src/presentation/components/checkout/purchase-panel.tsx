import type { SkillCardViewModel } from "@/src/presentation/view-models/skill";
import { BuyNowButton } from "@/src/presentation/components/checkout/buy-now-button";
import { OwnedBadge } from "@/src/presentation/components/shared/owned-badge";
import { getDictionary } from "@/src/lib/i18n";

/**
 * Khu vực CTA của thẻ kỹ năng.
 *
 * Skill miễn phí không hiện gì; skill trả phí đã sở hữu hiện badge xanh, còn lại
 * thì hiện nút mua. Việc này lặp lại ở cả trang danh sách và trang chi tiết nên
 * tách thành component riêng để hai nơi luôn hiển thị giống nhau.
 */
export async function PurchasePanel({
  skill,
  variant = "card",
}: {
  skill: Pick<SkillCardViewModel, "id" | "slug" | "title" | "accessType" | "isOwned">;
  variant?: "card" | "detail";
}) {
  const dict = await getDictionary();

  if (skill.accessType !== "PAID") return null;

  if (skill.isOwned) return <OwnedBadge dict={dict} variant={variant} />;

  return (
    <BuyNowButton
      skillId={skill.id}
      skillSlug={skill.slug}
      skillTitle={skill.title}
      dict={dict}
      variant={variant}
    />
  );
}
