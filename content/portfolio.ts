export type ProjectLink = {
  label: string;
  href: string;
};

export type Project = {
  name: string;
  badge: string;
  description: string;
  highlight: string;
  links: ProjectLink[];
  /** Optional case-study extras (rendered only when present). */
  slug?: string;
  role?: string;
  year?: string;
  stack?: string[];
  outcomes?: string[];
};

export type SkillGroup = {
  title: string;
  points: string[];
};

export type Approach = {
  index: string;
  title: string;
  body: string;
};

export type Social = {
  label: string;
  handle: string;
  href: string;
  note: string;
};

export const PROFILE = {
  name: "Nico Chikuji",
  brand: "nico.builds",
  role: "full-stack developer",
  navTagline: "Flow Beyond Limits",
  title: "Building digital products that perform with precision.",
  mantra: "Flow beyond limits. Stay Playful, Ship Serious.",
  summary:
    "I work across web3, AI, and the modern web—shipping products that are reliable, considered, and built for the people who use them.",
  now: "Currently collaborating with founders, operators, and AI-assisted teams on new product work.",
  motto: "Full-stack developer for considered, high-quality builds.",
  email: "nico.builds@outlook.com",
  calendly: "https://calendly.com/nico-chikuji/30min",
  github: "https://github.com/chiku524",
  workTitle: "Selected Work",
  workLede: "Products in production, from web3 and AI to client platforms.",
  skillsTitle: "Capabilities",
  skillsLede:
    "The tools and practices I use to ship quickly without sacrificing quality.",
  toolkitTitle: "Creative Toolkit",
  toolkitNote:
    "Cursor is my primary environment. Other tools—Pisces, CapCut, Canva, custom GPTs—come in when they improve the outcome.",
  githubActivity: "View full activity on GitHub",
  approachTitle: "Approach",
  approachLede: "How I like to work, and the teams I do my best work with.",
  contactTitle: "Contact",
  contactLede:
    "Have a product, engagement, or collaboration in mind? Reach out and we can talk through it.",
  emailLabel: "Email",
  emailBadge: "Direct line",
  emailNote:
    "Share the brief, the constraint, or the question. I typically reply within a day or two.",
  socialTitle: "Social channels",
  introTitle: "Intro call",
  introBadge: "Book time",
  closingTitle: "Let’s build something worth shipping.",
  closingBody:
    "Reach out directly or through any of the projects above. I work with founders, operators, and designers who care about quality and follow-through.",
  footerBrand: "Flow Beyond Limits",
  footerNote: "nico.builds — built with care and modern tooling.",
} as const;

export const VALUES = [
  "Innovation × Precision",
  "Community-First Collaboration",
  "Playful Seriousness",
  "Adaptive Ecosystem Design",
] as const;

export const PROJECTS: Project[] = [
  {
    name: "Blockchain Vibe",
    badge: "Media lab",
    description:
      "Content engine that blends data, culture, and alpha leaks. Automation, editorial pipelines, and on-chain analytics for the web3 zeitgeist.",
    highlight: "Automation pipelines, AI content flows, analytics stack.",
    links: [{ label: "Open project", href: "https://blockchainvibe.news/" }],
  },
  {
    name: "Micro Paywall",
    badge: "Blockchain payments",
    description:
      "Monetize content with instant blockchain payments. Multi-chain support, sub-second confirmations, near-zero fees, and seamless integration.",
    highlight: "Solana, Ethereum, Polygon. Drop-in widgets, full dashboard.",
    links: [{ label: "Open project", href: "https://micropaywall.app/" }],
  },
  {
    name: "Token Ledger",
    badge: "Crypto accounting",
    description:
      "Latest build: audit-ready double-entry subledger for digital assets—wallets, custodians, and exchanges across Ethereum, Solana, Polygon, Bitcoin, and Sui.",
    highlight: "IFRS reporting, ERP sync path, multi-chain connectors.",
    links: [
      { label: "Open project", href: "https://app.tokenledger.win/" },
      { label: "GitHub", href: "https://github.com/chiku524/token-ledger" },
    ],
  },
  {
    name: "Motion",
    badge: "Video generation",
    description:
      "Turn your script into video. One prompt, one video. Procedural engine—no external models. From prompt to production.",
    highlight: "Procedural engine, self-built algorithms, learning system.",
    links: [{ label: "Open project", href: "https://motion.productions/" }],
  },
  {
    name: "Dice Express",
    badge: "Prediction markets",
    description:
      "Trade on real-world outcomes. Prediction markets that connect forecasters with meaningful events and opportunities.",
    highlight: "Real-world outcomes, forecasting, decentralized trading.",
    links: [{ label: "Open project", href: "https://dice.express/" }],
  },
  {
    name: "The Studio Circus",
    badge: "AI education",
    description:
      "AI-powered educational video series that entertain, educate, and inspire. Exploring industries through creative storytelling.",
    highlight: "AI Tech Circus, Sports, Global Events, Blockchain series.",
    links: [{ label: "Open project", href: "https://thestudiocircus.io/" }],
  },
  {
    name: "SnappyPie",
    badge: "AI micro-tutor",
    description:
      "Snap a photo, get a structured visual lesson. Expo mobile + web with vision explanations, animated lessons, and a local knowledge timeline.",
    highlight: "Camera input, OpenAI vision, animated lesson renderer.",
    links: [{ label: "Open project", href: "https://snappypie.app/" }],
  },
  {
    name: "BountyHub",
    badge: "Decentralized bounties",
    description:
      "Web3 growth hub dispensing bounties, cred, and inside jokes. Product narrative and features shipping at startup pace.",
    highlight: "Growth funnels, bounty flow, contributor dashboards.",
    links: [{ label: "Open project", href: "https://bountyhub.tech/" }],
  },
  {
    name: "NFT Gallery",
    badge: "NFT collections",
    description:
      "A house of on-chain collections—each drop with its own studio, traits, and launch path. Loopkins, Afterimages, and Inklings on OpenSea.",
    highlight: "Layered APNG PFPs, 1:1 loops, ERC-721 on Robinhood Chain and Ink.",
    links: [{ label: "Open project", href: "https://nft-provider.vercel.app/" }],
  },
  {
    name: "Albion Silver Helper",
    badge: "Game economy tools",
    description:
      "Client-side Albion Online profit helper for market flips, refining, crafting, farms, and optional local price capture—no game automation.",
    highlight: "Spread scanner, refining calc, capture library.",
    links: [
      { label: "Open project", href: "https://albion-silver-helper.vercel.app/" },
    ],
  },
  {
    name: "Schmiedeler & Associates",
    badge: "Client website",
    description:
      "Institutional site for Schmiedeler & Associates Inc.—services, product lines, manufacturers, and contact flows on Cloudflare Pages.",
    highlight: "Static site, contact API, admin portal.",
    links: [{ label: "Open project", href: "https://schmiedeler.com/" }],
  },
  {
    name: "Boing Network",
    badge: "L1 blockchain ecosystem",
    description:
      "Authentic. Decentralized. Optimal. Quality-assured. Native account abstraction, adaptive gas, cross-chain DeFi hub—built from first principles.",
    highlight: "Network · Wallet · Explorer · DeFi",
    links: [
      { label: "Network", href: "https://boing.network/" },
      { label: "Wallet", href: "https://boing.express/" },
      { label: "Explorer", href: "https://boing.observer/" },
      { label: "DeFi", href: "https://boing.finance/" },
    ],
  },
];

