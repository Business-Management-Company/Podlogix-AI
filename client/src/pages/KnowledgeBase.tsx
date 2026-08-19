import { useState } from "react";
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
  Search,
  Radio,
  Share2,
  Sparkles,
  HelpCircle,
  BookOpen,
  FileText,
  Zap,
  Mic2,
  Users,
  GalleryVerticalEnd,
  FlaskConical,
  Scissors,
  UserPlus,
  PenSquare,
  CalendarRange,
  MessageCircle,
  Link2,
  Mic,
  Plug,
  LayoutDashboard,
} from "lucide-react";

/**
 * /help — the Help Center. Written plainly (aim: an eighth grader can follow
 * any article without help). One article per page of the app, searchable.
 * When a page changes, its article changes in the same PR.
 */

interface Article {
  id: string;
  title: string;
  description: string;
  content: string[];
  category: string;
  icon: React.ReactNode;
  tags: string[];
  figure?: React.ReactNode;
}

/* ── Figures: drawn diagrams that sit beside the words. They're generated from
   the same design (not screenshots), so they never go stale-blurry — and they
   can label the parts a screenshot can't. ── */

function StudioFigure() {
  return (
    <svg viewBox="0 0 640 250" className="h-auto w-full max-w-xl" role="img" aria-label="Diagram of the Live Studio screen">
      <text x="14" y="20" fontSize="12" fill="#71717a">← Exit Studio</text>
      <text x="120" y="20" fontSize="12" fill="#a1a1aa">/ Studios / The Morning Desk</text>
      <rect x="10" y="32" width="450" height="170" rx="12" fill="#18181b" />
      <text x="235" y="112" fontSize="13" fill="#a1a1aa" textAnchor="middle">The stage — what you see is what records</text>
      <rect x="22" y="42" width="46" height="18" rx="9" fill="#dc2626" />
      <text x="45" y="55" fontSize="10" fill="#fff" textAnchor="middle">LIVE</text>
      <rect x="478" y="32" width="152" height="170" rx="12" fill="#27272a" />
      <text x="554" y="56" fontSize="11" fill="#e4e4e7" textAnchor="middle">Layout · Prompter</text>
      <rect x="490" y="68" width="128" height="26" rx="6" fill="#3f3f46" />
      <text x="554" y="85" fontSize="10" fill="#d4d4d8" textAnchor="middle">Fullscreen</text>
      <rect x="490" y="100" width="128" height="26" rx="6" fill="#3f3f46" />
      <text x="554" y="117" fontSize="10" fill="#d4d4d8" textAnchor="middle">Split screen</text>
      <rect x="490" y="132" width="128" height="26" rx="6" fill="#3f3f46" />
      <text x="554" y="149" fontSize="10" fill="#d4d4d8" textAnchor="middle">PiP corners</text>
      <rect x="10" y="212" width="620" height="30" rx="10" fill="#27272a" />
      <text x="24" y="231" fontSize="11" fill="#d4d4d8">Start Camera · Share Screen · mic/cam</text>
      <rect x="292" y="217" width="150" height="20" rx="6" fill="#3f3f46" />
      <text x="367" y="231" fontSize="10" fill="#fff" textAnchor="middle">Mark moment · space</text>
      <rect x="556" y="217" width="64" height="20" rx="6" fill="#dc2626" />
      <text x="588" y="231" fontSize="10" fill="#fff" textAnchor="middle">Go live</text>
    </svg>
  );
}

