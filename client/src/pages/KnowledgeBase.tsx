import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Radio, Share2, Sparkles, HelpCircle, BookOpen, FileText, Zap,
  Mic2, Users, GalleryVerticalEnd, FlaskConical, Scissors, UserPlus,
  PenSquare, CalendarRange, MessageCircle, Link2, Mic, Plug, LayoutDashboard,
  ChevronDown, ChevronRight, ArrowLeft, ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

interface Article {
  id: string;
  title: string;
  description: string;
  content: string[];
  category: string;
  icon: React.ReactNode;
  tags: string[];
  figure?: React.ReactNode;
  url?: string;
  ctaLabel?: string;
}

/* ── Figures ──────────────────────────────────────────────────────────────── */

function DashboardFigure() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full block" role="img" aria-label="Dashboard screenshot">
      <rect width="600" height="360" fill="#09090b" />
      {/* Rail */}
      <rect width="44" height="360" fill="#18181b" />
      <rect x="10" y="12" width="24" height="24" rx="6" fill="#d84b2d" />
      <rect x="10" y="48" width="24" height="24" rx="6" fill="#3f3f46" />
      <rect x="10" y="84" width="24" height="24" rx="6" fill="#3f3f46" />
      <rect x="10" y="120" width="24" height="24" rx="6" fill="#3f3f46" />
      <rect x="10" y="156" width="24" height="24" rx="6" fill="#3f3f46" />
      <rect x="10" y="192" width="24" height="24" rx="6" fill="#3f3f46" />
      {/* Top bar */}
      <rect x="44" y="0" width="556" height="40" fill="#18181b" />
      <text x="58" y="25" fontSize="13" fill="#ffffff" fontWeight="700">Today</text>
      <rect x="460" y="10" width="80" height="20" rx="6" fill="#d84b2d" />
      <text x="500" y="24" fontSize="9" fill="#fff" textAnchor="middle">+ New</text>
      {/* Studio card */}
      <rect x="54" y="52" width="165" height="110" rx="10" fill="#18181b" />
      <rect x="66" y="64" width="8" height="8" rx="4" fill="#22c55e" />
      <text x="80" y="71" fontSize="8" fill="#a1a1aa">Studio · Ready</text>
      <text x="66" y="89" fontSize="11" fill="#ffffff" fontWeight="600">The Morning Desk</text>
      <text x="66" y="103" fontSize="8" fill="#52525b">Camera ready · 2 channels</text>
      <rect x="66" y="116" width="90" height="20" rx="6" fill="#d84b2d" />
      <text x="111" y="130" fontSize="8.5" fill="#fff" textAnchor="middle">Go Live →</text>
      {/* Podcast card */}
      <rect x="228" y="52" width="155" height="110" rx="10" fill="#18181b" />
      <text x="240" y="72" fontSize="8" fill="#a1a1aa">Podcast</text>
      <text x="240" y="98" fontSize="28" fill="#ffffff" fontWeight="700">24</text>
      <text x="240" y="114" fontSize="8" fill="#52525b">published episodes</text>
      <circle cx="243" cy="141" r="3.5" fill="#22c55e" />
      <text x="250" y="145" fontSize="7.5" fill="#71717a">Spotify · Apple · RSS synced</text>
      {/* Activity card */}
      <rect x="392" y="52" width="162" height="110" rx="10" fill="#18181b" />
      <text x="404" y="72" fontSize="8" fill="#a1a1aa">This Week</text>
      <text x="404" y="98" fontSize="28" fill="#ffffff" fontWeight="700">3.2h</text>
      <text x="404" y="114" fontSize="8" fill="#52525b">on air</text>
      {[20,35,18,42,28,50,36].map((h, i) => (
        <rect key={i} x={404 + i * 18} y={162 - h} width="12" height={h} rx="2" fill="#d84b2d" opacity="0.75" />
      ))}
      {/* Social row */}
      <rect x="54" y="176" width="500" height="52" rx="10" fill="#18181b" />
      <text x="66" y="193" fontSize="8" fill="#a1a1aa">Social Performance</text>
      {[["📸 IG", "12.4k"], ["▶ YT", "8.1k"], ["𝕏", "5.7k"], ["in", "3.2k"]].map(([p, n], i) => (
        <g key={i}>
          <rect x={66 + i * 118} y="198" width="105" height="22" rx="7" fill="#27272a" />
          <text x={118 + i * 118} y="213" fontSize="9" fill="#e4e4e7" textAnchor="middle">{p}  {n}</text>
        </g>
      ))}
      {/* Episodes + Quick actions */}
      <rect x="54" y="240" width="238" height="108" rx="10" fill="#18181b" />
      <text x="66" y="256" fontSize="8" fill="#a1a1aa">Latest Episodes</text>
      {["Ep 24 · The Future of AI Pods", "Ep 23 · Interview: Sarah Chen", "Ep 22 · Listener Q&A"].map((ep, i) => (
        <g key={i}>
          <rect x="66" y={264 + i * 28} width="214" height="20" rx="5" fill="#27272a" />
          <text x="76" y={278 + i * 28} fontSize="8" fill="#d4d4d8">{ep}</text>
        </g>
      ))}
      <rect x="302" y="240" width="252" height="108" rx="10" fill="#18181b" />
      <text x="314" y="256" fontSize="8" fill="#a1a1aa">Quick Actions</text>
      <rect x="314" y="263" width="110" height="30" rx="8" fill="#d84b2d" />
      <text x="369" y="282" fontSize="9" fill="#fff" textAnchor="middle">+ Record</text>
      <rect x="434" y="263" width="110" height="30" rx="8" fill="#27272a" />
      <text x="489" y="282" fontSize="9" fill="#e4e4e7" textAnchor="middle">Create Post</text>
      <rect x="314" y="302" width="110" height="30" rx="8" fill="#27272a" />
      <text x="369" y="321" fontSize="9" fill="#e4e4e7" textAnchor="middle">Edit Bio Link</text>
      <rect x="434" y="302" width="110" height="30" rx="8" fill="#27272a" />
      <text x="489" y="321" fontSize="9" fill="#e4e4e7" textAnchor="middle">New Episode</text>
    </svg>
  );
}

function ConnectorsFigure() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full block" role="img" aria-label="Connectors screenshot">
      <rect width="600" height="360" fill="#fafafa" />
      <rect x="0" y="0" width="600" height="52" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="20" y="32" fontSize="15" fill="#18181b" fontWeight="700">Connectors</text>
      <text x="20" y="66" fontSize="9" fill="#71717a">Connect your accounts to unlock posting, analytics, and scheduling.</text>
      {/* Cards grid */}
      {[
        { name: "Instagram", color: "#e1306c", status: "Connected", label: "📸", x: 20, y: 82 },
        { name: "YouTube", color: "#ff0000", status: "Connected", label: "▶", x: 200, y: 82 },
        { name: "LinkedIn", color: "#0077b5", status: "Connect", label: "in", x: 380, y: 82 },
        { name: "Google Cal", color: "#4285f4", status: "Connected", label: "📅", x: 20, y: 210 },
        { name: "Buzzsprout", color: "#f97316", status: "Connected", label: "🎙", x: 200, y: 210 },
        { name: "TikTok", color: "#010101", status: "Connect", label: "♪", x: 380, y: 210 },
      ].map(({ name, color, status, label, x, y }) => (
        <g key={name}>
          <rect x={x} y={y} width="168" height="114" rx="12" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
          <rect x={x + 12} y={y + 14} width="36" height="36" rx="10" fill={color + "18"} />
          <text x={x + 30} y={y + 37} fontSize="16" textAnchor="middle">{label}</text>
          <text x={x + 12} y={y + 68} fontSize="11" fill="#18181b" fontWeight="600">{name}</text>
          <rect x={x + 12} y={y + 78} width={status === "Connected" ? 70 : 60} height="18" rx="6"
            fill={status === "Connected" ? "#dcfce7" : "#f4f4f5"} />
          <text x={x + 12 + (status === "Connected" ? 35 : 30)} y={y + 91} fontSize="8"
            fill={status === "Connected" ? "#16a34a" : "#71717a"} textAnchor="middle">
            {status === "Connected" ? "● Connected" : "Connect →"}
          </text>
        </g>
      ))}
    </svg>
  );
}

