import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Search,
  Mic,
  Shield,
  Radio,
  Rss,
  Share2,
  Sparkles,
  Bell,
  User,
  HelpCircle,
  BookOpen,
  FileText,
  Headphones,
  Zap,
  Lock,
  Mail,
  ExternalLink,
} from "lucide-react";

import kbSubscriptionsImg from "@/assets/images/kb-subscriptions.png";
import kbBriefingsImg from "@/assets/images/kb-briefings.png";
import kbVoiceCertImg from "@/assets/images/kb-voice-cert.png";
import kbInterestsImg from "@/assets/images/kb-interests.png";

interface Article {
  id: string;
  title: string;
  description: string;
  content: string[];
  category: string;
  icon: React.ReactNode;
  tags: string[];
  image?: string;
}

const articles: Article[] = [
  {
    id: "voice-certification",
    title: "Voice Identity Protection",
    description: "Learn how to certify your voice on the blockchain to protect against AI impersonation.",
    category: "Identity Protection",
    icon: <Shield className="h-5 w-5" />,
    tags: ["blockchain", "voice", "NFT", "polygon"],
    image: kbVoiceCertImg,
    content: [
      "Voice Identity Protection uses blockchain technology to create a verifiable certificate of your unique voice.",
      "How it works:",
      "1. Record a voice sample through our secure interface",
      "2. Your voice fingerprint is analyzed and encrypted",
      "3. A unique NFT certificate is minted on the Polygon blockchain",
      "4. You receive a shareable certificate proving voice ownership",
      "Benefits:",
      "• Protect against AI deepfakes and voice cloning",
      "• Prove ownership of your voice in disputes",
      "• Share verified certificates with platforms and partners",
      "• Immutable blockchain record that can't be altered",
    ],
  },
  {
    id: "likeness-certification",
    title: "Likeness Protection",
    description: "Certify your image and likeness to prevent unauthorized AI-generated content.",
    category: "Identity Protection",
    icon: <User className="h-5 w-5" />,
    tags: ["blockchain", "image", "NFT", "protection"],
    content: [
      "Likeness Protection extends blockchain certification to your visual identity.",
      "What's protected:",
      "• Your face and physical appearance",
      "• Brand imagery and logos",
      "• Video content featuring you",
      "How to certify:",
      "1. Upload clear photos of yourself or your brand",
      "2. Our AI analyzes and creates a unique likeness signature",
      "3. The signature is minted as an NFT on Polygon",
      "4. Use the certificate to prove ownership of your likeness",
    ],
  },
  {
    id: "podcast-subscriptions",
    title: "Podcast Subscriptions",
    description: "Subscribe to podcasts via RSS or import from Spotify.",
    category: "Listener Features",
    icon: <Radio className="h-5 w-5" />,
    tags: ["podcasts", "RSS", "Spotify", "subscriptions"],
    image: kbSubscriptionsImg,
    content: [
      "Stay updated with your favorite podcasts using our subscription system.",
      "Two ways to subscribe:",
      "RSS Feed: Paste any podcast RSS feed URL to subscribe directly",
      "Spotify Import: Connect your Spotify account to import podcasts you follow",
      "Managing subscriptions:",
      "• View all subscribed podcasts in one place",
      "• See episode counts and latest updates",
      "• Easily unsubscribe from podcasts you no longer follow",
      "• Episodes are automatically tracked as they're published",
    ],
  },
  {
    id: "ai-briefings",
    title: "AI-Powered Briefings",
    description: "Get personalized summaries of podcast episodes based on your interests.",
    category: "Listener Features",
    icon: <Sparkles className="h-5 w-5" />,
    tags: ["AI", "summaries", "personalization", "OpenAI"],
    image: kbBriefingsImg,
    content: [
      "AI Briefings transform long podcast episodes into personalized, actionable summaries.",
      "What you get:",
      "• Key quotes from the episode",
      "• Summary tailored to your interests",
      "• Action items and takeaways",
      "• Relevance score (0-100) showing how relevant the episode is to you",
      "How it works:",
      "1. OpenAI Whisper transcribes the audio",
      "2. GPT-4o analyzes the transcript against your interests",
      "3. A personalized briefing is generated with highlights",
      "4. You receive a notification when it's ready",
      "Note: Briefings focus on content, not timestamps.",
    ],
  },
  {
    id: "user-interests",
    title: "Interest Profiles",
    description: "Define topics and keywords for AI to track across all your podcasts.",
    category: "Listener Features",
    icon: <Zap className="h-5 w-5" />,
    tags: ["interests", "personalization", "keywords", "topics"],
    image: kbInterestsImg,
    content: [
      "Your interest profile helps AI understand what matters most to you.",
      "Setting up interests:",
      "1. Go to the Listener Dashboard",
      "2. Click 'Add Interest' to create a new topic",
      "3. Enter a topic name (e.g., 'AI Technology')",
      "4. Add keywords to track (e.g., 'machine learning', 'neural networks')",
      "5. Set priority level: High, Medium, or Low",
      "How interests improve briefings:",
      "• AI focuses on content matching your keywords",
      "• Higher priority interests get more attention",
      "• Relevance scores reflect how well episodes match your profile",
      "• You can update interests anytime to refine results",
    ],
  },
  {
    id: "rss-management",
    title: "RSS Feed Management",
    description: "Create and manage your podcast's RSS feed for distribution.",
    category: "Podcaster Tools",
    icon: <Rss className="h-5 w-5" />,
    tags: ["RSS", "feed", "podcasting", "distribution"],
    content: [
      "Your RSS feed is the backbone of podcast distribution.",
      "Creating your feed:",
      "1. Go to Dashboard > RSS Management",
      "2. Fill in your podcast details (title, description, artwork)",
      "3. Add episode information",
      "4. Your RSS feed URL is automatically generated",
      "Feed features:",
      "• Industry-standard RSS 2.0 format",
      "• Compatible with all major podcast platforms",
      "• Automatic updates when you add episodes",
      "• iTunes-compatible tags for Apple Podcasts",
    ],
  },
  {
    id: "multi-platform-distribution",
    title: "Multi-Platform Distribution",
    description: "Publish your podcast to Spotify, Apple Podcasts, and more.",
    category: "Podcaster Tools",
    icon: <Share2 className="h-5 w-5" />,
    tags: ["distribution", "Spotify", "Apple", "platforms"],
    content: [
      "Reach listeners everywhere with one-click distribution.",
      "Supported platforms:",
      "• Spotify for Podcasters",
      "• Apple Podcasts",
      "• Google Podcasts",
      "• Amazon Music",
      "• And more...",
      "How to distribute:",
      "1. Ensure your RSS feed is set up",
      "2. Go to Dashboard > Distribution",
      "3. Select platforms to submit to",
      "4. Follow platform-specific instructions",
      "5. Track submission status in the dashboard",
    ],
  },
  {
    id: "public-profile",
    title: "Public Profile (Linktree-style)",
    description: "Create a shareable profile page with all your podcast links.",
    category: "Podcaster Tools",
    icon: <ExternalLink className="h-5 w-5" />,
    tags: ["profile", "links", "branding", "public"],
    content: [
      "Your public profile is a one-stop page for fans to find all your content.",
      "Profile features:",
      "• Custom URL (podlogix.app/p/yourname)",
      "• Profile photo and bio",
      "• Links to all your podcast platforms",
      "• Social media links",
      "• Voice/likeness certification badges",
      "Setting up your profile:",
      "1. Go to Dashboard > Profile",
      "2. Add your photo and bio",
      "3. Add links to your podcast platforms",
      "4. Share your unique URL with your audience",
    ],
  },
  {
    id: "notifications",
    title: "Notifications & Alerts",
    description: "Stay informed with dashboard and email notifications.",
    category: "Features",
    icon: <Bell className="h-5 w-5" />,
    tags: ["notifications", "email", "alerts", "updates"],
    content: [
      "Never miss an update with our notification system.",
      "Notification types:",
      "• New episode alerts from subscribed podcasts",
      "• Briefing ready notifications",
      "• Voice/likeness monitoring alerts",
      "• Platform distribution updates",
      "Delivery methods:",
      "Dashboard: All notifications appear in your notification center",
      "Email: Important alerts are sent to your email via Resend",
      "Managing notifications:",
      "• View all notifications in the dashboard",
      "• Mark as read or dismiss",
      "• Email preferences can be updated in settings",
    ],
  },
  {
    id: "social-monitoring",
    title: "Social Media Monitoring",
    description: "Track potential voice/likeness impersonation on social platforms.",
    category: "Identity Protection",
    icon: <Lock className="h-5 w-5" />,
    tags: ["monitoring", "social", "Meta", "protection"],
    content: [
      "Protect your identity across social media platforms.",
      "What we monitor:",
      "• Instagram content",
      "• Facebook pages and posts",
      "• YouTube videos (coming soon)",
      "How it works:",
      "1. Connect your Meta account",
      "2. We analyze content for potential impersonation",
      "3. Receive alerts when suspicious content is detected",
      "4. Take action with your blockchain-verified certificate",
      "Note: Monitoring requires connected social accounts.",
    ],
  },
];