function GuestFlowFigure() {
  return (
    <svg viewBox="0 0 640 150" className="h-auto w-full max-w-xl" role="img" aria-label="Diagram of the guest invite flow">
      <rect x="8" y="30" width="180" height="86" rx="10" fill="#fafafa" stroke="#e4e4e7" />
      <text x="98" y="55" fontSize="11" fontWeight="600" fill="#18181b" textAnchor="middle">1 · Invite a guest</text>
      <text x="98" y="76" fontSize="10" fill="#71717a" textAnchor="middle">Click the button mid-show —</text>
      <text x="98" y="90" fontSize="10" fill="#71717a" textAnchor="middle">the link copies itself. Text it.</text>
      <text x="204" y="78" fontSize="14" fill="#a1a1aa">→</text>
      <rect x="224" y="30" width="180" height="86" rx="10" fill="#fafafa" stroke="#e4e4e7" />
      <text x="314" y="55" fontSize="11" fontWeight="600" fill="#18181b" textAnchor="middle">2 · Green room</text>
      <text x="314" y="76" fontSize="10" fill="#71717a" textAnchor="middle">Guest opens it — no account.</text>
      <text x="314" y="90" fontSize="10" fill="#71717a" textAnchor="middle">Camera check, type a name.</text>
      <text x="420" y="78" fontSize="14" fill="#a1a1aa">→</text>
      <rect x="440" y="30" width="192" height="86" rx="10" fill="#18181b" />
      <rect x="452" y="44" width="80" height="58" rx="4" fill="#3f3f46" />
      <rect x="540" y="44" width="80" height="58" rx="4" fill="#52525b" />
      <text x="492" y="78" fontSize="10" fill="#e4e4e7" textAnchor="middle">You</text>
      <text x="580" y="78" fontSize="10" fill="#e4e4e7" textAnchor="middle">Guest</text>
      <text x="536" y="132" fontSize="10" fill="#71717a" textAnchor="middle">3 · On the stage — and in the recording</text>
    </svg>
  );
}

function EditingRoomFigure() {
  return (
    <svg viewBox="0 0 640 170" className="h-auto w-full max-w-xl" role="img" aria-label="Diagram of how marks become clips">
      <text x="8" y="18" fontSize="11" fill="#71717a">Your show's timeline — each dot is a moment you marked (or AI found)</text>
      <rect x="8" y="30" width="624" height="10" rx="5" fill="#e4e4e7" />
      <circle cx="120" cy="35" r="6" fill="#d84b2d" />
      <circle cx="300" cy="35" r="6" fill="#d84b2d" />
      <circle cx="500" cy="35" r="6" fill="#d84b2d" />
      <rect x="240" y="52" width="120" height="14" rx="4" fill="#fbeeea" />
      <line x1="300" y1="40" x2="300" y2="52" stroke="#d84b2d" strokeWidth="1.5" />
      <text x="300" y="63" fontSize="9" fill="#d84b2d" textAnchor="middle">20s before ← mark → 10s after</text>
      <text x="300" y="86" fontSize="12" fill="#a1a1aa" textAnchor="middle">↓ Cut clip</text>
      <rect x="212" y="96" width="176" height="52" rx="10" fill="#fafafa" stroke="#e4e4e7" />
      <text x="300" y="118" fontSize="11" fontWeight="600" fill="#18181b" textAnchor="middle">A 30-second clip</text>
      <text x="300" y="134" fontSize="10" fill="#71717a" textAnchor="middle">+ captions (.srt/.vtt) · 16:9 or 9:16</text>
      <text x="470" y="122" fontSize="11" fill="#71717a">→ lands in your Media Library</text>
    </svg>
  );
}

function RecordingJourneyFigure() {
  return (
    <svg viewBox="0 0 640 120" className="h-auto w-full max-w-xl" role="img" aria-label="Diagram of where a recording goes after the show">
      <rect x="8" y="36" width="120" height="48" rx="10" fill="#18181b" />
      <text x="68" y="58" fontSize="11" fill="#fff" textAnchor="middle">End show</text>
      <text x="68" y="74" fontSize="9" fill="#a1a1aa" textAnchor="middle">recording uploads</text>
      <text x="140" y="64" fontSize="14" fill="#a1a1aa">→</text>
      <rect x="162" y="36" width="150" height="48" rx="10" fill="#fafafa" stroke="#e4e4e7" />
      <text x="237" y="58" fontSize="11" fontWeight="600" fill="#18181b" textAnchor="middle">Media Library</text>
      <text x="237" y="74" fontSize="9" fill="#71717a" textAnchor="middle">files itself, named after the show</text>
      <text x="324" y="64" fontSize="14" fill="#a1a1aa">→</text>
      <rect x="346" y="36" width="150" height="48" rx="10" fill="#fafafa" stroke="#e4e4e7" />
      <text x="421" y="58" fontSize="11" fontWeight="600" fill="#18181b" textAnchor="middle">MP4 conversion</text>
      <text x="421" y="74" fontSize="9" fill="#71717a" textAnchor="middle">automatic, in the background</text>
      <text x="508" y="64" fontSize="14" fill="#a1a1aa">→</text>
      <rect x="530" y="36" width="102" height="48" rx="10" fill="#fbeeea" />
      <text x="581" y="58" fontSize="11" fontWeight="600" fill="#b0341a" textAnchor="middle">Plays</text>
      <text x="581" y="74" fontSize="9" fill="#b0341a" textAnchor="middle">everywhere</text>
    </svg>
  );
}