function StudioFigure() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full block" role="img" aria-label="Live Studio screenshot">
      <rect width="600" height="360" fill="#09090b" />
      {/* Top bar */}
      <rect width="600" height="40" fill="#18181b" />
      <text x="16" y="25" fontSize="10" fill="#71717a">← Exit Studio</text>
      <text x="110" y="25" fontSize="10" fill="#52525b">/ Studios / The Morning Desk</text>
      <rect x="450" y="10" width="130" height="22" rx="8" fill="#3f3f46" />
      <text x="515" y="25" fontSize="9" fill="#a1a1aa" textAnchor="middle">Channels · Scenes</text>
      {/* Stage */}
      <rect x="8" y="48" width="440" height="262" rx="10" fill="#18181b" />
      {/* Camera placeholder */}
      <rect x="24" y="64" width="408" height="194" rx="8" fill="#27272a" />
      <circle cx="228" cy="161" r="28" fill="#3f3f46" />
      <circle cx="228" cy="148" r="10" fill="#52525b" />
      <ellipse cx="228" cy="172" rx="18" ry="10" fill="#52525b" />
      <text x="228" y="216" fontSize="10" fill="#52525b" textAnchor="middle">Camera preview</text>
      {/* LIVE badge */}
      <rect x="24" y="68" width="44" height="18" rx="9" fill="#dc2626" />
      <text x="46" y="81" fontSize="9" fill="#fff" textAnchor="middle">● LIVE</text>
      {/* Timer */}
      <text x="228" y="81" fontSize="11" fill="#ffffff" fontWeight="600" textAnchor="middle">00:14:32</text>
      {/* Bottom control strip */}
      <rect x="8" y="316" width="440" height="36" rx="8" fill="#18181b" />
      {["📷", "🖥", "👤+", "🎵"].map((icon, i) => (
        <g key={i}>
          <circle cx={36 + i * 44} cy="334" r="12" fill="#3f3f46" />
          <text x={36 + i * 44} y="338" fontSize="10" textAnchor="middle">{icon}</text>
        </g>
      ))}
      <text x="228" y="338" fontSize="9" fill="#a1a1aa" textAnchor="middle">Space → Mark moment</text>
      <rect x="370" y="320" width="68" height="24" rx="8" fill="#dc2626" />
      <text x="404" y="336" fontSize="9" fill="#fff" textAnchor="middle">End Show</text>
      {/* Right panel */}
      <rect x="456" y="48" width="136" height="262" rx="10" fill="#18181b" />
      <text x="524" y="68" fontSize="9" fill="#a1a1aa" textAnchor="middle">Layout</text>
      {["Fullscreen", "Split", "PiP · Top", "PiP · Bottom"].map((name, i) => (
        <g key={i}>
          <rect x="468" y={78 + i * 36} width="112" height="28" rx="7" fill={i === 0 ? "#d84b2d" : "#27272a"} />
          <text x="524" y={96 + i * 36} fontSize="9" fill={i === 0 ? "#fff" : "#a1a1aa"} textAnchor="middle">{name}</text>
        </g>
      ))}
      <text x="524" y="240" fontSize="9" fill="#a1a1aa" textAnchor="middle">Scenes</text>
      {["Countdown", "On Air", "Break"].map((s, i) => (
        <g key={i}>
          <rect x="468" y={250 + i * 22} width="112" height="16" rx="5" fill="#27272a" />
          <text x="524" y={262 + i * 22} fontSize="8" fill="#71717a" textAnchor="middle">{s}</text>
        </g>
      ))}
    </svg>
  );
}

function GuestFigure() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full block" role="img" aria-label="Guest invite screenshot">
      {/* Dark studio bg */}
      <rect width="600" height="360" fill="#09090b" />
      <rect x="8" y="8" width="584" height="344" rx="10" fill="#18181b" />
      {/* Two video tiles */}
      <rect x="30" y="30" width="250" height="180" rx="8" fill="#27272a" />
      <circle cx="155" cy="110" r="30" fill="#3f3f46" />
      <text x="155" y="170" fontSize="9" fill="#71717a" textAnchor="middle">You</text>
      <rect x="320" y="30" width="250" height="180" rx="8" fill="#27272a" />
      <circle cx="445" cy="110" r="30" fill="#52525b" />
      <text x="445" y="170" fontSize="9" fill="#71717a" textAnchor="middle">Guest</text>
      {/* Modal */}
      <rect x="130" y="210" width="340" height="140" rx="14" fill="#ffffff" />
      <text x="300" y="238" fontSize="13" fill="#18181b" fontWeight="700" textAnchor="middle">Invite a guest</text>
      <text x="300" y="255" fontSize="9" fill="#71717a" textAnchor="middle">No account needed — they just click the link.</text>
      <rect x="148" y="264" width="260" height="28" rx="7" fill="#f4f4f5" stroke="#e4e4e7" strokeWidth="1" />
      <text x="214" y="282" fontSize="8" fill="#71717a">podlogix.co/g/morning-desk-xk92</text>
      <rect x="388" y="267" width="14" height="14" rx="4" fill="#d84b2d" />
      <rect x="148" y="302" width="260" height="32" rx="8" fill="#18181b" />
      <text x="278" y="322" fontSize="10" fill="#ffffff" textAnchor="middle">Copy link — send any way</text>
    </svg>
  );
}

function EditingRoomFigure() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full block" role="img" aria-label="Editing room screenshot">
      <rect width="600" height="360" fill="#09090b" />
      <rect width="600" height="44" fill="#18181b" />
      <text x="20" y="27" fontSize="12" fill="#ffffff" fontWeight="600">Editing Room</text>
      <text x="430" y="27" fontSize="9" fill="#a1a1aa">The Morning Desk · Ep 24</text>
      {/* Waveform */}
      <rect x="12" y="54" width="576" height="60" rx="8" fill="#18181b" />
      <rect x="24" y="66" width="552" height="8" rx="4" fill="#27272a" />
      {/* Waveform bars */}
      {Array.from({ length: 55 }, (_, i) => {
        const h = 4 + Math.sin(i * 0.7) * 10 + Math.sin(i * 1.9) * 6;
        return <rect key={i} x={24 + i * 10} y={70 - h / 2} width="7" height={h} rx="2" fill="#3f3f46" />;
      })}
      {/* Mark dots */}
      {[120, 270, 420].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy="70" r="6" fill="#d84b2d" />
          <rect x={x - 24} y="84" width="48" height="14" rx="4" fill="#d84b2d" opacity="0.15" />
          <text x={x} y="95" fontSize="7" fill="#d84b2d" textAnchor="middle">Mark {i + 1}</text>
        </g>
      ))}
      {/* Action buttons */}
      <rect x="12" y="126" width="180" height="36" rx="9" fill="#18181b" />
      <text x="102" y="148" fontSize="9.5" fill="#e4e4e7" textAnchor="middle">✨ Find clips with AI</text>
      <rect x="202" y="126" width="140" height="36" rx="9" fill="#18181b" />
      <text x="272" y="148" fontSize="9.5" fill="#e4e4e7" textAnchor="middle">✂ Cut clip</text>
      <rect x="352" y="126" width="120" height="36" rx="9" fill="#18181b" />
      <text x="412" y="148" fontSize="9.5" fill="#e4e4e7" textAnchor="middle">CC Captions</text>
      <rect x="482" y="126" width="106" height="36" rx="9" fill="#d84b2d" />
      <text x="535" y="148" fontSize="9.5" fill="#fff" textAnchor="middle">Refine →</text>
      {/* Clips grid */}
      <text x="12" y="184" fontSize="8" fill="#52525b" fontWeight="600">CLIPS FROM THIS SHOW</text>
      {[
        { label: "Ep24 · Mark 1 · 0:32", sub: "16:9 · with captions" },
        { label: "Ep24 · Mark 2 · 0:30", sub: "9:16 vertical" },
        { label: "Ep24 · Mark 3 · 0:31", sub: "16:9 · with captions" },
      ].map(({ label, sub }, i) => (
        <g key={i}>
          <rect x={12 + i * 196} y="192" width="184" height="100" rx="10" fill="#18181b" />
          <rect x={22 + i * 196} y="202" width="164" height="60" rx="6" fill="#27272a" />
          <circle cx={104 + i * 196} cy="232" r="14" fill="#3f3f46" />
          <text x={104 + i * 196} y="237" fontSize="12" textAnchor="middle" fill="#a1a1aa">▶</text>
          <text x={22 + i * 196} y="278" fontSize="8" fill="#e4e4e7">{label}</text>
          <text x={22 + i * 196} y="289" fontSize="7.5" fill="#52525b">{sub}</text>
        </g>
      ))}
    </svg>
  );
}

