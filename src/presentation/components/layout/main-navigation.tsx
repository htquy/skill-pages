import { getDictionary } from "@/src/lib/i18n";
import { publicNav } from "@/src/lib/site";
import { NavLink } from "@/src/presentation/components/layout/nav-link";

export async function MainNavigation({ className }: { className?: string }) {
  const dict = await getDictionary();
  const labels: Record<string, string> = {
    "/": dict.nav.discover,
    "/news": dict.nav.aiNews,
    "/rankings": dict.nav.rankings,
  };

  return (
    <nav aria-label="Main" className={className}>
      <ul className="flex items-center gap-1">
        {publicNav.map((item) => (
          <li key={item.href}>
            <NavLink href={item.href} label={labels[item.href] ?? item.href} />
          </li>
        ))}
      </ul>
    </nav>
  );
}