const articles: Article[] = [
  // ── Get started ──
  {
    id: "what-is-podlogix",
    title: "What is Podlogix?",
    description: "The big idea, in one minute.",
    category: "Get Started",
    icon: <Zap className="h-5 w-5" />,
    tags: ["overview", "start", "basics"],
    content: [
      "Podlogix is a home base for people who make podcasts and live shows.",
      "Here's the big idea: you do the show, and Podlogix does everything after. You record an episode, and the app helps turn that one recording into a whole week of content — short clips, captions, cleaned-up audio, and social media posts.",
      "The main rooms:",
      "• The Studio — where you record or go live, with your camera, screen, media, and guests.",
      "• Refiner — turns raw conversations into clear, compelling content.",
      "• Media Storage — where every recording, clip, and file lives.",
      "• The Media Lab — where files get converted and cleaned up.",
      "• Social — where you write and schedule posts for all your accounts.",
      "• Guests & CRM — where you keep track of the people who come on your show.",
      "You don't need to learn everything at once. Start with the Studio, do one show, and follow where the app takes you.",
    ],
  },
  {
    id: "dashboard",
    title: "Your Dashboard",
    description: "The first screen you see, and what everything on it means.",
    category: "Get Started",
    icon: <LayoutDashboard className="h-5 w-5" />,
    tags: ["dashboard", "today", "home"],
    content: [
      "The Dashboard is your morning check-in. It answers: how is my show doing, and what's happening today?",
      "The big three at the top:",
      "• Studio — this card is alive. It checks that your camera and mic are actually there, shows the channels you've picked, and changes with your day: it counts down when a calendar event is under an hour away, switches to On Air while you're live, and celebrates an episode you shipped in the last two days with a Promote button.",
      "• Podcast Overview — episode counts, total runtime, and the status of your hosting links (Spotify, Apple, RSS and friends).",
      "• Studio Activity — a chart of your real minutes on the air over the last two weeks, plus streams, clips, and followers. Every number is measured; nothing is invented.",
      "The middle row:",
      "• Social Performance — your connected channels with real follower counts. Nothing connected? It shows a Connect button instead of an empty card.",
      "• Weekly Schedule and Calendar — your Google Calendar events, as a list and as a month view with dots on busy days.",
      "• Upcoming Releases — episode drafts you're still working on.",
      "The bottom row keeps Recent Activity (episodes, streams, and clips as they happen), your Latest Episodes, and Quick Actions to jump anywhere in one click.",
      "New Content in the top-right corner starts anything: record, new episode, a post, or new media.",
    ],
  },
  {
    id: "connectors",
    title: "Connecting your accounts",
    description: "Link your social accounts, calendar, and podcast host.",
    category: "Get Started",
    icon: <Plug className="h-5 w-5" />,
    tags: ["connect", "accounts", "instagram", "youtube", "calendar"],
    content: [
      "Podlogix can post to your social accounts and read your calendar — but only after you connect them. Connecting is safe: you log in on the real site (like Instagram or Google), and Podlogix never sees your password.",
      "How to connect:",
      "1. Open Connectors from the left rail (the plug icon).",
      "2. Pick the service you want to connect.",
      "3. A window opens on that service's own website. Log in and approve.",
      "4. You come right back to Podlogix, connected.",
      "Sometimes a connection expires (services do this on purpose for safety). When that happens you'll see a 'reconnect' warning — just click it and approve again.",
    ],
  },

  // ── Studio ──
  {
    id: "live-studio",
    figure: <StudioFigure />,
    title: "The Live Studio",
    description: "Record a show with your camera and screen — like a TV studio in your browser.",
    category: "Studio",
    icon: <Radio className="h-5 w-5" />,
    tags: ["studio", "record", "live", "camera", "layouts", "teleprompter"],
    content: [
      "The Live Studio takes over your whole screen. To leave, click Exit Studio in the top-left corner — everything goes back to normal.",
      "The workspace:",
      "You land in your workspace first — a list of your studios (each one is a room you come back to). Hit New Stream to build one, or Enter Studio on any row. The workspace also holds Past streams, Clips, Storage, and Channels.",
      "Hover any studio row and click the pencil to edit it — rename the studio or upload a thumbnail image so your list is easy to scan. The trash can next to it deletes the studio (your recordings and clips stay safe).",
      "On the stage:",
      "• The camera, screen-share, and invite-guest buttons are the round icons at the bottom left — hover any icon to see its name.",
      "• Layouts are the little pictures in the strip under the stage: fullscreen, picture-in-picture corners, split screen. What you see on the stage is exactly what gets recorded.",
      "• Scenes (left side) are saved stage setups. Arrange the stage — a layout plus maybe a video or image — type a name like 'Countdown' or 'Welcome', and press +. During the show, one click swaps the whole stage.",
      "• Media and Prompter live in the right panel. Media plays videos or shows images from your storage on the stage; the Prompter scrolls your script over the stage (you see it, the recording doesn't). Drag the panel's edge to resize everything proportionally.",
      "• Channels (top bar) is where you pick the platforms this studio will stream to — the setup saves now, and multistreaming switches on when Stream + Record ships.",
      "The most important button:",
      "When something great happens during your show, press the spacebar (or 'Mark moment'). That drops a bookmark at that exact second. After the show, each bookmark becomes a short clip. You don't have to remember when the good stuff happened — just tap space when it does.",
    ],
  },
  {
    id: "guests",
    figure: <GuestFlowFigure />,
    title: "Inviting a guest onto your show",
    description: "Send one link. Your guest appears on your stage — no account needed.",
    category: "Studio",
    icon: <UserPlus className="h-5 w-5" />,
    tags: ["guest", "invite", "green room", "interview"],
    content: [
      "You can bring a guest onto your show with one link — before you're live or during the show.",
      "How it works:",
      "1. Click the invite icon (the person with a +) in the studio's control bar. A window pops up with the link — it's already copied, and you can read it right there.",
      "2. Send it any way you like. Your guest opens it — no account needed.",
      "3. They land in a green room: they see their own camera, check their hair, and type their name.",
      "4. When they click 'Join the show', they appear on your stage — and in your recording.",
      "The link belongs to the studio, so it keeps working show after show — you can even put it in a calendar invite the day before. You control how guests look on the stage with the same layout strip: side-by-side interview, or a small corner window.",
    ],
  },
  {
    id: "editing-room",
    figure: <EditingRoomFigure />,
    title: "The Editing Room",
    description: "After the show: turn bookmarks into clips, add captions, clean the audio.",
    category: "Studio",
    icon: <Scissors className="h-5 w-5" />,
    tags: ["clips", "captions", "editing", "refine", "AI"],
    content: [
      "When your show ends, the studio switches to the Editing Room (you can flip between Stage and Editing Room at the top-right). This room is all about clips.",
      "What you can do here:",
      "• Find clips with AI — the app listens to your whole recording and marks the strong moments for you. Great if you forgot to press space.",
      "• Cut clip — every marked moment becomes a 30-second clip: 20 seconds before the mark and 10 after. Why before? Because when you think 'that was great!', the great part already happened. Pick 16:9 or 9:16 vertical.",
      "• Captions — makes subtitle files (.srt and .vtt) so your clips have text on social media.",
      "• Refine this show — the red button sends the whole recording to Refiner, where the polish happens.",
      "Everything you make here lands in Media Storage automatically.",
    ],
  },
  {
    id: "refinery",
    title: "Refiner",
    description: "One button that polishes a whole recording — for real.",
    category: "Studio",
    icon: <Sparkles className="h-5 w-5" />,
    tags: ["refiner", "refine", "polish", "audio", "pipeline"],
    content: [
      "Refiner turns raw conversations into clear, compelling content. Find it in the nav, right under Live Studio.",
      "How to use it:",
      "1. Pick a recording from the list on the left — anything in your storage works.",
      "2. Press 'Refine my show'. A glowing ring runs around the player while the pipeline works.",
      "3. Watch the checkmarks on the right: Transcription (every word written down), Remove gaps (dead air cut), Audio cleanup (volume evened to podcast standard).",
      "4. When it finishes, a Before / After comparison appears — play both and hear the difference. The refined version is already saved to Media Storage.",
      "The numbers below are measured from your actual files: minutes saved is literally how much shorter the refined audio is. Two steps say 'Coming' — Remove fillers and Enhance video — because they're not built yet. When you see a checkmark in Refiner, something really happened to your file.",
    ],
  },
  {
    id: "recordings",
    figure: <RecordingJourneyFigure />,
    title: "Where your recording goes",
    description: "It saves itself, files itself, and converts itself. Here's the journey.",
    category: "Studio",
    icon: <FileText className="h-5 w-5" />,
    tags: ["recording", "mp4", "webm", "vod", "convert"],
    content: [
      "When you end a show you recorded in the studio, three things happen on their own:",
      "1. The recording uploads to your storage.",
      "2. It files itself into Media Storage, named after your show.",
      "3. It converts itself to MP4 in the background.",
      "Why the conversion? Web browsers can only record in a format called WebM. It plays fine on the web, but iPhones and most social media sites prefer MP4. So Podlogix quietly makes the MP4 version for you. You never have to think about file formats — but now you know why it happens.",
    ],
  },

  // ── Media ──
  {
    id: "media-library",
    title: "Media Storage",
    description: "One shelf for everything: recordings, clips, refined audio, and imports.",
    category: "Media",
    icon: <GalleryVerticalEnd className="h-5 w-5" />,
    tags: ["library", "files", "badges", "import"],
    content: [
      "Media Storage is one shelf that every part of Podlogix shares. The studio puts recordings and clips on it; the Media Lab puts converted files on it; the post composer takes files off it.",
      "Reading the page:",
      "• The number cards at the top count your files, videos, audio, and refined items.",
      "• The chips filter the grid: All, Videos, Audio, From the studio, Refined.",
      "• Each card has a badge that tells you where the file came from: 'Studio' means it came out of the Live Studio, 'Refined' means the Media Lab cleaned or converted it, and a platform icon means it was imported from a social account.",
      "'Import from your channels' copies your old social posts into the library so you can reuse them.",
      "'Add media' lets you put your own files in: upload a video or audio file from your computer, or paste a link. A direct file link (.mp4, .mp3) gets copied into your storage. A YouTube link is saved as a reference — the video stays on YouTube, but you can find it here.",
    ],
  },
  {
    id: "media-lab",
    title: "The Media Lab",
    description: "The conversion bench: pick a file, pick an operation, press Run.",
    category: "Media",
    icon: <FlaskConical className="h-5 w-5" />,
    tags: ["lab", "convert", "refine", "mp3", "mp4", "ffmpeg"],
    content: [
      "The Media Lab changes files from one form into another. It works like a workbench: pick your source on the left, pick an operation, and press Run Job on the right.",
      "The operations:",
      "• Refine Audio — the one-click cleanup. Cuts silence and dead air, and masters the loudness to podcast standard. This does real editing to the real file.",
      "• Convert to MP4 — turns any video into the format everything can play.",
      "• Extract Audio — pulls just the sound out of a video, as an MP3. A video becomes a podcast episode.",
      "• Compress for Web — makes the file smaller without wrecking the quality.",
      "When a job finishes, you can Download the file or press 'Save to library' — saved files show up in your Media Library with a Refined badge.",
      "The rail on the right also shows your processing minutes for the month, so you always know how much you have left.",
    ],
  },
  {
    id: "speaking-analysis",
    title: "Speaking Analysis",
    description: "AI coaching on how someone comes across on camera.",
    category: "Media",
    icon: <Mic2 className="h-5 w-5" />,
    tags: ["speaking", "coaching", "analysis", "fillers"],
    content: [
      "Speaking Analysis grades a recording the way a speech coach would. It's built for checking how a guest (or you!) comes across.",
      "Where to find it: open any guest in Guests & CRM and click 'Analyze their speaking'. Then pick one of your videos, or paste a video link.",
      "What you get back:",
      "• Four scores: Overall, Presence, Speaking ability, and Filler control.",
      "• Written coaching notes — specific, not generic.",
      "• A count of every filler word, like \"um\" × 12 — so you know exactly what to work on.",
      "It analyzes your own recordings, listening to what was actually said.",
    ],
  },

  // ── Guests ──
  {
    id: "guests-crm",
    title: "Guests & CRM",
    description: "Keep track of everyone who might come on your show.",
    category: "Guests",
    icon: <Users className="h-5 w-5" />,
    tags: ["crm", "guests", "pipeline", "notes", "invite"],
    content: [
      "Guests & CRM is your address book for show guests — plus a pipeline that remembers where each conversation stands.",
      "Each guest has a stage, like Prospect (you're thinking about them) or Invited (you asked them on). The chips at the top count guests in each stage.",
      "Click a guest and their card slides open:",
      "• Their contact details, company, and role.",
      "• A notes trail with timestamps — jot down what you talked about, and it's there next time.",
      "• 'Analyze their speaking' — AI coaching on a clip of them (see the Speaking Analysis article).",
      "• Invite — moves them to Invited and drafts the invitation email for you.",
    ],
  },
  {
    id: "discover-directory",
    title: "Discover & Directory",
    description: "Find creators worth inviting, and save the good ones.",
    category: "Guests",
    icon: <Search className="h-5 w-5" />,
    tags: ["discover", "directory", "creators", "research"],
    content: [
      "Discover searches for creators across social platforms — by topic, name, or handle. Each result shows their followers, engagement, and contact info when available.",
      "When you find someone interesting, save them. Saved creators go to your Directory, organized into lists you name yourself (like 'Veteran founders' or 'Fitness pods').",
      "The flow: Discover someone → save to Directory → when you're ready, add them to Guests & CRM and start the conversation.",
    ],
  },

  // ── Social ──
  {
    id: "posts",
    title: "Writing a post",
    description: "One composer for every platform, with AI that writes in your voice.",
    category: "Social",
    icon: <PenSquare className="h-5 w-5" />,
    tags: ["posts", "composer", "AI write", "publish"],
    content: [
      "The Posts page publishes to all your connected accounts at once — now, or scheduled for later.",
      "How to write one:",
      "1. Pick a focus. 'My Show' promotes an episode (pick which one, and its artwork attaches itself). Or choose General, Personal, or Custom.",
      "2. Pick where it goes — toggle each platform on or off.",
      "3. Write it yourself, or press AI Write and the app drafts it for you, grounded in your actual podcast. Pick a tone: Pro, Casual, Funny, Promo, or Edu.",
      "4. Check the preview — it shows the post the way followers will see it on each platform.",
      "5. Post Now, or Save Draft.",
      "The estimates panel suggests the best time to post and roughly how many people you'll reach.",
    ],
  },
  {
    id: "campaign-cadence",
    title: "Campaigns & Cadence",
    description: "Plan a week of posts on a calendar — AI fills it, you approve it.",
    category: "Social",
    icon: <CalendarRange className="h-5 w-5" />,
    tags: ["campaign", "cadence", "schedule", "calendar"],
    content: [
      "One post is nice. A plan is better. That's what Campaign and Cadence are for.",
      "• Campaign promotes one episode with several posts across the week — announcement, quote, clip, reminder. Pick the episode, and AI drafts a post for every slot on the calendar. You review, edit, and approve.",
      "• Cadence is a standing rhythm — for example, three posts every week, forever. AI keeps proposing posts to fill your rhythm; you stay in charge of what actually goes out.",
      "Both live on a calendar view, so you always see your week at a glance.",
    ],
  },
  {
    id: "engagement",
    title: "The Engagement inbox",
    description: "Instagram DMs and comments, answered from inside Podlogix.",
    category: "Social",
    icon: <MessageCircle className="h-5 w-5" />,
    tags: ["engagement", "dms", "comments", "instagram"],
    content: [
      "Engagement is your Instagram inbox inside Podlogix: direct messages and comments in one place, with replies built in.",
      "Two rules Instagram enforces (not us):",
      "• You can reply to a DM within 24 hours of the person's last message. After that, the window closes until they message again.",
      "• There's a daily cap on how many DMs you can send. If you hit it, it resets tomorrow.",
      "Comments work the same way — read them and reply without leaving the app.",
    ],
  },
  {
    id: "link-page",
    title: "Your Link Page",
    description: "The one link that holds everything — episodes, socials, and more.",
    category: "Social",
    icon: <Link2 className="h-5 w-5" />,
    tags: ["link page", "bio", "profile"],
    content: [
      "Your Link Page is the one link you put in every social bio. When someone taps it, they see your show, your latest episodes, your links, and anything else you add.",
      "The editor has four tabs:",
      "• Profile — your name, photo, and bio.",
      "• Design — colors and style, with a live phone preview so you see it as you build it.",
      "• Content — the sections on the page: links, episodes, whatever you want, in the order you want.",
      "• Share — your page's address, ready to copy. 'Copy Bio Link' on the Dashboard grabs it too.",
    ],
  },

  // ── Podcast ──
  {
    id: "shows-episodes",
    title: "Shows & Episodes",
    description: "Your podcast's home: shows, episodes, artwork, and feeds.",
    category: "Podcast",
    icon: <Mic className="h-5 w-5" />,
    tags: ["shows", "episodes", "rss", "podcast"],
    content: [
      "The Podcast workspace is where the podcast itself lives.",
      "• Shows lists your podcasts. Click one to enter its world: episodes, campaigns, audience, and settings.",
      "• Episodes lists every episode across your shows, with artwork and publish dates.",
      "• Listen is the listener side — playback and analytics.",
      "Podlogix can connect to your podcast host (like Buzzsprout) so episodes sync automatically. Once connected, new episodes show up on their own — and the social composer can promote any of them with one click.",
    ],
  },
];