function RefinerFigure() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full block" role="img" aria-label="Refiner screenshot">
      <rect width="600" height="360" fill="#fafafa" />
      <rect width="600" height="44" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="20" y="28" fontSize="13" fill="#18181b" fontWeight="700">Refiner</text>
      <text x="490" y="28" fontSize="9" fill="#71717a">Ep 24 · 48 min 12 sec</text>
      {/* Player */}
      <rect x="12" y="56" width="380" height="80" rx="10" fill="#18181b" />
      <circle cx="52" cy="96" r="18" fill="#27272a" />
      <text x="52" y="101" fontSize="14" textAnchor="middle" fill="#a1a1aa">▶</text>
      <rect x="80" y="88" width="280" height="6" rx="3" fill="#3f3f46" />
      <rect x="80" y="88" width="90" height="6" rx="3" fill="#d84b2d" />
      <circle cx="170" cy="91" r="6" fill="#d84b2d" />
      <text x="80" y="108" fontSize="8" fill="#52525b">14:22</text>
      <text x="356" y="108" fontSize="8" fill="#52525b" textAnchor="end">48:12</text>
      {/* Waveform bars under player */}
      {Array.from({ length: 38 }, (_, i) => {
        const h = 3 + Math.abs(Math.sin(i * 0.8 + 1) * 10 + Math.sin(i * 2.1) * 6);
        return <rect key={i} x={80 + i * 7} y={116 - h / 2} width="5" height={h} rx="2" fill="#3f3f46" />;
      })}
      {/* Pipeline */}
      <rect x="12" y="148" width="380" height="160" rx="10" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="24" y="166" fontSize="9" fill="#71717a" fontWeight="600">PIPELINE</text>
      {[
        { label: "Transcription", done: true, sub: "4,823 words recognized" },
        { label: "Remove silence", done: true, sub: "2 min 14 sec removed" },
        { label: "Audio cleanup", done: true, sub: "Leveled to −14 LUFS" },
        { label: "Remove fillers", done: false, sub: "Run to remove um, uh" },
        { label: "Color correction", done: false, sub: "For video recordings" },
      ].map(({ label, done, sub }, i) => (
        <g key={i}>
          <circle cx="34" cy={184 + i * 26} r="8" fill={done ? "#22c55e" : "#e4e4e7"} />
          <text x="34" y={188 + i * 26} fontSize="8" fill={done ? "#fff" : "#a1a1aa"} textAnchor="middle">{done ? "✓" : "○"}</text>
          <text x="50" y={188 + i * 26} fontSize="9" fill={done ? "#18181b" : "#a1a1aa"} fontWeight={done ? "500" : "400"}>{label}</text>
          <text x="280" y={188 + i * 26} fontSize="8" fill="#71717a" textAnchor="end">{sub}</text>
        </g>
      ))}
      {/* Before/after + stats */}
      <rect x="404" y="56" width="184" height="252" rx="10" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="416" y="76" fontSize="9" fill="#71717a" fontWeight="600">RESULTS</text>
      <rect x="416" y="84" width="80" height="24" rx="7" fill="#f0fdf4" />
      <text x="456" y="100" fontSize="9" fill="#16a34a" textAnchor="middle">Before</text>
      <rect x="504" y="84" width="72" height="24" rx="7" fill="#18181b" />
      <text x="540" y="100" fontSize="9" fill="#fff" textAnchor="middle">After</text>
      {[
        { label: "Duration", before: "48:12", after: "45:58" },
        { label: "Fillers removed", before: "—", after: "47" },
        { label: "Silence cut", before: "—", after: "2m 14s" },
      ].map(({ label, before, after }, i) => (
        <g key={i}>
          <text x="416" y={130 + i * 40} fontSize="8" fill="#71717a">{label}</text>
          <text x="456" y={148 + i * 40} fontSize="11" fill="#18181b" fontWeight="600" textAnchor="middle">{before}</text>
          <text x="540" y={148 + i * 40} fontSize="11" fill="#22c55e" fontWeight="600" textAnchor="middle">{after}</text>
        </g>
      ))}
      <rect x="416" y="240" width="160" height="32" rx="8" fill="#18181b" />
      <text x="496" y="260" fontSize="9.5" fill="#fff" textAnchor="middle">Refine my show →</text>
    </svg>
  );
}

function RecordingJourneyFigure() {
  return (
    <svg viewBox="0 0 600 200" className="h-auto w-full block" role="img" aria-label="Recording journey diagram">
      <rect width="600" height="200" fill="#fafafa" />
      {[
        { x: 20, icon: "⏹", label: "End show", sub: "recording uploads", bg: "#18181b", fg: "#fff", sfg: "#a1a1aa" },
        { x: 170, icon: "🗂", label: "Media Library", sub: "files itself automatically", bg: "#ffffff", fg: "#18181b", sfg: "#71717a" },
        { x: 320, icon: "🔄", label: "MP4 convert", sub: "runs in the background", bg: "#ffffff", fg: "#18181b", sfg: "#71717a" },
        { x: 470, icon: "▶", label: "Ready to play", sub: "everywhere it needs to", bg: "#fbeeea", fg: "#b0341a", sfg: "#b0341a" },
      ].map(({ x, icon, label, sub, bg, fg, sfg }) => (
        <g key={x}>
          <rect x={x} y="50" width="120" height="80" rx="12" fill={bg} stroke="#e4e4e7" strokeWidth="1" />
          <text x={x + 60} y="82" fontSize="20" textAnchor="middle">{icon}</text>
          <text x={x + 60} y="102" fontSize="10" fill={fg} fontWeight="600" textAnchor="middle">{label}</text>
          <text x={x + 60} y="116" fontSize="8" fill={sfg} textAnchor="middle">{sub}</text>
        </g>
      ))}
      {[145, 295, 445].map((x) => (
        <text key={x} x={x} y="95" fontSize="18" fill="#d1d5db" textAnchor="middle">→</text>
      ))}
    </svg>
  );
}

function MediaLibraryFigure() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full block" role="img" aria-label="Media Storage screenshot">
      <rect width="600" height="360" fill="#fafafa" />
      <rect width="600" height="44" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="20" y="28" fontSize="13" fill="#18181b" fontWeight="700">Media Storage</text>
      <rect x="452" y="10" width="132" height="24" rx="8" fill="#18181b" />
      <text x="518" y="26" fontSize="9" fill="#fff" textAnchor="middle">+ Add media</text>
      {/* Stat cards */}
      {[["42", "Total files"], ["28", "Videos"], ["14", "Audio"], ["8", "Refined"]].map(([n, l], i) => (
        <g key={i}>
          <rect x={12 + i * 144} y="54" width="132" height="48" rx="8" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
          <text x={78 + i * 144} y="78" fontSize="20" fill="#18181b" fontWeight="700" textAnchor="middle">{n}</text>
          <text x={78 + i * 144} y="93" fontSize="8" fill="#71717a" textAnchor="middle">{l}</text>
        </g>
      ))}
      {/* Filter chips */}
      {["All", "Videos", "Audio", "Studio", "Refined"].map((chip, i) => (
        <g key={i}>
          <rect x={12 + i * 110} y="114" width="98" height="24" rx="8" fill={i === 0 ? "#18181b" : "#ffffff"} stroke="#e4e4e7" strokeWidth="1" />
          <text x={61 + i * 110} y="130" fontSize="8.5" fill={i === 0 ? "#fff" : "#71717a"} textAnchor="middle">{chip}</text>
        </g>
      ))}
      {/* File grid */}
      {[
        { name: "Morning Desk · Ep 24", type: "Studio", dur: "48:12" },
        { name: "Ep 24 · Refined", type: "Refined", dur: "45:58" },
        { name: "Mark 1 clip · 9:16", type: "Studio", dur: "0:32" },
        { name: "Mark 2 clip · 16:9", type: "Studio", dur: "0:30" },
        { name: "Interview export", type: "Refined", dur: "24:04" },
        { name: "Intro bumper", type: "Import", dur: "0:08" },
      ].map(({ name, type, dur }, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return (
          <g key={i}>
            <rect x={12 + col * 194} y={150 + row * 106} width="182" height="94" rx="10" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
            <rect x={12 + col * 194} y={150 + row * 106} width="182" height="56" rx="10" fill="#27272a" />
            <rect x={12 + col * 194 + 70} y={150 + row * 106 + 56} width="182" height="4" fill="#27272a" />
            <circle cx={103 + col * 194} cy={178 + row * 106} r="14" fill="#3f3f46" />
            <text x={103 + col * 194} y={183 + row * 106} fontSize="11" textAnchor="middle" fill="#a1a1aa">▶</text>
            <text x={24 + col * 194} y={224 + row * 106} fontSize="8.5" fill="#18181b" fontWeight="500">{name}</text>
            <rect x={24 + col * 194} y={232 + row * 106} width={type === "Refined" ? 46 : type === "Studio" ? 38 : 38} height="12" rx="4"
              fill={type === "Refined" ? "#dcfce7" : type === "Studio" ? "#fef3c7" : "#eff6ff"} />
            <text x={30 + col * 194} y={242 + row * 106} fontSize="7"
              fill={type === "Refined" ? "#16a34a" : type === "Studio" ? "#d97706" : "#2563eb"}>{type}</text>
            <text x={185 + col * 194} y={242 + row * 106} fontSize="7.5" fill="#a1a1aa" textAnchor="end">{dur}</text>
          </g>
        );
      })}
    </svg>
  );
}

function MediaLabFigure() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full block" role="img" aria-label="Media Lab screenshot">
      <rect width="600" height="360" fill="#fafafa" />
      <rect width="600" height="44" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="20" y="28" fontSize="13" fill="#18181b" fontWeight="700">Media Lab</text>
      {/* Left - source picker */}
      <rect x="12" y="56" width="260" height="290" rx="10" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="24" y="76" fontSize="9" fill="#71717a" fontWeight="600">SOURCE FILE</text>
      {["Morning Desk · Ep 24", "Ep 23 · Interview Chen", "Ep 22 · Q&A"].map((f, i) => (
        <g key={i}>
          <rect x="24" y={84 + i * 40} width="236" height="32" rx="7" fill={i === 0 ? "#f0fdf4" : "#fafafa"} stroke={i === 0 ? "#bbf7d0" : "#e4e4e7"} strokeWidth="1" />
          <text x="36" y={104 + i * 40} fontSize="9" fill={i === 0 ? "#16a34a" : "#71717a"}>{f}</text>
          {i === 0 && <text x="248" y={104 + i * 40} fontSize="8" fill="#16a34a" textAnchor="end">✓</text>}
        </g>
      ))}
      {/* Right - operations */}
      <rect x="284" y="56" width="304" height="290" rx="10" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="296" y="76" fontSize="9" fill="#71717a" fontWeight="600">OPERATION</text>
      {[
        { name: "Refine Audio", desc: "Cut silence · level to podcast standard", active: true },
        { name: "Convert to MP4", desc: "Any video → universal format", active: false },
        { name: "Extract Audio", desc: "Video → MP3 podcast episode", active: false },
        { name: "Compress for Web", desc: "Smaller file, same quality", active: false },
      ].map(({ name, desc, active }, i) => (
        <g key={i}>
          <rect x="296" y={84 + i * 52} width="280" height="44" rx="8" fill={active ? "#fafafa" : "#fafafa"} stroke={active ? "#18181b" : "#e4e4e7"} strokeWidth={active ? 1.5 : 1} />
          <text x="308" y={104 + i * 52} fontSize="10" fill="#18181b" fontWeight={active ? "600" : "400"}>{name}</text>
          <text x="308" y={118 + i * 52} fontSize="8" fill="#71717a">{desc}</text>
          {active && <circle cx="560" cy={106 + i * 52} r="6" fill="#18181b" />}
        </g>
      ))}
      <rect x="296" y="300" width="280" height="34" rx="9" fill="#18181b" />
      <text x="436" y="321" fontSize="10" fill="#fff" textAnchor="middle">Run Job →</text>
    </svg>
  );
}

