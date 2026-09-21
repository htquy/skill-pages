import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { SiteHeader } from "@/src/presentation/components/layout/site-header";
import { SiteFooter } from "@/src/presentation/components/layout/site-footer";
import { siteConfig } from "@/src/lib/site";
import { getDictionary, getLocale, trans } from "@/src/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.name} — ${dict.meta.titleTemplate}`,
      template: `%s · ${siteConfig.name}`,
    },
    description: dict.meta.description,
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: trans(dict.meta.ogTitle),
      description: dict.meta.description,
      url: siteConfig.url,
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale] = await Promise.all([getLocale()]);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-zinc-900">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}