const categories = [
  { name: "All", icon: <BookOpen className="h-4 w-4" /> },
  { name: "Get Started", icon: <Zap className="h-4 w-4" /> },
  { name: "Studio", icon: <Radio className="h-4 w-4" /> },
  { name: "Media", icon: <GalleryVerticalEnd className="h-4 w-4" /> },
  { name: "Guests", icon: <Users className="h-4 w-4" /> },
  { name: "Social", icon: <Share2 className="h-4 w-4" /> },
  { name: "Podcast", icon: <Mic className="h-4 w-4" /> },
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
      <main className="w-full max-w-7xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-kb-title">
              Help Center
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Plain answers about every page in Podlogix. Search, or browse by area.
            </p>
          </div>

          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search articles…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
              data-testid="input-search"
            />
          </div>

          <div className="flex flex-wrap gap-2">
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
                            <div className={article.figure ? "gap-6 md:grid md:grid-cols-[minmax(0,1fr)_440px]" : ""}>
                              <div>
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
                              </div>
                              {article.figure && (
                                <div className="mt-4 md:mt-0">
                                  {/* Rides along as you scroll the article */}
                                  <div className="md:sticky md:top-4 overflow-x-auto rounded-lg border bg-white p-3">
                                    {article.figure}
                                  </div>
                                </div>
                              )}
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

          {/* FAQ */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Quick questions</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq-1">
                <AccordionTrigger data-testid="accordion-faq-1">
                  Do I lose my clips if I delete a studio?
                </AccordionTrigger>
                <AccordionContent>
                  No. Deleting a studio only removes the room. Every recording and clip you
                  made stays safe in your Media Library.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-2">
                <AccordionTrigger data-testid="accordion-faq-2">
                  Does my guest need a Podlogix account?
                </AccordionTrigger>
                <AccordionContent>
                  No. The invite link is all they need. They open it, type their name, and
                  join from any modern browser.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-3">
                <AccordionTrigger data-testid="accordion-faq-3">
                  Why is my clip 30 seconds long?
                </AccordionTrigger>
                <AccordionContent>
                  Each clip runs from 20 seconds before your mark to 10 seconds after it.
                  When you press the button, the great moment has usually just happened — so
                  the clip reaches back to catch it.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-4">
                <AccordionTrigger data-testid="accordion-faq-4">
                  Why does the AI need to "listen" before finding clips?
                </AccordionTrigger>
                <AccordionContent>
                  "Find clips with AI" first turns your recording's audio into text
                  (that's the listening part), then reads that text to spot the strongest
                  moments. Longer shows take a little longer to listen to.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-5">
                <AccordionTrigger data-testid="accordion-faq-5">
                  Can I post the same thing to every platform at once?
                </AccordionTrigger>
                <AccordionContent>
                  Yes — that's what the composer is for. Toggle on the platforms you want,
                  and the preview shows how the post will look on each one before you send it.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="text-center py-6 border-t">
            <HelpCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Still stuck? Email <a className="underline" href="mailto:andrew@podlogix.co">andrew@podlogix.co</a> and a human will help.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
