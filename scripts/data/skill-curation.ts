/**
 * Danh sách skill được chọn từ feed R2 của SkillStudio (722 skill) để đưa lên kho /skills.
 *
 * Nguyên tắc thu gọn: mỗi "phong cách" chỉ giữ MỘT đại diện; những bản chỉ khác thương hiệu / màu / bố cục nhẹ
 * (ví dụ 52 mẫu "X Style OG Image", 210 hiệu ứng LaunchMotion, 123 hiệu ứng CreatorMotion, 44 preset garden-motion)
 * bị loại, chỉ giữ vài mẫu có diện mạo khác hẳn nhau. Skill miễn phí trong feed luôn được giữ nguyên là FREE.
 * Skill "engine" (garden-*) mà các preset khác dựa vào (field `base:` trong SKILL.md) luôn được giữ kèm theo.
 *
 * `slug` (key) = slug trong feed R2; giá trị = use-case (kiểu sản phẩm tạo ra) hiển thị ở bộ lọc.
 * Danh mục (category) lấy từ thư mục của skill trong feed: video | web | image | slides.
 */

export const USE_CASES: Record<string, { name: string; description: string }> = {
  "og-image": { name: "OG & social image", description: "Ảnh chia sẻ mạng xã hội / OG theo phong cách thương hiệu nổi tiếng." },
  "illustration-poster": { name: "Illustration & poster", description: "Minh hoạ, poster, chân dung, bản đồ và hình ảnh biên tập." },
  "infographic-diagram": { name: "Infographic & diagram", description: "Sơ đồ, infographic, ghi chú trực quan, bảng trắng." },
  "image-engine": { name: "Image templates", description: "Bộ mẫu prompt theo chủ đề cho GPT Image." },
  "pitch-deck": { name: "Pitch & company deck", description: "Deck gọi vốn, giới thiệu công ty, chiến lược thương hiệu." },
  "creative-deck": { name: "Creative & editorial deck", description: "Deck sáng tạo, tạp chí, kể chuyện, workshop." },
  "research-deck": { name: "Academic & research deck", description: "Deck học thuật, báo cáo nghiên cứu, tư vấn." },
  "landing-page": { name: "Landing page", description: "Trang đích cho SaaS, fintech, du lịch, sản phẩm, studio." },
  "portfolio": { name: "Portfolio & resume", description: "Trang portfolio, CV, hồ sơ cá nhân." },
  "storefront": { name: "Online store", description: "Giao diện cửa hàng, thương mại điện tử." },
  "dashboard": { name: "Dashboard & data", description: "Admin, dashboard và biểu đồ dữ liệu." },
  "hero-section": { name: "Hero & sections", description: "Khối hero, testimonial, mockup dùng lại trong mọi trang." },
  "brand-style-site": { name: "Brand-inspired site", description: "Website theo ngôn ngữ thiết kế của một thương hiệu / trường phái." },
  "article": { name: "Article & long-form", description: "Bài viết dài, báo chí, tài liệu trình bày đẹp." },
  "launch-film": { name: "Launch film", description: "Video ra mắt sản phẩm, teaser, reel." },
  "product-motion": { name: "Product motion", description: "Hiệu ứng chuyển động cho UI, CTA, dữ liệu, chương." },
  "motion-style": { name: "Motion style", description: "Phong cách chuyển động / hoạt hình cho video giải thích và showreel." },
};

export const CATEGORIES: Record<string, { name: string; description: string }> = {
  video: { name: "Video", description: "Video ra mắt, motion graphics, showreel, video giải thích." },
  web: { name: "Web", description: "Landing page, portfolio, dashboard, cửa hàng và khối giao diện." },
  image: { name: "Image", description: "Ảnh OG, poster, minh hoạ, infographic, mockup." },
  slides: { name: "Slides", description: "Bộ slide / deck cho thuyết trình và báo cáo." },
};

const og = (...names: string[]) => names.map((n) => `bs-${n}-style-og`);
const lm = (...names: string[]) => names.map((n) => `bs-launchmotion-${n}`);
const cm = (...names: string[]) => names.map((n) => `bs-creatormotion-${n}`);
const bs = (...names: string[]) => names.map((n) => `bs-${n}`);
const motion = (...names: string[]) => names.map((n) => `garden-motion-${n}`);
const gweb = (...names: string[]) => names.map((n) => `garden-web-${n}`);
const gart = (...names: string[]) => names.map((n) => `garden-article-${n}`);
const gimg = (...names: string[]) => names.map((n) => `garden-image-${n}`);

