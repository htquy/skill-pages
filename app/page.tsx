export const dynamic = "force-dynamic";

import { HeroRedesign } from "@/src/presentation/components/landing/hero-redesign";
import { TaglineReveal } from "@/src/presentation/components/landing/tagline-reveal";
import { ProductLines } from "@/src/presentation/components/landing/product-lines";
import { FeaturedTools } from "@/src/presentation/components/landing/featured-tools";
import { HowItWorks } from "@/src/presentation/components/landing/how-it-works";
import { PlatformSection } from "@/src/presentation/components/landing/platform-section";
import { FinalCta } from "@/src/presentation/components/landing/final-cta";
import { statistics } from "@/src/infrastructure/composition";
import { getDictionary } from "@/src/lib/i18n";

export default async function HomePage() {
  // Mọi con số trên trang chủ đều đếm thật từ DB.
  const [dict, metrics] = await Promise.all([getDictionary(), statistics.getPublicMetrics()]);

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
