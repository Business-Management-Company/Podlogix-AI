import type { Category, Creator, Podcast, Testimonial } from "./types";

/**
 * Seed content in the exact shape the sections render. Live data from
 * registered Podlogix creators and from Podchaser is merged on top of this in
 * lib/content.ts, so the homepage is never short of cards while the platform
 * is filling up.
 */

export const categories: Category[] = [
  { slug: "health", name: "Health & Wellness", showsLabel: "30 Shows", icon: "suitcase-medical", height: 320 },
  { slug: "business", name: "Business", showsLabel: "30 Shows", icon: "suitcase", height: 240 },
  { slug: "technology", name: "Technology", showsLabel: "30 Shows", icon: "rocket", height: 280 },
  { slug: "science", name: "Science", showsLabel: "30 Shows", icon: "flask", height: 200 },
  { slug: "education", name: "Education", showsLabel: "30 Shows", icon: "graduation-cap", height: 240 },
  { slug: "science-culture", name: "Science & Culture", showsLabel: "30 Shows", icon: "atom", height: 320 },
  { slug: "comedy", name: "Comedy", showsLabel: "30 Shows", icon: "smile", height: 280 },
  { slug: "news", name: "News", showsLabel: "30 Shows", icon: "newspaper", height: 200 },
  { slug: "sports", name: "Sports", showsLabel: "30 Shows", icon: "football", height: 240 },
  { slug: "true-crime", name: "True crime", showsLabel: "30 Shows", icon: "warning", height: 200 },
  { slug: "music", name: "Music", showsLabel: "30 Shows", icon: "music", height: 240 },
  { slug: "history", name: "History", showsLabel: "30 Shows", icon: "map", height: 320 },
  { slug: "arts", name: "Arts", showsLabel: "30 Shows", icon: "palette", height: 240 },
  { slug: "spirituality", name: "Spirituality", showsLabel: "30 Shows", icon: "users", height: 280 },
  { slug: "military", name: "Military & Veterans", showsLabel: "30 Shows", icon: "jet-fighter", height: 320 },
];

export const trendingSeed: Podcast[] = [
  {
    id: "seed-1",
    title: "Financial management for gen z",
    category: "Education",
    episodeLabel: "New era of financial (Eps. 02)",
    description:
      "Key strategies on saving, investing, and managing cash flow in your early 20s to achieve your financial freedom early.",
    durationLabel: "48 Mins",
    listenersLabel: "12.4K Listeners",
    artwork: "/l/images/trending/1.webp",
    artworkPosition: "50% 30%",
  },
  {
    id: "seed-2",
    title: "Financial management for gen z",
    category: "Education",
    episodeLabel: "New era of financial (Eps. 02)",
    description:
      "Key strategies on saving, investing, and managing cash flow in your early 20s to achieve your financial freedom early.",
    durationLabel: "48 Mins",
    listenersLabel: "12.4K Listeners",
    artwork: "/l/images/trending/2.webp",
    artworkPosition: "50% 49%",
  },
  {
    id: "seed-3",
    title: "Financial management for gen z",
    category: "Education",
    episodeLabel: "New era of financial (Eps. 02)",
    description:
      "Key strategies on saving, investing, and managing cash flow in your early 20s to achieve your financial freedom early.",
    durationLabel: "48 Mins",
    listenersLabel: "12.4K Listeners",
    artwork: "/l/images/trending/3.webp",
    artworkPosition: "50% 43%",
  },
  {
    id: "seed-4",
    title: "Financial management for gen z",
    category: "Education",
    episodeLabel: "New era of financial (Eps. 02)",
    description:
      "Key strategies on saving, investing, and managing cash flow in your early 20s to achieve your financial freedom early.",
    durationLabel: "48 Mins",
    listenersLabel: "12.4K Listeners",
    artwork: "/l/images/trending/4.webp",
    artworkPosition: "50% 37%",
  },
  {
    id: "seed-5",
    title: "Financial management for gen z",
    category: "Education",
    episodeLabel: "New era of financial (Eps. 02)",
    description:
      "Key strategies on saving, investing, and managing cash flow in your early 20s to achieve your financial freedom early.",
    durationLabel: "48 Mins",
    listenersLabel: "12.4K Listeners",
    artwork: "/l/images/trending/5.webp",
    artworkPosition: "50% 32%",
  },
];

