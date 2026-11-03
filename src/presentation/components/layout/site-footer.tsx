import Link from "next/link";
import { Container } from "@/src/presentation/components/layout/container";
import { Logo } from "@/src/presentation/components/layout/logo";
import { siteConfig } from "@/src/lib/site";
import { getDictionary } from "@/src/lib/i18n";

export async function SiteFooter() {
  const dict = await getDictionary();
  const footerLinks = [
    { href: "/", label: dict.nav.home },
    { href: "/tools", label: dict.nav.tools },
    { href: "/skills", label: dict.nav.skills },
    { href: "/news", label: dict.nav.aiNews },
    { href: "/rankings", label: dict.nav.rankings },
    { href: "/search", label: dict.nav.search },
  ] as const;

  return (
    <footer className="relative overflow-hidden border-t border-zinc-200 bg-zinc-50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/70 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl"
      />
      <Container className="relative flex flex-col gap-8 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <Logo />
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">{dict.meta.description}</p>
        </div>
        <nav aria-label={dict.siteFooter.aria}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group relative text-sm text-zinc-600 transition-colors hover:text-brand-700"
                >
                  {link.label}
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-brand-500 transition-transform duration-500 ease-fluid group-hover:scale-x-100"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
      <Container className="relative border-t border-zinc-200/70 py-5">
        <p className="text-xs text-zinc-400">
          © {siteConfig.name}
        </p>
      </Container>
    </footer>
  );
}
