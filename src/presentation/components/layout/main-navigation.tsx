import { navItems } from "@/src/lib/site";
import { NavLink } from "@/src/presentation/components/layout/nav-link";

export function MainNavigation({ className }: { className?: string }) {
  return (
    <nav aria-label="Main" className={className}>
      <ul className="flex items-center gap-1">
        {navItems.map((item) => (
          <li key={item.href}>
            <NavLink href={item.href} label={item.label} />
          </li>
        ))}
      </ul>
    </nav>
  );
}