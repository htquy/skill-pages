import { unstable_cache } from "next/cache";
import { HeroRedesign } from "@/src/presentation/components/landing/hero-redesign";
import { TaglineReveal } from "@/src/presentation/components/landing/tagline-reveal";
import { ProductLines } from "@/src/presentation/components/landing/product-lines";
import { FeaturedTools } from "@/src/presentation/components/landing/featured-tools";
import { HowItWorks } from "@/src/presentation/components/landing/how-it-works";
import { PlatformSection } from "@/src/presentation/components/landing/platform-section";
import { FinalCta } from "@/src/presentation/components/landing/final-cta";
import { statistics } from "@/src/infrastructure/composition";
import { getDictionary } from "@/src/lib/i18n";

// Số liệu công khai chỉ cần tươi theo phút: cache 5 phút thay vì 5 truy vấn COUNT cho mỗi lượt xem.
const getCachedMetrics = unstable_cache(() => statistics.getPublicMetrics(), ["public-metrics"], {
  revalidate: 300,
});

export default async function HomePage() {
  // Mọi con số trên trang chủ đều đếm thật từ DB.
  const [dict, metrics] = await Promise.all([getDictionary(), getCachedMetrics()]);

  return (
    <>
      <HeroRedesign counts={metrics} />
      <TaglineReveal
        lead={dict.landing.taglineReveal.lead}
        accent={dict.landing.taglineReveal.accent}
      />
      <ProductLines counts={metrics} />
      <FeaturedTools />
      <HowItWorks />
      <PlatformSection numbers={metrics} />
      <FinalCta />
    </>
  );
}