const GROUPS: Record<string, string[]> = {
  // ---------------------------------------------------------------- image
  "og-image": [
    // 3 mẫu miễn phí + 8 mẫu khác hẳn nhau (50+ mẫu OG còn lại chỉ đổi thương hiệu)
    ...og("discord", "github", "raycast"),
    ...og("a24", "apple", "duolingo", "figma", "notion", "spotify", "stripe", "vercel"),
  ],
  "illustration-poster": [
    ...bs(
      "allegorical-engraving-cover",
      "anthropic-report-illustration",
      "appliance-exploded-poster",
      "article-illustration-set",
      "cinematic-shot-grid",
      "city-street-map-illustrator",
      "claude-style-illustration",
      "grokbot-avatar",
      "isometric-research-collage",
      "marine-research-poster",
      "monochrome-studio-portrait",
      "openai-style-poster",
      "paper-cut-science-explainer",
      "raw-ink-storyboard",
      "tessellated-editorial-still-life",
      "wonky-cute-doodles",
    ),
  ],
  "infographic-diagram": [...bs("chalkboard-infographic", "hand-drawn-visual-notes", "optical-bench-diagram", "annotated-wash-diagram")],
  "image-engine": [
    "garden-gpt-image-2",
    ...gimg("poster-and-campaigns", "product-visuals", "infographics", "ui-mockups", "branding-and-packaging", "portraits-and-characters", "technical-diagrams", "typography-and-text-layout"),
  ],

  // --------------------------------------------------------------- slides
  "pitch-deck": [
    ...bs("blue-block-company-deck", "lilac-pitch-deck", "spectrum-brand-strategy-deck", "cobalt-growth-deck", "brand-story-deck", "prismatic-fashion-deck"),
  ],
  "creative-deck": [
    ...bs("acid-agency-deck", "cozy-island-deck", "ink-landscape-deck", "neon-makers-deck", "red-black-zine-deck", "starlit-deck", "yellow-sketchnote-deck", "gallery-catalogue-deck"),
    "garden-web-video-presentation",
  ],
  "research-deck": [...bs("academic-argument-deck", "research-paper-deck", "consulting-storyline-deck", "botanical-quiet-deck")],

  // ------------------------------------------------------------------ web
  "landing-page": [
    ...bs(
      "mint-noir-saas-site",
      "tracklane-devtool-landing",
      "beacon-saas-landing",
      "finora-banking-landing",
      "coinhaven-crypto-landing",
      "aurawave-audio-landing",
      "alpine-travel-agency-landing",
      "liquid-glass-landing",
      "obsidian-cinema-landing",
      "editorial-ink-landing",
      "taskmuse-ai-landing",
      "sticker-agency-landing",
      "molten-glass-landing",
      "silver-robot-product-site",
    ),
  ],
  "portfolio": [
    ...bs("mono-designer-portfolio", "bento-designer-portfolio", "collage-creative-portfolio", "editorial-dev-portfolio", "playful-uiux-portfolio", "scrapbook-resume-site"),
  ],
  "storefront": [...bs("ember-ebike-store", "sage-sneaker-store")],
  "dashboard": [
    ...bs("orbit-admin-dashboard", "opsdeck-admin-kit", "data-visualization-kpi-lines", "data-visualization-funnel-area", "data-visualization-stacked-columns", "data-visualization-records-grid"),
  ],
  "hero-section": [
    ...bs("hero-particle-field", "hero-dark-stats", "hero-film-strip", "hero-integration-grid", "testimonial-masonry-wall", "testimonial-minimal-carousel", "testimonial-fanned-deck", "interactive-system-map", "iphone-duo-mockup", "sketchnote-pricing"),
  ],
  "brand-style-site": [
    ...gweb("design-engineer", "apple-hig", "linear", "notion-pre-ai", "raycast", "vercel-mesh", "aesop", "active-theory", "bloomberg-terminal", "dieter-rams-braun", "monocle-magazine", "pentagram", "y2k-retrofuturism"),
  ],
  "article": ["garden-beautiful-article", ...gart("press", "bodoni", "shannon", "sottsass", "fuller")],

  // ---------------------------------------------------------------- video
  "launch-film": [
    ...bs(
      "ascii-glitch-launch-video",
      "cue-style-launch-video",
      "linear-agent-style-launch-video",
      "manus2-0-style-launch-video",
      "fable5-2-style-launch-video",
      "plush-crew-launch-video",
      "paper-cutout-story-video",
      "hyperframes-capability-keynote-launch",
      "hyperframes-chat-to-result-launch",
      "hyperframes-code-change-launch",
      "hyperframes-device-canvas-launch",
      "hyperframes-halftone-canvas-launch",
      "hyperframes-liquid-logo-reveal",
      "hyperframes-pixel-promo",
      "hyperframes-technical-drawing-promo",
    ),
  ],
  "product-motion": [
    ...lm(
      "cta-brush-wipe-sunset",
      "cta-earthrise-dives-through",
      "cta-particle-dome-headlines",
      "data-metric-board-introduced",
      "flow-neon-tunnel-stream",
      "grid-social-proof-wall",
      "grid-glowing-mood-orbs",
      "reveal-plasma-orb-collapses",
      "reveal-rainbow-twists-dna",
      "type-headline-builds-word",
      "ui-thermal-scan-glass",
      "ui-multiplayer-poster-assembles",
      "ui-agent-completes-checklist",
      "ui-exploded-security-chip",
    ),
    ...cm(
      "cards-roadmap-focus",
      "chapter-grid-flip",
      "collage-testimonial-wall",
      "comparison-feature-matrix",
      "comparison-line-trend",
      "diagram-hub-routing",
      "diagram-timeline-nodes",
      "pip-calendar-reschedule",
      "split-chart-pan",
      "spotlight-region-callout",
      "transition-tile-dissolve",
      "type-title-takeover",
    ),
  ],
  "motion-style": [
    ...motion(
      "showreel",
      "dark-keynote",
      "swiss-editorial",
      "art-deco",
      "blueprint",
      "cel-anime-80s",
      "cinematic-title",
      "comic-pop",
      "crt-vhs",
      "glass-material",
      "hologram-hud",
      "ink-wash",
      "isometric-infographic",
      "kinetic-brutalist",
      "minimal-ui",
      "pixel-game",
      "risograph-print",
      "soft-3d-toy",
      "synthwave-neon",
      "ukiyo-e",
      "whiteboard-explainer",
    ),
  ],
};

/** slug trong feed -> use-case key */
export const CURATED: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [useCase, slugs] of Object.entries(GROUPS)) {
    for (const slug of slugs) {
      if (m.has(slug)) throw new Error(`Trùng slug trong danh sách chọn lọc: ${slug}`);
      m.set(slug, useCase);
    }
  }
  return m;
})();