export const SKILLS: SkillGroup[] = [
  {
    title: "Product Engineering",
    points: [
      "Full-stack delivery with React, Next.js, Supabase, Node, and reliable infrastructure.",
      "Design systems that balance polish, clear UX, and measurable outcomes.",
      "A steady release cadence—async collaboration, pairing, and transparent roadmaps.",
    ],
  },
  {
    title: "AI Amplification",
    points: [
      "Cursor-first workflow for rapid ideation, refactors, automated QA, and docs.",
      "Custom prompting for briefs, narrative design, growth experiments, and analytics.",
      "Copilots powering smart contracts, operational tooling, and creator pipelines.",
    ],
  },
  {
    title: "Web3 & Community",
    points: [
      "Composable dApps with wallet UX that feels familiar, safe, and easy to use.",
      "On-chain insights—dashboards, bots, and reporting—supported by AI analysis.",
      "Community playbooks covering launches, communication, and retention.",
    ],
  },
];

export const TOOLKIT = [
  "Cursor",
  "Copilot",
  "Pisces",
  "CapCut",
  "Canva",
  "ChatGPT",
  "OpenAI API",
] as const;

export const APPROACH: Approach[] = [
  {
    index: "01",
    title: "Innovation × Precision",
    body: "Strong products need engineering rigor. I prototype quickly, validate with data, and polish until every release is ready for production.",
  },
  {
    index: "02",
    title: "Community-First Collaboration",
    body: "I do my best work alongside founders, DAOs, and creators—open communication, async rituals, and transparent roadmaps so everyone stays aligned.",
  },
  {
    index: "03",
    title: "Playful Seriousness",
    body: "Tone can stay light while the craft stays sharp. Humor and trust belong in the process so teams stay energized without losing the standard.",
  },
];

export const INTRO_POINTS = [
  "Align on objectives, milestones, and responsibilities in 30 focused minutes.",
  "Share docs, decks, and context so we can move quickly if we work together.",
  "Leave with next steps, resource needs, and a clear summary.",
] as const;

export const SOCIALS: Social[] = [
  {
    label: "X (Twitter)",
    handle: "@NChikuji",
    href: "https://x.com/NChikuji",
    note: "Product updates, shipping notes, and current work.",
  },
  {
    label: "LinkedIn",
    handle: "@nicholas-chikuji",
    href: "https://www.linkedin.com/in/nico-chikuji/",
    note: "Background, collaboration, and professional inquiries.",
  },
  {
    label: "GitHub",
    handle: "@chiku524",
    href: "https://github.com/chiku524",
    note: "Source, experiments, and ongoing development.",
  },
  {
    label: "Reddit",
    handle: "u/nicopico524",
    href: "https://www.reddit.com/user/nicopico524/",
    note: "Community discussion and technical threads.",
  },
  {
    label: "YouTube",
    handle: "@nicochikuji",
    href: "https://www.youtube.com/@nicochikuji",
    note: "Walkthroughs and behind-the-scenes build videos.",
  },
  {
    label: "Discord",
    handle: "nkc6469",
    href: "https://discord.com/users/nkc6469",
    note: "Direct messages for demos, questions, or collaboration.",
  },
];

export const ZONES = [
  { id: "top", scene: "Surface", nav: null, weight: 1.9 },
  { id: "about", scene: "The drop", nav: "About", weight: 2.3 },
  {
    id: "work",
    scene: "Coral garden",
    nav: "Work",
    weight: 1 + PROJECTS.length * 0.5,
  },
  { id: "skills", scene: "Kelp forest", nav: "Skills", weight: 3.9 },
  { id: "approach", scene: "The arches", nav: "Approach", weight: 3.2 },
  { id: "contact", scene: "The clearing", nav: "Contact", weight: 0 },
] as const;

export type ZoneId = (typeof ZONES)[number]["id"];