function SpeakingAnalysisFigure() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full block" role="img" aria-label="Speaking Analysis screenshot">
      <rect width="600" height="360" fill="#fafafa" />
      <rect width="600" height="44" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="20" y="28" fontSize="13" fill="#18181b" fontWeight="700">Speaking Analysis</text>
      <text x="20" y="66" fontSize="9" fill="#71717a">Sarah Chen · The Morning Desk Ep 23 · 24:04</text>
      {/* Score rings */}
      {[
        { label: "Overall", score: "87", x: 72, color: "#22c55e" },
        { label: "Presence", score: "91", x: 212, color: "#22c55e" },
        { label: "Speaking", score: "84", x: 352, color: "#eab308" },
        { label: "Filler Control", score: "76", x: 492, color: "#eab308" },
      ].map(({ label, score, x, color }) => (
        <g key={label}>
          <circle cx={x} cy="120" r="48" fill="none" stroke="#e4e4e7" strokeWidth="8" />
          <circle cx={x} cy="120" r="48" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${parseInt(score) * 3.015} ${300 - parseInt(score) * 3.015}`}
            strokeDashoffset="75" strokeLinecap="round" />
          <text x={x} y="116" fontSize="22" fill="#18181b" fontWeight="700" textAnchor="middle">{score}</text>
          <text x={x} y="132" fontSize="8" fill="#71717a" textAnchor="middle">/ 100</text>
          <text x={x} y="184" fontSize="9" fill="#18181b" fontWeight="500" textAnchor="middle">{label}</text>
        </g>
      ))}
      {/* Filler breakdown */}
      <rect x="12" y="200" width="576" height="140" rx="10" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="24" y="220" fontSize="9" fill="#71717a" fontWeight="600">COACHING NOTES &amp; FILLERS</text>
      <text x="24" y="240" fontSize="9" fill="#18181b">Strong eye contact and pacing. Watch for sentence-ending filler phrases.</text>
      <text x="24" y="256" fontSize="9" fill="#18181b">Presence is a real strength — lean into that energy from the first minute.</text>
      {[["um", "18×"], ["uh", "12×"], ["like", "8×"], ["you know", "4×"]].map(([word, count], i) => (
        <g key={word}>
          <rect x={24 + i * 138} y="268" width="126" height="56" rx="8" fill="#fafafa" stroke="#e4e4e7" strokeWidth="1" />
          <text x={87 + i * 138} y="292" fontSize="18" fill="#18181b" fontWeight="700" textAnchor="middle">{count}</text>
          <text x={87 + i * 138} y="310" fontSize="9" fill="#71717a" textAnchor="middle">"{word}"</text>
        </g>
      ))}
    </svg>
  );
}

function GuestCRMFigure() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full block" role="img" aria-label="Guest Pipeline screenshot">
      <rect width="600" height="360" fill="#fafafa" />
      <rect width="600" height="44" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="20" y="28" fontSize="13" fill="#18181b" fontWeight="700">Guest Pipeline</text>
      <rect x="462" y="10" width="122" height="24" rx="8" fill="#18181b" />
      <text x="523" y="26" fontSize="9" fill="#fff" textAnchor="middle">+ Add Guest</text>
      {/* Stage chips */}
      {[["Prospect", "6", "#f4f4f5", "#18181b"], ["Researching", "3", "#eff6ff", "#2563eb"], ["Invited", "4", "#fef3c7", "#d97706"], ["Scheduled", "2", "#f0fdf4", "#16a34a"]].map(([s, n, bg, fg], i) => (
        <g key={s}>
          <rect x={12 + i * 146} y="54" width="134" height="28" rx="8" fill={bg} />
          <text x={79 + i * 146} y="72" fontSize="9" fill={fg} fontWeight="500" textAnchor="middle">{s} · {n}</text>
        </g>
      ))}
      {/* Guest rows */}
      {[
        { name: "Sarah Chen", role: "CEO · TechVentures", stage: "Scheduled", tag: "#16a34a", tbg: "#f0fdf4" },
        { name: "Marcus Lee", role: "Author · Deep Work Pod", stage: "Invited", tag: "#d97706", tbg: "#fef3c7" },
        { name: "Priya Nair", role: "VC · Sequoia Capital", stage: "Prospect", tag: "#71717a", tbg: "#f4f4f5" },
        { name: "David Reeves", role: "Host · The Founder Hour", stage: "Researching", tag: "#2563eb", tbg: "#eff6ff" },
        { name: "Lena Park", role: "Journalist · TechCrunch", stage: "Prospect", tag: "#71717a", tbg: "#f4f4f5" },
      ].map(({ name, role, stage, tag, tbg }, i) => (
        <g key={name}>
          <rect x="12" y={94 + i * 52} width="576" height="44" rx="10" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
          <circle cx="38" cy={116 + i * 52} r="14" fill="#e4e4e7" />
          <text x="38" y={120 + i * 52} fontSize="10" fill="#71717a" textAnchor="middle">{name[0]}</text>
          <text x="62" y={110 + i * 52} fontSize="10" fill="#18181b" fontWeight="600">{name}</text>
          <text x="62" y={124 + i * 52} fontSize="8" fill="#71717a">{role}</text>
          <rect x="400" y={106 + i * 52} width="72" height="20" rx="7" fill={tbg} />
          <text x="436" y={120 + i * 52} fontSize="8" fill={tag} textAnchor="middle">{stage}</text>
          <rect x="486" y={106 + i * 52} width="90" height="20" rx="7" fill="#f4f4f5" />
          <text x="531" y={120 + i * 52} fontSize="8" fill="#71717a" textAnchor="middle">View profile →</text>
        </g>
      ))}
    </svg>
  );
}

function DiscoverFigure() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full block" role="img" aria-label="Discover screenshot">
      <rect width="600" height="360" fill="#fafafa" />
      <rect width="600" height="44" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="20" y="28" fontSize="13" fill="#18181b" fontWeight="700">Discover</text>
      {/* Search */}
      <rect x="12" y="56" width="480" height="36" rx="9" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="30" y="78" fontSize="10" fill="#a1a1aa">Search by topic, name, or handle…</text>
      <rect x="504" y="56" width="84" height="36" rx="9" fill="#18181b" />
      <text x="546" y="78" fontSize="9" fill="#fff" textAnchor="middle">Search</text>
      {/* Results */}
      {[
        { name: "Alex Rivers", handle: "@alexrivers", topic: "AI & Technology", followers: "142k", ep: "38 appearances" },
        { name: "Maya Thompson", handle: "@mayacast", topic: "Entrepreneurship", followers: "89k", ep: "24 appearances" },
        { name: "Jordan Kim", handle: "@jordankim_pod", topic: "Startups", followers: "63k", ep: "17 appearances" },
        { name: "Sam Okafor", handle: "@samokafor", topic: "Leadership", followers: "51k", ep: "12 appearances" },
      ].map(({ name, handle, topic, followers, ep }, i) => (
        <g key={name}>
          <rect x="12" y={104 + i * 64} width="576" height="56" rx="10" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
          <circle cx="42" cy={132 + i * 64} r="18" fill="#e4e4e7" />
          <text x="42" y={137 + i * 64} fontSize="12" fill="#71717a" textAnchor="middle">{name[0]}</text>
          <text x="70" y={124 + i * 64} fontSize="11" fill="#18181b" fontWeight="600">{name}</text>
          <text x="70" y={138 + i * 64} fontSize="8.5" fill="#71717a">{handle} · {topic}</text>
          <text x="70" y={152 + i * 64} fontSize="8" fill="#a1a1aa">{ep}</text>
          <rect x="418" y={122 + i * 64} width="64" height="20" rx="6" fill="#f0fdf4" />
          <text x="450" y={136 + i * 64} fontSize="8" fill="#16a34a" textAnchor="middle">{followers}</text>
          <rect x="492" y={122 + i * 64} width="84" height="20" rx="7" fill="#18181b" />
          <text x="534" y={136 + i * 64} fontSize="8" fill="#fff" textAnchor="middle">+ Shortlist</text>
        </g>
      ))}
    </svg>
  );
}

function PostComposerFigure() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full block" role="img" aria-label="Post composer screenshot">
      <rect width="600" height="360" fill="#fafafa" />
      <rect width="600" height="44" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="20" y="28" fontSize="13" fill="#18181b" fontWeight="700">Create a post</text>
      {/* Episode focus row */}
      <rect x="12" y="56" width="380" height="290" rx="10" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="24" y="76" fontSize="9" fill="#71717a" fontWeight="600">EPISODE FOCUS</text>
      <rect x="24" y="84" width="356" height="36" rx="8" fill="#fafafa" stroke="#e4e4e7" strokeWidth="1" />
      <text x="36" y="106" fontSize="9" fill="#18181b">Ep 24 · The Future of AI Podcasting</text>
      {/* Platform toggles */}
      <text x="24" y="140" fontSize="9" fill="#71717a" fontWeight="600">PUBLISH TO</text>
      {[["📸 Instagram", true], ["▶ YouTube", true], ["𝕏 Twitter", false], ["in LinkedIn", true]].map(([p, on], i) => (
        <g key={i}>
          <rect x={24 + (i % 2) * 178} y={148 + Math.floor(i / 2) * 32} width="168" height="26" rx="7"
            fill={on ? "#f0fdf4" : "#fafafa"} stroke={on ? "#bbf7d0" : "#e4e4e7"} strokeWidth="1" />
          <text x={108 + (i % 2) * 178} y={165 + Math.floor(i / 2) * 32} fontSize="9" fill={on ? "#16a34a" : "#71717a"} textAnchor="middle">{p as string}</text>
        </g>
      ))}
      {/* Post text area */}
      <text x="24" y="222" fontSize="9" fill="#71717a" fontWeight="600">CAPTION</text>
      <rect x="24" y="230" width="356" height="80" rx="8" fill="#fafafa" stroke="#e4e4e7" strokeWidth="1" />
      <text x="36" y="248" fontSize="8.5" fill="#18181b">🎙 Episode 24 is live — The Future of AI</text>
      <text x="36" y="263" fontSize="8.5" fill="#18181b">Podcasting. We go deep on where the</text>
      <text x="36" y="278" fontSize="8.5" fill="#18181b">industry is heading in 2026.</text>
      <text x="36" y="296" fontSize="8" fill="#a1a1aa">#podcast #AI #content</text>
      {/* Buttons */}
      <rect x="24" y="320" width="168" height="18" rx="6" fill="#18181b" />
      <text x="108" y="332" fontSize="8.5" fill="#fff" textAnchor="middle">✨ AI Write</text>
      <rect x="202" y="320" width="178" height="18" rx="6" fill="#d84b2d" />
      <text x="291" y="332" fontSize="8.5" fill="#fff" textAnchor="middle">Post Now →</text>
      {/* Preview panel */}
      <rect x="404" y="56" width="184" height="290" rx="10" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="416" y="76" fontSize="9" fill="#71717a" fontWeight="600">PREVIEW</text>
      <rect x="416" y="84" width="160" height="120" rx="8" fill="#27272a" />
      <text x="496" y="149" fontSize="9" fill="#a1a1aa" textAnchor="middle">Episode artwork</text>
      <text x="416" y="220" fontSize="8" fill="#18181b">🎙 Episode 24 is live — The</text>
      <text x="416" y="234" fontSize="8" fill="#18181b">Future of AI Podcasting…</text>
      <text x="416" y="252" fontSize="7.5" fill="#a1a1aa">#podcast #AI #content</text>
      <rect x="416" y="266" width="60" height="12" rx="4" fill="#e1306c" opacity="0.15" />
      <text x="446" y="276" fontSize="7" fill="#e1306c" textAnchor="middle">Instagram</text>
    </svg>
  );
}

function CampaignFigure() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full block" role="img" aria-label="Campaign calendar screenshot">
      <rect width="600" height="360" fill="#fafafa" />
      <rect width="600" height="44" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="20" y="28" fontSize="13" fill="#18181b" fontWeight="700">Campaign · August 2026</text>
      {/* Day headers */}
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
        <text key={d} x={26 + i * 82} y="60" fontSize="9" fill="#71717a" fontWeight="500">{d}</text>
      ))}
      {/* Calendar grid */}
      {Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: 7 }, (_, col) => {
          const day = row * 7 + col + 1;
          const hasPost = [1, 3, 5, 8, 10, 12, 15, 17, 19, 22].includes(day);
          const hasAI = [3, 10, 17].includes(day);
          return (
            <g key={`${row}-${col}`}>
              <rect x={12 + col * 82} y={70 + row * 56} width="76" height="50" rx="6"
                fill={hasPost ? "#ffffff" : "#fafafa"} stroke="#e4e4e7" strokeWidth="1" />
              <text x={20 + col * 82} y={86 + row * 56} fontSize="9" fill="#18181b">{day <= 31 ? day : ""}</text>
              {hasPost && day <= 31 && (
                <g>
                  <rect x={18 + col * 82} y={92 + row * 56} width="58" height="18" rx="5"
                    fill={hasAI ? "#eff6ff" : "#f0fdf4"} />
                  <text x={47 + col * 82} y={104 + row * 56} fontSize="7.5"
                    fill={hasAI ? "#2563eb" : "#16a34a"} textAnchor="middle">
                    {hasAI ? "✨ AI draft" : "📝 Approved"}
                  </text>
                </g>
              )}
            </g>
          );
        })
      )}
    </svg>
  );
}

function EngagementFigure() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full block" role="img" aria-label="Engagement inbox screenshot">
      <rect width="600" height="360" fill="#fafafa" />
      <rect width="600" height="44" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="20" y="28" fontSize="13" fill="#18181b" fontWeight="700">Engagement</text>
      <rect x="18" y="10" width="92" height="24" rx="8" fill="#fafafa" stroke="#e4e4e7" strokeWidth="1" />
      {/* Tab bar */}
      {["DMs", "Comments"].map((tab, i) => (
        <g key={tab}>
          <rect x={12 + i * 90} y="54" width="82" height="28" rx="8" fill={i === 0 ? "#18181b" : "#ffffff"} stroke="#e4e4e7" strokeWidth="1" />
          <text x={53 + i * 90} y="72" fontSize="9" fill={i === 0 ? "#fff" : "#71717a"} textAnchor="middle">{tab}</text>
        </g>
      ))}
      {/* DM list */}
      {[
        { name: "Jordan K.", msg: "Just finished the episode — absolutely loved it!", time: "2m", unread: true },
        { name: "Alicia M.", msg: "How do I get on your show as a guest?", time: "14m", unread: true },
        { name: "Brandon T.", msg: "The AI episode was mind-blowing 🤯", time: "1h", unread: false },
        { name: "Priya S.", msg: "Shared your last episode with my whole team!", time: "3h", unread: false },
      ].map(({ name, msg, time, unread }, i) => (
        <g key={name}>
          <rect x="12" y={94 + i * 66} width="576" height="58" rx="10" fill={unread ? "#ffffff" : "#fafafa"} stroke="#e4e4e7" strokeWidth="1" />
          <circle cx="42" cy={123 + i * 66} r="18" fill="#e4e4e7" />
          <text x="42" y={128 + i * 66} fontSize="12" fill="#71717a" textAnchor="middle">{name[0]}</text>
          {unread && <circle cx="54" cy={108 + i * 66} r="5" fill="#d84b2d" />}
          <text x="70" y={116 + i * 66} fontSize="10" fill="#18181b" fontWeight={unread ? "600" : "400"}>{name}</text>
          <text x="70" y={130 + i * 66} fontSize="8.5" fill="#71717a">{msg.slice(0, 52)}{msg.length > 52 ? "…" : ""}</text>
          <text x="572" y={116 + i * 66} fontSize="8" fill="#a1a1aa" textAnchor="end">{time}</text>
          <rect x="490" y={134 + i * 66} width="80" height="14" rx="5" fill="#fafafa" stroke="#e4e4e7" strokeWidth="1" />
          <text x="530" y={145 + i * 66} fontSize="7.5" fill="#71717a" textAnchor="middle">Reply →</text>
        </g>
      ))}
    </svg>
  );
}

function LinkPageFigure() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full block" role="img" aria-label="Link Page screenshot">
      <rect width="600" height="360" fill="#fafafa" />
      <rect width="600" height="44" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="20" y="28" fontSize="13" fill="#18181b" fontWeight="700">Bio Page</text>
      {/* Tabs */}
      {["Profile", "Design", "Content", "Share"].map((t, i) => (
        <g key={t}>
          <rect x={12 + i * 100} y="54" width="88" height="26" rx="7" fill={i === 2 ? "#18181b" : "#ffffff"} stroke="#e4e4e7" strokeWidth="1" />
          <text x={56 + i * 100} y="71" fontSize="9" fill={i === 2 ? "#fff" : "#71717a"} textAnchor="middle">{t}</text>
        </g>
      ))}
      {/* Editor */}
      <rect x="12" y="92" width="320" height="256" rx="10" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="24" y="112" fontSize="9" fill="#71717a" fontWeight="600">SECTIONS</text>
      {[
        { label: "Latest Episodes", type: "auto" },
        { label: "Social Links", type: "manual" },
        { label: "About Me", type: "manual" },
        { label: "Custom Link", type: "manual" },
      ].map(({ label, type }, i) => (
        <g key={i}>
          <rect x="24" y={120 + i * 52} width="296" height="44" rx="8" fill="#fafafa" stroke="#e4e4e7" strokeWidth="1" />
          <text x="36" y={140 + i * 52} fontSize="9" fill="#18181b" fontWeight="500">{label}</text>
          <rect x="260" y={130 + i * 52} width="48" height="16" rx="5" fill={type === "auto" ? "#eff6ff" : "#f4f4f5"} />
          <text x="284" y={142 + i * 52} fontSize="7" fill={type === "auto" ? "#2563eb" : "#71717a"} textAnchor="middle">{type}</text>
          <text x="36" y={156 + i * 52} fontSize="7.5" fill="#a1a1aa">Drag to reorder · Edit</text>
        </g>
      ))}
      {/* Phone preview */}
      <rect x="346" y="92" width="242" height="256" rx="10" fill="#18181b" />
      <rect x="358" y="104" width="218" height="232" rx="8" fill="#09090b" />
      <text x="467" y="134" fontSize="11" fill="#ffffff" fontWeight="700" textAnchor="middle">Your Name</text>
      <text x="467" y="150" fontSize="8.5" fill="#a1a1aa" textAnchor="middle">Host · The Morning Desk</text>
      {["Ep 24 · AI Podcasting →", "Ep 23 · Interview: Sarah →", "Follow on Instagram →"].map((link, i) => (
        <g key={i}>
          <rect x="370" y={164 + i * 40} width="194" height="30" rx="8" fill="#18181b" />
          <text x="467" y={183 + i * 40} fontSize="8" fill="#e4e4e7" textAnchor="middle">{link}</text>
        </g>
      ))}
    </svg>
  );
}

function ShowsFigure() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full block" role="img" aria-label="Shows and Episodes screenshot">
      <rect width="600" height="360" fill="#fafafa" />
      <rect width="600" height="44" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <text x="20" y="28" fontSize="13" fill="#18181b" fontWeight="700">Episodes</text>
      <rect x="462" y="10" width="126" height="24" rx="8" fill="#18181b" />
      <text x="525" y="26" fontSize="9" fill="#fff" textAnchor="middle">+ New Episode</text>
      {/* Show pill */}
      <rect x="12" y="54" width="576" height="30" rx="8" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <rect x="20" y="60" width="110" height="18" rx="6" fill="#18181b" />
      <text x="75" y="73" fontSize="8.5" fill="#fff" textAnchor="middle">The Morning Desk</text>
      <rect x="138" y="60" width="110" height="18" rx="6" fill="#fafafa" stroke="#e4e4e7" strokeWidth="1" />
      <text x="193" y="73" fontSize="8.5" fill="#71717a" textAnchor="middle">Deep Dive Pod</text>
      {/* Episodes list */}
      {[
        { ep: "24", title: "The Future of AI Podcasting", date: "Aug 14, 2026", dur: "48 min", status: "Published" },
        { ep: "23", title: "Interview: Sarah Chen on Venture", date: "Aug 7, 2026", dur: "62 min", status: "Published" },
        { ep: "22", title: "Listener Q&A · Season 2 Wrap", date: "Jul 31, 2026", dur: "35 min", status: "Published" },
        { ep: "25", title: "Untitled draft", date: "—", dur: "—", status: "Draft" },
        { ep: "26", title: "Guest TBD", date: "—", dur: "—", status: "Draft" },
      ].map(({ ep, title, date, dur, status }, i) => (
        <g key={i}>
          <rect x="12" y={96 + i * 54} width="576" height="46" rx="10" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
          <rect x="24" y={108 + i * 54} width="32" height="32" rx="8" fill="#27272a" />
          <text x="40" y={128 + i * 54} fontSize="9" fill="#a1a1aa" textAnchor="middle">Ep</text>
          <text x="40" y={138 + i * 54} fontSize="8" fill="#71717a" textAnchor="middle">{ep}</text>
          <text x="66" y={116 + i * 54} fontSize="10" fill="#18181b" fontWeight="500">{title}</text>
          <text x="66" y={130 + i * 54} fontSize="8" fill="#71717a">{date} · {dur}</text>
          <rect x="452" y={108 + i * 54} width="70" height="18" rx="6"
            fill={status === "Published" ? "#f0fdf4" : "#fef3c7"} />
          <text x="487" y={121 + i * 54} fontSize="7.5"
            fill={status === "Published" ? "#16a34a" : "#d97706"} textAnchor="middle">{status}</text>
          <rect x="530" y={108 + i * 54} width="46" height="18" rx="6" fill="#fafafa" stroke="#e4e4e7" strokeWidth="1" />
          <text x="553" y={121 + i * 54} fontSize="7.5" fill="#71717a" textAnchor="middle">Edit →</text>
        </g>
      ))}
    </svg>
  );
}

/* ── Article data ─────────────────────────────────────────────────────────── */

const articles: Article[] = [
  {
    id: "what-is-podlogix", title: "What is Podlogix?",
    description: "The big idea, in one minute.", category: "Get Started",
    icon: <Zap className="h-4 w-4" />, tags: ["overview", "start", "basics"],
    figure: <DashboardFigure />, url: "/today", ctaLabel: "Open Dashboard",
    content: [
      "Podlogix is a home base for people who make podcasts and live shows.",
      "Here's the big idea: you do the show, and Podlogix does everything after. You record an episode, and the app helps turn that one recording into a whole week of content — short clips, captions, cleaned-up audio, and social media posts.",
      "The main rooms:",
      "• The Studio — where you record or go live, with your camera, screen, media, and guests.",
      "• Refiner — turns raw conversations into clear, compelling content.",
      "• Media Storage — where every recording, clip, and file lives.",
      "• Social — where you write and schedule posts for all your accounts.",
      "• Guests & CRM — where you keep track of the people who come on your show.",
      "You don't need to learn everything at once. Start with the Studio, do one show, and follow where the app takes you.",
    ],
  },
  {
    id: "dashboard", title: "Your Dashboard",
    description: "The first screen you see, and what everything on it means.", category: "Get Started",
    icon: <LayoutDashboard className="h-4 w-4" />, tags: ["dashboard", "today", "home"],
    figure: <DashboardFigure />, url: "/today", ctaLabel: "Go to Dashboard",
    content: [
      "The Dashboard is your morning check-in. It answers: how is my show doing, and what's happening today?",
      "The big three at the top:",
      "• Studio — this card is alive. It checks that your camera and mic are actually there, shows the channels you've picked, and changes with your day: it counts down when a calendar event is under an hour away, switches to On Air while you're live, and celebrates an episode you shipped in the last two days with a Promote button.",
      "• Podcast Overview — episode counts, total runtime, and the status of your hosting links (Spotify, Apple, RSS and friends).",
      "• Studio Activity — a chart of your real minutes on the air over the last two weeks, plus streams, clips, and followers.",
      "The middle row shows Social Performance (real follower counts), your Google Calendar, and Upcoming Releases.",
      "The bottom row keeps Recent Activity, Latest Episodes, and Quick Actions to jump anywhere in one click.",
    ],
  },
  {
    id: "connectors", title: "Connecting your accounts",
    description: "Link your social accounts, calendar, and podcast host.", category: "Get Started",
    icon: <Plug className="h-4 w-4" />, tags: ["connect", "accounts", "instagram", "youtube", "calendar"],
    figure: <ConnectorsFigure />, url: "/connectors", ctaLabel: "Open Connectors",
    content: [
      "Podlogix can post to your social accounts and read your calendar — but only after you connect them. Connecting is safe: you log in on the real site, and Podlogix never sees your password.",
      "How to connect:",
      "1. Open Connectors from the left rail (the plug icon).",
      "2. Pick the service you want to connect.",
      "3. A window opens on that service's own website. Log in and approve.",
      "4. You come right back to Podlogix, connected.",
      "Sometimes a connection expires. When that happens you'll see a 'reconnect' warning — just click it and approve again.",
    ],
  },
  {
    id: "live-studio", title: "The Live Studio",
    description: "Record a show with your camera and screen — like a TV studio in your browser.",
    category: "Studio", icon: <Radio className="h-4 w-4" />,
    tags: ["studio", "record", "live", "camera", "layouts"],
    figure: <StudioFigure />, url: "/studio/live", ctaLabel: "Open Studio",
    content: [
      "The Live Studio takes over your whole screen. To leave, click Exit Studio in the top-left corner.",
      "On the stage:",
      "• The camera, screen-share, and invite-guest buttons are the round icons at the bottom left.",
      "• Layouts are the little pictures in the panel on the right: fullscreen, split screen, picture-in-picture. What you see on the stage is exactly what gets recorded.",
      "• Scenes (left side) are saved stage setups — arrange the stage, type a name, and press +. During the show, one click swaps the whole scene.",
      "• Media and Prompter live in the right panel. Media plays videos or images from your storage on the stage; the Prompter scrolls your script.",
      "The most important button:",
      "When something great happens, press the spacebar (or 'Mark moment'). That drops a bookmark at that exact second — and after the show, each bookmark becomes a short clip.",
    ],
  },
  {
    id: "guests", title: "Inviting a guest onto your show",
    description: "Send one link. Your guest appears on your stage — no account needed.",
    category: "Studio", icon: <UserPlus className="h-4 w-4" />,
    tags: ["guest", "invite", "green room", "interview"],
    figure: <GuestFigure />, url: "/studio/live", ctaLabel: "Open Studio",
    content: [
      "You can bring a guest onto your show with one link — before you're live or during the show.",
      "How it works:",
      "1. Click the invite icon (the person with a +) in the studio's control bar. The link is already copied.",
      "2. Send it any way you like. Your guest opens it — no account needed.",
      "3. They land in a green room: they see their own camera, check their setup, and type their name.",
      "4. When they click 'Join the show', they appear on your stage — and in your recording.",
      "The link belongs to the studio, so it keeps working show after show. You can even put it in a calendar invite the day before.",
    ],
  },
  {
    id: "editing-room", title: "The Editing Room",
    description: "After the show: turn bookmarks into clips, add captions, clean the audio.",
    category: "Studio", icon: <Scissors className="h-4 w-4" />,
    tags: ["clips", "captions", "editing", "refine", "AI"],
    figure: <EditingRoomFigure />, url: "/media-library", ctaLabel: "Open Media Library",
    content: [
      "When your show ends, the studio switches to the Editing Room. This room is all about clips.",
      "What you can do here:",
      "• Find clips with AI — the app listens to your whole recording and marks the strong moments for you. Great if you forgot to press space.",
      "• Cut clip — every marked moment becomes a 30-second clip: 20 seconds before the mark and 10 after. Pick 16:9 or 9:16 vertical.",
      "• Captions — makes subtitle files (.srt and .vtt) so your clips have text on social media.",
      "• Refine this show — the red button sends the whole recording to Refiner, where the polish happens.",
      "Everything you make here lands in Media Storage automatically.",
    ],
  },
  {
    id: "refinery", title: "Refiner",
    description: "One button that polishes a whole recording — for real.",
    category: "Studio", icon: <Sparkles className="h-4 w-4" />,
    tags: ["refiner", "refine", "polish", "audio", "pipeline"],
    figure: <RefinerFigure />, url: "/studio/refine", ctaLabel: "Open Refiner",
    content: [
      "Refiner turns raw conversations into clear, compelling content.",
      "How to use it:",
      "1. Pick a recent recording on the Refiner page, or choose anything in Media Storage and press 'Open in Refiner'.",
      "2. Press 'Refine my show'. A glowing ring runs around the player while the pipeline works.",
      "3. Watch the checkmarks: Transcription → Remove silence → Audio cleanup.",
      "4. When it finishes, a Before / After comparison appears — play both and hear the difference.",
      "The options bar is real: Remove fillers cuts actual hesitation sounds (um, uh). Color correction gives video a gentle lift. You can also add an intro and outro from your storage — Refiner stitches them onto the refined cut.",
    ],
  },
  {
    id: "recordings", title: "Where your recording goes",
    description: "It saves itself, files itself, and converts itself. Here's the journey.",
    category: "Studio", icon: <FileText className="h-4 w-4" />,
    tags: ["recording", "mp4", "webm", "vod", "convert"],
    figure: <RecordingJourneyFigure />, url: "/media-library", ctaLabel: "Open Media Library",
    content: [
      "When you end a show you recorded in the studio, three things happen on their own:",
      "1. The recording uploads to your storage.",
      "2. It files itself into Media Storage, named after your show.",
      "3. It converts itself to MP4 in the background.",
      "Why the conversion? Web browsers can only record in a format called WebM. It plays fine on the web, but iPhones and most social media sites prefer MP4. So Podlogix quietly makes the MP4 version for you.",
    ],
  },
  {
    id: "media-library", title: "Media Storage",
    description: "One shelf for everything: recordings, clips, refined audio, and imports.",
    category: "Media", icon: <GalleryVerticalEnd className="h-4 w-4" />,
    tags: ["library", "files", "badges", "import"],
    figure: <MediaLibraryFigure />, url: "/media-library", ctaLabel: "Open Media Storage",
    content: [
      "Media Storage is one shelf that every part of Podlogix shares.",
      "Reading the page:",
      "• The number cards at the top count your files, videos, audio, and refined items.",
      "• The chips filter the grid: All, Videos, Audio, From the studio, Refined.",
      "• Each card has a badge that tells you where the file came from: 'Studio', 'Refined', or a platform icon.",
      "'Import from your channels' copies your old social posts into the library so you can reuse them.",
      "'Add media' lets you upload from your computer, or paste a YouTube link to save as a reference.",
    ],
  },
  {
    id: "media-lab", title: "The Media Lab",
    description: "The conversion bench: pick a file, pick an operation, press Run.",
    category: "Media", icon: <FlaskConical className="h-4 w-4" />,
    tags: ["lab", "convert", "refine", "mp3", "mp4"],
    figure: <MediaLabFigure />, url: "/media-lab", ctaLabel: "Open Media Lab",
    content: [
      "The Media Lab changes files from one form into another. Pick your source on the left, pick an operation, and press Run Job.",
      "The operations:",
      "• Refine Audio — cuts silence and masters the loudness to podcast standard.",
      "• Convert to MP4 — turns any video into the format everything can play.",
      "• Extract Audio — pulls just the sound out of a video, as an MP3.",
      "• Compress for Web — makes the file smaller without wrecking the quality.",
      "When a job finishes, you can Download the file or press 'Save to library'.",
    ],
  },
  {
    id: "speaking-analysis", title: "Speaking Analysis",
    description: "AI coaching on how someone comes across on camera.",
    category: "Media", icon: <Mic2 className="h-4 w-4" />,
    tags: ["speaking", "coaching", "analysis", "fillers"],
    figure: <SpeakingAnalysisFigure />, url: "/social/directory", ctaLabel: "Open Guest Directory",
    content: [
      "Speaking Analysis grades a recording the way a speech coach would. It's built for checking how a guest (or you!) comes across.",
      "Where to find it: open any guest in Guests & CRM and click 'Analyze their speaking'.",
      "What you get back:",
      "• Four scores: Overall, Presence, Speaking ability, and Filler control.",
      "• Written coaching notes — specific, not generic.",
      "• A count of every filler word, like \"um\" × 12 — so you know exactly what to work on.",
    ],
  },
  {
    id: "guests-crm", title: "Guests & CRM",
    description: "Keep track of everyone who might come on your show.",
    category: "Guests", icon: <Users className="h-4 w-4" />,
    tags: ["crm", "guests", "pipeline", "notes", "invite"],
    figure: <GuestCRMFigure />, url: "/guests", ctaLabel: "Open Guest Pipeline",
    content: [
      "Guests & CRM is your address book for show guests — plus a pipeline that remembers where each conversation stands.",
      "Each guest has a stage, like Prospect or Invited. The chips at the top count guests in each stage.",
      "Click a guest and their card slides open:",
      "• Their contact details, company, and role.",
      "• A notes trail with timestamps — jot down what you talked about, and it's there next time.",
      "• 'Analyze their speaking' — AI coaching on a clip of them.",
      "• Invite — moves them to Invited and drafts the invitation email for you.",
    ],
  },
  {
    id: "discover-directory", title: "Discover & Shortlist",
    description: "Find creators worth inviting, and save the good ones.",
    category: "Guests", icon: <Search className="h-4 w-4" />,
    tags: ["discover", "directory", "creators", "research"],
    figure: <DiscoverFigure />, url: "/social/discover", ctaLabel: "Open Discover",
    content: [
      "Discover searches for creators across social platforms — by topic, name, or handle. Each result shows their followers and engagement.",
      "When you find someone interesting, save them to your Shortlist or add them directly to a show's guest pipeline.",
      "The flow: Discover someone → confirm their podcast history → save to Shortlist or add as a Prospect → enrich contact details only when needed.",
    ],
  },
  {
    id: "posts", title: "Writing a post",
    description: "One composer for every platform, with AI that writes in your voice.",
    category: "Social", icon: <PenSquare className="h-4 w-4" />,
    tags: ["posts", "composer", "AI write", "publish"],
    figure: <PostComposerFigure />, url: "/social/posts", ctaLabel: "Open Posts",
    content: [
      "The Posts page publishes to all your connected accounts at once — now, or scheduled for later.",
      "How to write one:",
      "1. Pick a focus. 'My Show' promotes an episode (pick which one, and its artwork attaches itself).",
      "2. Pick where it goes — toggle each platform on or off.",
      "3. Write it yourself, or press AI Write and the app drafts it for you. Pick a tone: Pro, Casual, Funny, Promo, or Edu.",
      "4. Check the preview — it shows the post the way followers will see it on each platform.",
      "5. Post Now, or Save Draft.",
    ],
  },
  {
    id: "campaign-cadence", title: "Campaigns & Cadence",
    description: "Plan a week of posts on a calendar — AI fills it, you approve it.",
    category: "Social", icon: <CalendarRange className="h-4 w-4" />,
    tags: ["campaign", "cadence", "schedule", "calendar"],
    figure: <CampaignFigure />, url: "/social/posts", ctaLabel: "Open Posts Calendar",
    content: [
      "One post is nice. A plan is better. That's what Campaign and Cadence are for.",
      "• Campaign promotes one episode with several posts across the week — announcement, quote, clip, reminder. AI drafts a post for every slot; you review and approve.",
      "• Cadence is a standing rhythm — for example, three posts every week, forever. AI keeps proposing posts; you stay in charge of what actually goes out.",
      "Both live on a calendar view, so you always see your week at a glance.",
    ],
  },
  {
    id: "engagement", title: "The Engagement inbox",
    description: "Instagram DMs and comments, answered from inside Podlogix.",
    category: "Social", icon: <MessageCircle className="h-4 w-4" />,
    tags: ["engagement", "dms", "comments", "instagram"],
    figure: <EngagementFigure />, url: "/social/engagement", ctaLabel: "Open Engagement",
    content: [
      "Engagement is your Instagram inbox inside Podlogix: direct messages and comments in one place, with replies built in.",
      "Two rules Instagram enforces:",
      "• You can reply to a DM within 24 hours of the person's last message. After that, the window closes until they message again.",
      "• There's a daily cap on how many DMs you can send. If you hit it, it resets tomorrow.",
      "Comments work the same way — read them and reply without leaving the app.",
    ],
  },
  {
    id: "link-page", title: "Your Link Page",
    description: "The one link that holds everything — episodes, socials, and more.",
    category: "Social", icon: <Link2 className="h-4 w-4" />,
    tags: ["link page", "bio", "profile"],
    figure: <LinkPageFigure />, url: "/dashboard/profile", ctaLabel: "Edit Link Page",
    content: [
      "Your Link Page is the one link you put in every social bio.",
      "The editor has four tabs:",
      "• Profile — your name, photo, and bio.",
      "• Design — colors and style, with a live phone preview so you see it as you build it.",
      "• Content — the sections on the page: links, episodes, whatever you want, in the order you want.",
      "• Share — your page's address, ready to copy.",
    ],
  },
  {
    id: "shows-episodes", title: "Shows & Episodes",
    description: "Your podcast's home: shows, episodes, artwork, and feeds.",
    category: "Podcast", icon: <Mic className="h-4 w-4" />,
    tags: ["shows", "episodes", "rss", "podcast"],
    figure: <ShowsFigure />, url: "/shows", ctaLabel: "Open Shows",
    content: [
      "The Podcast workspace is where the podcast itself lives.",
      "• Shows lists your podcasts. Click one to enter its world: episodes, campaigns, audience, and settings.",
      "• Episodes lists every episode across your shows, with artwork and publish dates.",
      "• Listen is the listener side — playback and analytics.",
      "Podlogix can connect to your podcast host (like Buzzsprout) so episodes sync automatically.",
    ],
  },
];

/* ── Categories ───────────────────────────────────────────────────────────── */

const CATEGORIES = [
  { name: "Get Started", icon: <Zap className="h-4 w-4" />,              color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/30"  },
  { name: "Studio",      icon: <Radio className="h-4 w-4" />,             color: "text-red-600",    bg: "bg-red-50 dark:bg-red-950/30"      },
  { name: "Media",       icon: <GalleryVerticalEnd className="h-4 w-4" />, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
  { name: "Guests",      icon: <Users className="h-4 w-4" />,             color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/30"    },
  { name: "Social",      icon: <Share2 className="h-4 w-4" />,            color: "text-emerald-600",bg: "bg-emerald-50 dark:bg-emerald-950/30"},
  { name: "Podcast",     icon: <Mic className="h-4 w-4" />,               color: "text-pink-600",   bg: "bg-pink-50 dark:bg-pink-950/30"    },
] as const;

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function KnowledgeBase() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const firstName = (user as any)?.firstName || (user as any)?.username || null;

  const dropdownResults = useMemo(() => {
    if (searchQuery.trim().length < 2) return [];
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [searchQuery]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return articles.filter((a) => {
      const matchesSearch =
        !searchQuery ||
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q));
      const matchesCategory = !selectedCategory || a.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const isFiltering = !!searchQuery || !!selectedCategory;
  const expandedArticle = expandedId ? articles.find((a) => a.id === expandedId) : null;

  const handleSelectFromDropdown = (article: Article) => {
    setShowDropdown(false);
    setSearchQuery("");
    setSelectedCategory(null);
    setExpandedId(article.id);
    setTimeout(() => {
      document.getElementById(`article-${article.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  const handleAskAi = () => {
    setShowDropdown(false);
    window.dispatchEvent(new CustomEvent("podlogix:openAi"));
  };

  return (
    <div className="min-h-full flex flex-col">

      {/* Hero */}
      <div className="bg-zinc-900 px-8 py-12">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-3">Help Center</p>
        <h1 className="text-2xl font-bold text-white mb-6 leading-snug">
          {firstName ? (
            <><span>Hello, {firstName}.</span>{" "}<span className="text-zinc-300 font-normal">How can we help?</span></>
          ) : (
            <><span>How can we</span>{" "}<span className="text-zinc-300 font-normal">help you today?</span></>
          )}
        </h1>
        <div className="flex gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[17px] w-[17px] text-zinc-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search articles…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(e.target.value.trim().length >= 2);
                if (e.target.value === "") setSelectedCategory(null);
              }}
              onFocus={() => { if (searchQuery.trim().length >= 2) setShowDropdown(true); }}
              onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
            />
            <AnimatePresence>
              {showDropdown && dropdownResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white rounded-xl border border-zinc-200 shadow-xl z-50 overflow-hidden"
                >
                  {dropdownResults.map((article) => {
                    const catMeta = CATEGORIES.find((c) => c.name === article.category);
                    return (
                      <button
                        key={article.id}
                        onMouseDown={(e) => { e.preventDefault(); handleSelectFromDropdown(article); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors text-left border-b border-zinc-100 last:border-0"
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${catMeta?.bg ?? "bg-zinc-100"} ${catMeta?.color ?? "text-zinc-600"}`}>
                          {article.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">{article.title}</p>
                          <p className="text-xs text-zinc-500 truncate">{article.description}</p>
                        </div>
                        <span className="text-[10px] text-zinc-400 shrink-0">{article.category}</span>
                      </button>
                    );
                  })}
                  <button
                    onMouseDown={(e) => { e.preventDefault(); handleAskAi(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors text-left border-t border-zinc-100"
                  >
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">Ask Podlogix AI</p>
                      <p className="text-xs text-zinc-500">Get an instant AI answer for &ldquo;{searchQuery}&rdquo;</p>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={handleAskAi}
            className="flex items-center gap-2 h-11 px-4 rounded-xl bg-white/10 border border-white/15 text-white text-sm font-medium hover:bg-white/20 transition-colors shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            Ask AI
          </button>
        </div>
      </div>

      {/* Body: left articles (fixed width) + right screenshot (flex-1) */}
      <div className="flex-1 flex items-start">

        {/* Left column — article list */}
        <div className="w-[460px] xl:w-[500px] shrink-0 px-6 py-8 space-y-8 border-r border-border/50">

          {/* Category grid */}
          {!isFiltering && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Browse by category</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {CATEGORIES.map((cat) => {
                  const count = articles.filter((a) => a.category === cat.name).length;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => { setSelectedCategory(cat.name); setExpandedId(null); }}
                      className="group text-left flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 transition-all"
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 ${cat.bg} ${cat.color}`}>{cat.icon}</div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{cat.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{count} articles</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Articles */}
          <section>
            {selectedCategory ? (
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => { setSelectedCategory(null); setExpandedId(null); }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />All categories
                </button>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-sm font-medium text-foreground">{selectedCategory}</span>
              </div>
            ) : searchQuery ? (
              <p className="text-sm text-muted-foreground mb-4">
                {filteredArticles.length} result{filteredArticles.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
              </p>
            ) : (
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Popular articles</h2>
            )}

            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filteredArticles.map((article) => {
                  const isOpen = expandedId === article.id;
                  const catMeta = CATEGORIES.find((c) => c.name === article.category);
                  return (
                    <motion.div
                      key={article.id}
                      id={`article-${article.id}`}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className={`rounded-xl border bg-card overflow-hidden transition-shadow ${isOpen ? "shadow-sm ring-1 ring-border" : ""}`}>
                        <button
                          onClick={() => setExpandedId(isOpen ? null : article.id)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left"
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 ${catMeta?.bg ?? "bg-muted"} ${catMeta?.color ?? ""}`}>
                            {article.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground leading-snug">{article.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{article.description}</p>
                          </div>
                          {!selectedCategory && (
                            <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:flex">{article.category}</Badge>
                          )}
                          {isOpen
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-5 pt-2 border-t">
                                <div className="space-y-2 text-sm text-muted-foreground">
                                  {article.content.map((line, i) => (
                                    <p key={i} className={line.endsWith(":") ? "font-semibold text-foreground mt-3" : ""}>
                                      {line}
                                    </p>
                                  ))}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-4">
                                  {article.tags.map((tag) => (
                                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {filteredArticles.length === 0 && (
                <div className="text-center py-16">
                  <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-medium text-foreground">No articles found</p>
                  <p className="text-sm text-muted-foreground mt-1">Try a different search term.</p>
                </div>
              )}
            </div>
          </section>

          {/* FAQs */}
          {!isFiltering && (
            <section className="border-t pt-8">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Quick questions</h2>
              <div className="space-y-2">
                {[
                  { q: "Do I lose my clips if I delete a studio?", a: "No. Deleting a studio only removes the room. Every recording and clip you made stays safe in your Media Library." },
                  { q: "Does my guest need a Podlogix account?", a: "No. The invite link is all they need. They open it, type their name, and join from any modern browser." },
                  { q: "Why is my clip 30 seconds long?", a: "Each clip runs from 20 seconds before your mark to 10 seconds after. The clip reaches back to catch the moment that already happened." },
                  { q: "Can I post the same thing to every platform at once?", a: "Yes — that's what the composer is for. Toggle on the platforms you want, and the preview shows how the post looks on each one before you send it." },
                ].map(({ q, a }) => <FaqRow key={q} question={q} answer={a} />)}
              </div>
            </section>
          )}

          <div className="text-center py-6 border-t">
            <HelpCircle className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Still stuck? Email{" "}
              <a className="underline hover:text-foreground transition-colors" href="mailto:andrew@podlogix.co">
                andrew@podlogix.co
              </a>{" "}
              and a human will help.
            </p>
          </div>
        </div>

        {/* Right column — screenshot for the open article */}
        <div className="flex-1 min-w-0 hidden lg:flex flex-col px-8 py-8">
          <AnimatePresence mode="wait">
            {expandedArticle ? (
              <motion.div
                key={expandedArticle.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="sticky top-8"
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  {expandedArticle.title}
                </p>
                <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
                  {expandedArticle.figure}
                </div>
                {expandedArticle.url && (
                  <Link
                    href={expandedArticle.url}
                    className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
                  >
                    {expandedArticle.ctaLabel ?? "Open in Podlogix"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-center justify-center gap-4 h-80 rounded-2xl border-2 border-dashed border-border/60 text-center"
              >
                <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Select an article</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">A screenshot of that feature will appear here</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

function FaqRow({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors text-left"
      >
        {question}
        {open
          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 pt-1 text-sm text-muted-foreground border-t">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
