export const siteConfig = {
  name: "PromptWorks",
  shortName: "PW",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  tagline: "Discover better ways to work with AI.",
} as const;

export const publicNav = [
  { href: "/" },
  { href: "/news" },
  { href: "/rankings" },
] as const;

export const defaultPageSize = 12;