export const creatorsSeed: Creator[] = [
  { id: "c1", name: "Alexander Himawan", listenersLabel: "1,4K+ Listener", photo: "/l/images/creators/1.webp", photoPosition: "22% 100%" },
  { id: "c2", name: "Sarah Lauravioza", listenersLabel: "1,4K+ Listener", photo: "/l/images/creators/2.webp", photoPosition: "43% 0%" },
  { id: "c3", name: "Josephyne Alexandria", listenersLabel: "1,4K+ Listener", photo: "/l/images/creators/3.webp", photoPosition: "50% 0%" },
  { id: "c4", name: "Marcus Reinaldo", listenersLabel: "5,7K+ Listener", photo: "/l/images/testimonials/2.webp", photoPosition: "50% 0%" },
  { id: "c5", name: "Elena Kusuma", listenersLabel: "2,1K+ Listener", photo: "/l/images/trending/2.webp", photoPosition: "50% 20%" },
  { id: "c6", name: "Damian Wirawan", listenersLabel: "760+ Listener", photo: "/l/images/trending/1.webp", photoPosition: "50% 30%" },
  { id: "c7", name: "Nadia Prameswari", listenersLabel: "4,3K+ Listener", photo: "/l/images/trending/3.webp", photoPosition: "50% 20%" },
  { id: "c8", name: "Theo Anggara", listenersLabel: "1,9K+ Listener", photo: "/l/images/trending/4.webp", photoPosition: "50% 20%" },
  { id: "c9", name: "Priya Sundaram", listenersLabel: "6,4K+ Listener", photo: "/l/images/testimonials/3.webp", photoPosition: "50% 0%" },
  { id: "c10", name: "Rafael Mahendra", listenersLabel: "2,8K+ Listener", photo: "/l/images/trending/5.webp", photoPosition: "50% 40%" },
];

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    quote: "“We went from three separate tools to one workspace. Sponsors get a media kit in minutes instead of a week.”",
    name: "Alexandria Josephyne",
    role: "Podcast creators of Josephyne Talks",
    photo: "/l/images/testimonials/1.webp",
    photoPosition: "74% 0%",
  },
  {
    id: "t2",
    quote: "“We went from three separate tools to one workspace. Sponsors get a media kit in minutes instead of a week.”",
    name: "Alexandria Josephyne",
    role: "Podcast creators of Josephyne Talks",
    photo: "/l/images/testimonials/2.webp",
    photoPosition: "0% 8%",
  },
  {
    id: "t3",
    quote: "“We went from three separate tools to one workspace. Sponsors get a media kit in minutes instead of a week.”",
    name: "Alexandria Josephyne",
    role: "San Antonio Homeowners",
    photo: "/l/images/testimonials/3.webp",
    photoPosition: "50% 50%",
  },
];

export const pipeline = [
  { key: "create", title: "Create", sub: "Studio, guests, recording", icon: "plus" },
  { key: "stream", title: "Stream", sub: "RTMP, destinations, live events", icon: "screencast" },
  { key: "transform", title: "Transform", sub: "AI clips, newsletters, posts", icon: "video" },
  { key: "distribute", title: "Distribute", sub: "Podcast feeds, social, video", icon: "microphone" },
  { key: "grow", title: "Grow", sub: "Subscribers, audience, analytics", icon: "users" },
  { key: "monetize", title: "Monetize", sub: "Ads, sponsors, tips, memberships", icon: "screencast" },
] as const;

export const plans = [
  {
    key: "starter",
    name: "Starter",
    price: "Free",
    period: "",
    blurb: "For new shows getting off the ground and try to get started.",
    features: ["Hosting & RSS for one show", "Core AI tools", "Creator profile"],
    cta: "Start your demo",
    featured: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "$29",
    period: "/month after beta",
    blurb: "For growing podcasts with an audience to manage.",
    features: ["Everything in Starter", "Full AI production toolkit", "Voice identity protection", "Clips & social hub"],
    cta: "Join the beta free",
    featured: true,
  },
  {
    key: "business",
    name: "Business",
    price: "$99",
    period: "/month after beta",
    blurb: "For networks and teams running multiple shows.",
    features: ["Everything in Starter", "Full AI production toolkit", "Voice identity protection", "Clips & social hub"],
    cta: "Contact our team",
    featured: false,
  },
] as const;

export const footerColumns = [
  { heading: "Workspace", links: ["Dashboard", "Live studio", "Podcast", "Refiner"] },
  { heading: "Content engine", links: ["Podcast", "Livestream", "Conference", "Live event"] },
  { heading: "Navigation", links: ["Features", "Integrations", "Pricing", "About"] },
  { heading: "Company", links: ["Privacy policy", "Terms of services"] },
] as const;
