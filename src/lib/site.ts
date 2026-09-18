export const siteConfig = {
  name: "PromptWorks",
  shortName: "PW",
  description:
    "Curated AI prompts, workflows and skills for real-world work — organized by what you actually do.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  tagline: "Discover better ways to work with AI.",
} as const;

export const navItems = [
  { href: "/", label: "Discover" },
  { href: "/news", label: "AI News" },
  { href: "/rankings", label: "Rankings" },
] as const;

export const defaultPageSize = 12;