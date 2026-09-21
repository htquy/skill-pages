import Link from "next/link";
import { Container } from "@/src/presentation/components/layout/container";
import { siteConfig } from "@/src/lib/site";
import { getDictionary } from "@/src/lib/i18n";

export async function SiteFooter() {
  const dict = await getDictionary();
  const footerLinks = [
    { href: "/", label: dict.nav.discover },
    { href: "/news", label: dict.nav.aiNews },
    { href: "/rankings", label: dict.nav.rankings },
    { href: "/search", label: dict.nav.search },
  ] as const;

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-900">{siteConfig.name}</p>
          <p className="mt-1 max-w-md text-sm text-zinc-500">{dict.meta.description}</p>
        </div>
        <nav aria-label={dict.siteFooter.aria}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-zinc-600 transition-colors hover:text-zinc-900"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </footer>
  );
}