const categories = [
  { name: "All", icon: <BookOpen className="h-4 w-4" /> },
  { name: "Identity Protection", icon: <Shield className="h-4 w-4" /> },
  { name: "Listener Features", icon: <Headphones className="h-4 w-4" /> },
  { name: "Podcaster Tools", icon: <Mic className="h-4 w-4" /> },
  { name: "Features", icon: <Zap className="h-4 w-4" /> },
];

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      searchQuery === "" ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === "All" || article.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-full bg-background">
      <main className="w-full max-w-6xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-kb-title">
              How can we help you?
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Find answers to common questions and learn how to get the most out of Podlogix.
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
              data-testid="input-search"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <Button
                key={category.name}
                variant={selectedCategory === category.name ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.name)}
                data-testid={`button-category-${category.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {category.icon}
                <span className="ml-2">{category.name}</span>
              </Button>
            ))}
          </div>

          {/* Articles */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredArticles.map((article) => (
                <motion.div
                  key={article.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className="hover-elevate cursor-pointer"
                    onClick={() =>
                      setExpandedArticle(expandedArticle === article.id ? null : article.id)
                    }
                    data-testid={`card-article-${article.id}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-md bg-primary/10 text-primary">
                            {article.icon}
                          </div>
                          <div>
                            <CardTitle className="text-lg" data-testid={`text-article-title-${article.id}`}>
                              {article.title}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {article.description}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary">{article.category}</Badge>
                      </div>
                    </CardHeader>
                    <AnimatePresence>
                      {expandedArticle === article.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent className="pt-2 border-t mt-2">
                            {article.image && (
                              <div className="mb-4 rounded-lg overflow-hidden border">
                                <img
                                  src={article.image}
                                  alt={`${article.title} screenshot`}
                                  className="w-full h-auto"
                                  data-testid={`img-article-${article.id}`}
                                />
                              </div>
                            )}
                            <div className="space-y-2 text-sm text-muted-foreground">
                              {article.content.map((line, index) => (
                                <p
                                  key={index}
                                  className={
                                    line.endsWith(":") ? "font-semibold text-foreground mt-4" : ""
                                  }
                                >
                                  {line}
                                </p>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-4">
                              {article.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredArticles.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No articles found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or category filter.
                </p>
              </div>
            )}
          </div>

          {/* FAQ Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-display font-bold mb-6 text-center">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq-1">
                <AccordionTrigger data-testid="accordion-faq-1">
                  How does voice certification protect me?
                </AccordionTrigger>
                <AccordionContent>
                  Voice certification creates a blockchain-verified record of your unique voice
                  fingerprint. If someone creates AI-generated content using your voice, you can
                  prove ownership with your certificate and take action against impersonators.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-2">
                <AccordionTrigger data-testid="accordion-faq-2">
                  What is a relevance score in briefings?
                </AccordionTrigger>
                <AccordionContent>
                  The relevance score (0-100) indicates how well a podcast episode matches your
                  defined interests. A score of 80+ means the episode is highly relevant to your
                  topics, while lower scores indicate less overlap with your interests.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-3">
                <AccordionTrigger data-testid="accordion-faq-3">
                  Can I import podcasts from Spotify?
                </AccordionTrigger>
                <AccordionContent>
                  Yes! Connect your Spotify account in the Listener Dashboard, and we'll
                  automatically import all the podcasts you follow. You can also manually add
                  podcasts using their RSS feed URL.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-4">
                <AccordionTrigger data-testid="accordion-faq-4">
                  How do AI briefings work?
                </AccordionTrigger>
                <AccordionContent>
                  When you request a briefing, we transcribe the podcast audio using OpenAI
                  Whisper, then use GPT-4o to create a personalized summary based on your
                  interests. The briefing includes key quotes, insights, and action items
                  tailored to what matters to you.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-5">
                <AccordionTrigger data-testid="accordion-faq-5">
                  What blockchain is used for certification?
                </AccordionTrigger>
                <AccordionContent>
                  We use the Polygon blockchain, which is an Ethereum-compatible network with
                  low transaction fees and fast confirmation times. Your certificates are minted
                  as NFTs, providing permanent, verifiable proof of ownership.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Contact Section */}
          <Card className="mt-8">
            <CardContent className="py-8 text-center">
              <Mail className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Still need help?</h3>
              <p className="text-muted-foreground mb-4">
                Can't find what you're looking for? Reach out to our support team.
              </p>
              <Button asChild data-testid="button-contact-support">
                <a href="mailto:support@podlogix.co">Contact Support</a>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
