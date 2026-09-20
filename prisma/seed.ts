import { PrismaClient, type RankingPeriodType } from "@prisma/client";

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

async function main() {
  console.log("Cleaning existing data…");
  await prisma.toolClick.deleteMany();
  await prisma.skillView.deleteMany();
  await prisma.skillFavorite.deleteMany();
  await prisma.rankingEntry.deleteMany();
  await prisma.ranking.deleteMany();
  await prisma.newsToolLink.deleteMany();
  await prisma.newsArticle.deleteMany();
  await prisma.newsCategory.deleteMany();
  await prisma.skillPrice.deleteMany();
  await prisma.skillVersion.deleteMany();
  await prisma.skillToolLink.deleteMany();
  await prisma.skillUseCaseLink.deleteMany();
  await prisma.skillIndustryLink.deleteMany();
  await prisma.skillCategoryLink.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.aITool.deleteMany();
  await prisma.useCase.deleteMany();
  await prisma.skillCategory.deleteMany();
  await prisma.industry.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------
  const adminId = "user-admin-0001";
  const demoId = "user-demo-0001";
  await prisma.user.createMany({
    data: [
      {
        id: adminId,
        name: "Platform Admin",
        email: "admin@promptworks.app",
        role: "ADMIN",
      },
      {
        id: demoId,
        name: "Demo Explorer",
        email: "explorer@promptworks.app",
        role: "CUSTOMER",
      },
    ],
  });
  console.log("Users created");

  // ---------------------------------------------------------------------------
  // Taxonomy
  // ---------------------------------------------------------------------------
  const industries = [
    { slug: "marketing", name: "Marketing" },
    { slug: "sales", name: "Sales" },
    { slug: "engineering", name: "Engineering" },
    { slug: "product", name: "Product" },
    { slug: "design", name: "Design" },
    { slug: "operations", name: "Operations" },
  ];
  await prisma.industry.createMany({ data: industries });
  console.log("Industries created");

  const categories = [
    { slug: "prompt", name: "Prompt" },
    { slug: "workflow", name: "Workflow" },
    { slug: "skill", name: "Skill" },
    { slug: "template", name: "Template" },
  ];
  await prisma.skillCategory.createMany({ data: categories });
  console.log("Skill categories created");

  const useCases = [
    { slug: "content-generation", name: "Content generation" },
    { slug: "customer-support", name: "Customer support" },
    { slug: "code-review", name: "Code review" },
    { slug: "data-analysis", name: "Data analysis" },
    { slug: "ideation", name: "Ideation" },
    { slug: "document-writing", name: "Document writing" },
  ];
  await prisma.useCase.createMany({ data: useCases });
  console.log("Use cases created");

  const tools = [
    {
      slug: "chatgpt",
      name: "ChatGPT",
      description: "OpenAI's flagship conversational assistant.",
      websiteUrl: "https://chatgpt.com",
      logoUrl: null,
    },
    {
      slug: "claude",
      name: "Claude",
      description: "Anthropic's assistant for nuanced, long-form work.",
      websiteUrl: "https://claude.ai",
      logoUrl: null,
    },
    {
      slug: "midjourney",
      name: "Midjourney",
      description: "High-quality image generation from text prompts.",
      websiteUrl: "https://midjourney.com",
      logoUrl: null,
    },
    {
      slug: "notebooklm",
      name: "NotebookLM",
      description: "Research assistant grounded in your own sources.",
      websiteUrl: "https://notebooklm.google.com",
      logoUrl: null,
    },
    {
      slug: "copilot",
      name: "GitHub Copilot",
      description: "AI pair programmer that lives in your editor.",
      websiteUrl: "https://github.com/features/copilot",
      logoUrl: null,
    },
  ];
  await prisma.aITool.createMany({ data: tools });
  console.log("Tools created");

  // ---------------------------------------------------------------------------
  // Skills
  // ---------------------------------------------------------------------------
  const skills = [
    {
      id: "skl-close-sales-reply",
      slug: "close-faster-with-structured-sales-replies",
      title: "Close faster with structured sales replies",
      shortDescription:
        "Turn a messy intro call into a clear, structured follow-up that moves the deal forward.",
      description:
        "This skill takes rough notes from a discovery call and turns them into a structured, personalized follow-up: a one-line recap, a value summary that speaks to the stated pain, a proposed next step with an owner, and a gentle objection inventory. It was built from hundreds of high-performing B2B follow-ups.",
      accessType: "PAID",
      content:
        "You are a senior B2B sales leader helping me reply to a prospect after a discovery call.\n\nUse my notes. Keep the tone warm but concise.\n\nStructure the reply as sections with bold headers:\n- Recap in one sentence\n- Why this matters to them (quote their stated pain)\n- The next step (one, owned, with a time)\n- One potential objection, addressed\n\nMy discovery notes:\n<<call_notes>>",
      instructions:
        "Paste your messy call notes as the <<call_notes>> placeholder. Then rewrite the first paragraph in your own voice before sending.",
      variables: { call_notes: "Free text", outcome: "open | closed | lost" },
      changelog: "v1 released",
      industries: ["sales"],
      categories: ["prompt"],
      useCases: ["content-generation"],
      tools: ["chatgpt", "claude"],
      prices: [{ currency: "USD", amount: 9 }],
      favorites: 142,
      views: 810,
      ratingAverage: 4.8,
      ratingCount: 37,
    },
    {
      id: "skl-podcast-snip",
      slug: "podcast-to-snip",
      title: "Podcast-to-snip: extract shareable moments",
      shortDescription:
        "Turn a 1-hour podcast into 5 sharp, shareable clips with titles and hooks.",
      description:
        "A workflow that ingests a podcast transcript, ranks the most surprising moments, rewrites them as short standalone clips with a scroll-stopping hook, and outputs a ready-to-post thread or newsletter snippet.",
      accessType: "FREE",
      content:
        "You are a clip editor for a creator economy brand.\n\nGiven this transcript, find the 5 most surprising or practical moments.\n\nFor each, output:\n1. A hook line under 120 characters\n2. A 3-sentence standalone summary (no context needed)\n3. A suggested visual cue\n4. Why this moment would make people share it\n\nTranscript:\n<<transcript>>",
      instructions:
        "Paste the full transcript into <<transcript>>. Ask follow-ups to adjust tone (professional vs casual) before generating the thread.",
      variables: { transcript: "Pasted transcript", tone: "professional | casual" },
      changelog: "v2: added visual cues",
      industries: ["marketing"],
      categories: ["workflow"],
      useCases: ["content-generation", "data-analysis"],
      tools: ["chatgpt", "notebooklm"],
      prices: [],
      favorites: 211,
      views: 1204,
      ratingAverage: 4.9,
      ratingCount: 53,
    },
    {
      id: "skl-code-review",
      slug: "ai-assisted-code-review-check",
      title: "AI-assisted code review checklist",
      shortDescription:
        "Run a structured, security-aware review pass on any pull request diff.",
      description:
        "A deterministic review checklist that separates style nits from real risks, flags security footguns, and produces a prioritized list an engineer can act on instead of a wall of trivia.",
      accessType: "PAID",
      content:
        "You are a pragmatic senior engineer reviewing this diff.\n\nAssess only:\n1. Correctness traps (off-by-one, race conditions, timezone math)\n2. Security (input validation, secrets, authz)\n3. API and data-shape concerns\n4. Test coverage gaps for changed paths\n\nFor each finding: severity (block | fix | nit), file, reason, and a concrete suggested change. End with a 3-line summary.",
      instructions:
        "Strip the diff down to the + lines if it is very large. Ask for the context of the change if unclear before reviewing.",
      variables: { diff: "Pasted diff", priority: "block | fix | nit" },
      changelog: "v1 released",
      industries: ["engineering"],
      categories: ["skill"],
      useCases: ["code-review"],
      tools: ["copilot", "claude"],
      prices: [{ currency: "USD", amount: 4 }],
      favorites: 96,
      views: 620,
      ratingAverage: 4.6,
      ratingCount: 29,
    },
    {
      id: "skl-doc-to-ad",
      slug: "doc-to-ad-copy-funnel",
      title: "Doc-to-ad-copy funnel for marketing teams",
      shortDescription:
        "Turn a product brief into 20 ad variants across four funnel stages.",
      description:
        "Converts a single product document into a full paid-social funnel: awareness hooks, interest bullets, consideration proof, and conversion CTAs — each stage clearly labeled so the team can iterate per platform.",
      accessType: "FREE",
      content:
        "You are a performance marketing copywriter.\n\nFrom this product doc, generate 20 ad variants: 5 for awareness (hook-led), 5 for interest (feature bullets), 5 for consideration (social proof and use case), 5 for conversion (CTA-led).\n\nFor each variant: headline under 30 chars, body under 300 chars, and one platform it fits best (Meta | TikTok | LinkedIn | Google).\n\nProduct doc:\n<<product_doc>>",
      instructions:
        "Paste the product brief or landing page copy into <<product_doc>>. Re-run for different regional tones if needed.",
      variables: { product_doc: "URL or pasted copy", region: "e.g. US, EU" },
      changelog: "v1 released",
      industries: ["marketing"],
      categories: ["template"],
      useCases: ["content-generation", "ideation"],
      tools: ["claude", "chatgpt"],
      prices: [],
      favorites: 178,
      views: 940,
      ratingAverage: 4.7,
      ratingCount: 44,
    },
    {
      id: "skl-support-ticket",
      slug: "support-ticket-escalation-note",
      title: "Support ticket → escalation note in 30 seconds",
      shortDescription:
        "Draft a crisp escalation note from a rambling customer support ticket.",
      description:
        "Condenses support conversations into an escalation handoff: the customer's goal, the blocker, what was already tried, and the first thing the next engineer should check.",
      accessType: "FREE",
      content:
        "You are a Support Engineering lead.\n\nFrom this ticket thread, write an escalation note with exactly 4 parts:\n- Customer goal (one line)\n- Blocker (one line)\n- Tried so far (bullets)\n- First thing to check (one recommendation)\n\nKeep it under 150 words total. Do not invent technical facts.\n\nTicket:\n<<ticket_thread>>",
      instructions:
        "Paste the exported ticket thread into <<ticket_thread>>. Verify the 'Tried so far' bullets against the actual timeline before sending.",
      variables: { ticket_thread: "Pasted thread", severity: "P1 | P2 | P3" },
      changelog: "v1 released",
      industries: ["operations"],
      categories: ["prompt"],
      useCases: ["customer-support", "document-writing"],
      tools: ["claude"],
      prices: [],
      favorites: 63,
      views: 410,
      ratingAverage: 4.4,
      ratingCount: 18,
    },
    {
      id: "skl-user-research",
      slug: "interviews-to-insights-matrix",
      title: "Interviews → insights matrix for PMs",
      shortDescription:
        "Cluster raw interview transcripts into jobs-to-be-done insights with evidence.",
      description:
        "Turns interview transcripts into a 'jobs-to-be-done' matrix: the job, frequency, pain, evidence quote, and a corresponding opportunity score. Keeps every claim anchored to a direct quote so the team can audit the synthesis.",
      accessType: "PAID",
      content:
        "You are a UX researcher using the Jobs-to-be-Done framework.\n\nCluster these transcripts into jobs. For each job output:\n- Job statement (verb + object + context)\n- Frequency (daily | weekly | monthly | rare)\n- Core pain\n- One direct quote as evidence\n- Opportunity score 1–10\n\nResolve contradictions by listing both quotes with speaker labels.\n\nTranscripts:\n<<transcripts>>",
      instructions:
        "Paste 3–6 transcripts separated by ---. Ask to drop low-signal jobs before prioritizing.",
      variables: { transcripts: "Pasted transcripts", sample_size: "number of participants" },
      changelog: "v1 released",
      industries: ["product", "design"],
      categories: ["skill"],
      useCases: ["data-analysis"],
      tools: ["notebooklm", "chatgpt"],
      prices: [{ currency: "USD", amount: 12 }],
      favorites: 87,
      views: 505,
      ratingAverage: 4.5,
      ratingCount: 22,
    },
  ] as const;

  for (const skill of skills) {
    const {
      id,
      slug,
      title,
      shortDescription,
      description,
      content,
      instructions,
      variables,
      changelog,
      industries,
      categories,
      useCases,
      tools,
      prices,
      favorites,
      views,
      ratingAverage,
      ratingCount,
    } = skill;

    await prisma.skill.create({
      data: {
        id,
        slug,
        title,
        shortDescription,
        description,
        accessType: skill.accessType,
        status: "PUBLISHED",
        authorId: adminId,
        viewCount: views,
        favoriteCount: favorites,
        ratingAverage,
        ratingCount,
        publishedAt: daysAgo(12),
        versions: {
          create: {
            version: 1,
            content,
            instructions,
            variables: variables as object,
            changelog,
          },
        },
        prices: {
          create: prices.map((price) => ({
            currency: price.currency,
            amount: price.amount,
            isActive: true,
          })),
        },
        industries: {
          create: industries.map((slug) => ({
            industry: { connect: { slug } },
          })),
        },
        categories: {
          create: categories.map((slug) => ({
            category: { connect: { slug } },
          })),
        },
        useCases: {
          create: useCases.map((slug) => ({ useCase: { connect: { slug } } })),
        },
        tools: {
          create: tools.map((slug) => ({ tool: { connect: { slug } } })),
        },
      },
    });
  }
  console.log(`Skills created: ${skills.length}`);

  // ---------------------------------------------------------------------------
  // News
  // ---------------------------------------------------------------------------
  const newsCategories = [
    { slug: "launch", name: "Launches" },
    { slug: "research", name: "Research" },
    { slug: "practice", name: "Practices" },
  ];
  await prisma.newsCategory.createMany({ data: newsCategories });
  console.log("News categories created");

  const articles = [
    {
      slug: "building-a-personal-knowledge-flywheel",
      title: "Building a personal knowledge flywheel with NotebookLM",
      excerpt:
        "How a weekly source-digest routine turns scattered bookmarks into notes you can actually retrieve.",
      content:
        "Most knowledge capture dies in a bookmark folder. The team behind this year's quiet success stories shares a simple loop: clip the source, generate a one-paragraph digest, assign a job-to-be-done tag, and weekly-review the top ten.\n\nThe flywheel works because every step is cheap. NotebookLM turns a 20-page report into three bullets in seconds, and the weekly review rewards you with a 'noticed connections' note that compounds.\n\nStart small: one source a day. The retrieval win comes from the review pass, not the clipping.",
      sourceName: "The PromptWorks Desk",
      sourceUrl: null,
      category: "practice",
      tools: ["notebooklm", "chatgpt"],
      publishedDaysAgo: 1,
      minutesAgoPad: true,
    },
    {
      slug: "claude-three-point-five-tone-control",
      title: "Claude's new tone-control mode is a quiet game changer for drafts",
      excerpt:
        "Early tests show fewer rewrites needed when teams lock a brand voice before generating.",
      content:
        "Teams that pinned a brand voice before generation reported a 40% drop in back-and-forth edits in early tests. The pattern: write the voice spec first, then ask for a draft.\n\nA good voice spec is short: who we sound like, who we never sound like, three adjectives, and two forbidden words. Claude respects it far better than a throwaway 'make it friendly' line.\n\nCombine this with structured output for your templates and the drafting loop starts to feel productive rather than exhausting.",
      sourceName: "Field Notes",
      sourceUrl: null,
      category: "launch",
      tools: ["claude"],
      publishedDaysAgo: 3,
      minutesAgoPad: false,
    },
    {
      slug: "scaling-support-with-ai-drafts",
      title: "Scaling support with AI drafts: a 6-week case study",
      excerpt:
        "A mid-size SaaS cut first-response time by 33% using drafts, not auto-replies.",
      content:
        "The trap people hit is letting the model answer directly. The winning setup drafts a response inside the ticket with a linked context card, and a human approves it in one click.\n\nOver six weeks the team kept morale high because agents still owned every customer conversation, but no longer typed the same five answers from scratch. First-response time fell from 6.2 to 4.1 hours.\n\nThe key metric to watch is not resolution time alone — it's how often drafts for complex tickets get rewritten. That number tells you when to update your skill.",
      sourceName: "The PromptWorks Desk",
      sourceUrl: null,
      category: "practice",
      tools: ["chatgpt", "claude"],
      publishedDaysAgo: 6,
      minutesAgoPad: false,
    },
    {
      slug: "ai-code-review-doesnt-judge",
      title: "Why AI code review feels brutal — and how to make it kind",
      excerpt:
        "A checklist for turning your reviewer skill from a wall of nits into a prioritized list.",
      content:
        "Default AI reviewers produce an unfiltered wall of suggestions, which demoralizes junior engineers and buries the real issues. The fix is a contract in the prompt: separate blocking bugs from quick fixes, require a reason for every nit, and never invent style preferences.\n\nTeams that capped findings at the top ten and forced a severity label reported reviews that actually get read. The same prompt that works for a junior assists a senior by automating the boring pass.\n\nRemember to keep the diff context short — large diffs cause the model to skip straight to trivia.",
      sourceName: "Field Notes",
      sourceUrl: null,
      category: "practice",
      tools: ["copilot", "claude"],
      publishedDaysAgo: 9,
      minutesAgoPad: false,
    },
    {
      slug: "midjourney-style-locking",
      title: "Style-locking Midjourney for consistent brand art",
      excerpt:
        "Seed and parameter discipline turn one-off generations into a repeatable visual system.",
      content:
        "Brands abandon AI art because the style drifts between generations. Professionals lock style with a consistent parameter set: same aspect ratio, same style reference, and a caption that names the brand role.\n\nThe trick is treating 'style' as a prompt block you reuse verbatim rather than describing it freshly each time. Version the block in your skill, and every new asset inherits the look.\n\nKeep a test card of three known scenes; if the outputs drift on the card, update the block before starting production work.",
      sourceName: "The PromptWorks Desk",
      sourceUrl: null,
      category: "launch",
      tools: ["midjourney"],
      publishedDaysAgo: 14,
      minutesAgoPad: false,
    },
  ];

  const articleIds = new Map<string, string>();
  for (let index = 0; index < articles.length; index++) {
    const article = articles[index];
    const id = `news-${index + 1}`;
    articleIds.set(article.slug, id);
    await prisma.newsArticle.create({
      data: {
        id,
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        sourceName: article.sourceName,
        sourceUrl: article.sourceUrl,
        status: "PUBLISHED",
        publishedAt: article.minutesAgoPad
          ? minutesAgo(30 + index * 90)
          : daysAgo(article.publishedDaysAgo),
        tools: {
          create: article.tools.map((slug) => ({ tool: { connect: { slug } } })),
        },
        category: { connect: { slug: article.category } },
      },
    });
  }
  console.log(`News articles created: ${articles.length}`);

  // ---------------------------------------------------------------------------
  // Rankings
  // ---------------------------------------------------------------------------
  const rankingToolStats: Record<string, { views: number; favorites: number; clicks: number }> = {
    chatgpt: { views: 95420, favorites: 12940, clicks: 8100 },
    claude: { views: 84210, favorites: 11230, clicks: 6900 },
    midjourney: { views: 61340, favorites: 7240, clicks: 5100 },
    notebooklm: { views: 52780, favorites: 6930, clicks: 4300 },
    copilot: { views: 48890, favorites: 5410, clicks: 3900 },
  };

  const periods: RankingPeriodType[] = ["WEEK", "MONTH", "QUARTER", "ALL_TIME"];
  for (let index = 0; index < periods.length; index++) {
    const periodType = periods[index];
    const decay = 1 - index * 0.12;
    const entries = Object.entries(rankingToolStats)
      .sort(([, a], [, b]) => {
        const scoreA = (a.views + a.favorites * 8 + a.clicks * 4) * decay;
        const scoreB = (b.views + b.favorites * 8 + b.clicks * 4) * decay;
        return scoreB - scoreA;
      })
      .map(([slug], rankIndex) => {
        const stats = rankingToolStats[slug];
        const score = (stats.views + stats.favorites * 8 + stats.clicks * 4) * decay;
        return {
          toolId: slug,
          rank: rankIndex + 1,
          score,
          views: Math.round(stats.views * decay),
          favorites: Math.round(stats.favorites * decay),
          clicks: Math.round(stats.clicks * decay),
        };
      });

    await prisma.ranking.create({
      data: {
        id: `ranking-${index + 1}-${periodType.toLowerCase()}`,
        slug: `top-ai-tools-${periodType.toLowerCase()}`,
        name:
          periodType === "ALL_TIME"
            ? "All-time favorite AI tools"
            : `Most used AI tools ${periodType.toLowerCase()}`,
        periodType,
        periodStart: daysAgo(periodType === "WEEK" ? 7 : periodType === "MONTH" ? 30 : 90),
        periodEnd: new Date(),
        status: "PUBLISHED",
        entries: { create: entries },
      },
    });
  }
  console.log("Rankings created: 4 periods");

  // ---------------------------------------------------------------------------
  // Engagement (demo user)
  // ---------------------------------------------------------------------------
  await prisma.skillFavorite.create({
    data: { userId: demoId, skillId: "skl-podcast-snip" },
  });
  await prisma.skillFavorite.create({
    data: { userId: demoId, skillId: "skl-close-sales-reply" },
  });
  await prisma.skillView.createMany({
    data: [
      { skillId: "skl-podcast-snip", userId: demoId },
      { skillId: "skl-doc-to-ad", userId: demoId },
      { skillId: "skl-code-review", userId: null, sessionHash: "seed-anon" },
    ],
  });
  console.log("Engagement created");

  console.log("\nSeed complete ✔");
  console.log("Sign-in emails (Google OAuth must be configured):");
  console.log("  - admin@promptworks.app");
  console.log("  - explorer@promptworks.app");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
