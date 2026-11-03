export const siteConfig = {
  name: "StoreWorks",
  shortName: "SW",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  tagline: "Ready-to-use AI tools and skills for your workflow.",
} as const;

export const publicNav = [
  { href: "/" },
  { href: "/tools" },
  { href: "/skills" },
  { href: "/news" },
  { href: "/rankings" },
] as const;

export const defaultPageSize = 12;