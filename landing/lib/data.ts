import type { Category, Creator, Podcast, Testimonial } from "./types";

/**
 * Seed content in the exact shape the sections render. Live data from
 * registered Podlogix creators and from Podchaser is merged on top of this in
 * lib/content.ts, so the homepage is never short of cards while the platform
 * is filling up.
 */

/**
 * Fallback categories, refreshed by lib/content when the live feed answers:
 * labels and counts from the app's categories feed, artwork from Apple's
 * per-genre charts, both as they stood on 3 Sep 2026.
 */
export const categories: Category[] = [
  { slug: "health-wellness", name: "Health & wellness", showsLabel: "132K Shows", icon: "heart-pulse", height: 320, art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/65/4a/f4/654af4a7-d5cd-2317-91a1-b5913de83e6f/mza_12950421134232165951.jpeg/600x600bb.jpg" },
  { slug: "business", name: "Business", showsLabel: "176.2K Shows", icon: "suitcase", height: 240, art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts115/v4/55/21/67/55216775-731a-1a0b-6c2a-81923902f058/mza_11706571282358600140.jpeg/600x600bb.jpg" },
  { slug: "technology", name: "Technology", showsLabel: "48.3K Shows", icon: "chip", height: 280, art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/b2/b4/80/b2b48020-11e7-92a9-db46-b7d475a19757/mza_619091211434212889.jpg/600x600bb.jpg" },
  { slug: "science", name: "Science", showsLabel: "47.8K Shows", icon: "flask", height: 200, art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/96/57/ca/9657caf6-6375-d5ba-585b-eb2f5c9fbf8e/mza_3992023160251207455.jpeg/600x600bb.jpg" },
  { slug: "education", name: "Education", showsLabel: "49.9K Shows", icon: "graduation-cap", height: 240, art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/f8/75/0c/f8750cf1-ca31-5d55-00a1-ce86329309d5/mza_11785095184998327365.jpeg/600x600bb.jpg" },
  { slug: "society-culture", name: "Society & culture", showsLabel: "148.9K Shows", icon: "comments", height: 320, art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/63/95/85/63958592-550c-9c6c-8319-2818cd10a3ad/mza_15908877599917864646.jpg/600x600bb.jpg" },
  { slug: "comedy", name: "Comedy", showsLabel: "30.3K Shows", icon: "smile", height: 280, art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/28/ef/d3/28efd382-e0cf-7dd6-99c7-7b74b30a616f/mza_3890332495421370376.jpg/600x600bb.jpg" },
  { slug: "news", name: "News", showsLabel: "141.1K Shows", icon: "newspaper", height: 200, art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/ab/64/66/ab6466a9-9a7d-e20e-7a3d-bc5be37d29ce/mza_15084852813176276273.jpg/600x600bb.jpg" },
  { slug: "sports", name: "Sports", showsLabel: "87.7K Shows", icon: "trophy", height: 240, art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/35/74/6a/35746a0c-7687-7dde-ff04-338d93e78303/mza_10377078556009223546.jpg/600x600bb.jpg" },
  { slug: "true-crime", name: "True crime", showsLabel: "67.4K Shows", icon: "shield", height: 200, art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/8c/35/04/8c350430-2fbf-98d0-0a25-00b76550ffeb/mza_13445204151221888086.jpg/600x600bb.jpg" },
  { slug: "music", name: "Music", showsLabel: "199.1K Shows", icon: "music", height: 240, art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/b5/2c/5f/b52c5f0b-e193-a9e2-fde1-295925d5419c/mza_12616703772719032641.jpg/600x600bb.jpg" },
  { slug: "history", name: "History", showsLabel: "72.2K Shows", icon: "landmark", height: 320, art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/a3/05/8f/a3058ff1-eff9-036b-f412-8c4e96aad380/mza_221907431660085079.jpg/600x600bb.jpg" },
  { slug: "arts", name: "Arts", showsLabel: "19K Shows", icon: "palette", height: 240, art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/68/35/32/683532c0-dd91-676a-eeef-3ace951cd6e9/mza_6896198885971355473.jpg/600x600bb.jpg" },
  { slug: "spirituality", name: "Spirituality", showsLabel: "35.2K Shows", icon: "globe", height: 280, art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/ca/87/e0/ca87e07d-9d97-a433-1dc9-55dcfbd54f17/mza_9875864189557480350.jpg/600x600bb.jpg" },
  { slug: "military-veterans", name: "Military & veterans", showsLabel: "10.3K Shows", icon: "medal", height: 320, art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/fe/0c/18/fe0c1878-2d5f-4f57-7725-860fa7f660dc/mza_2281502722003748202.jpg/600x600bb.jpg" },
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
