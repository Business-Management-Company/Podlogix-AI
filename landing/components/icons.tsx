/**
 * Every icon in the site goes through this file. The design is set in Font
 * Awesome, so the glyphs come from Font Awesome Free via react-icons; the few
 * Pro-only glyphs the file uses are drawn below to match. Swapping the set
 * later touches this file only.
 */
import type { ComponentProps } from "react";
import type { IconType } from "react-icons";
import {
  FaAnglesRight,
  FaChevronLeft,
  FaChevronRight,
  FaComments,
  FaEarthAmericas,
  FaHeartPulse,
  FaLandmark,
  FaMedal,
  FaMicrochip,
  FaShieldHalved,
  FaTrophy,
  FaArrowUp,
  FaAtom,
  FaBackward,
  FaBars,
  FaXmark,
  FaBullhorn,
  FaCheck,
  FaChevronUp,
  FaCirclePlay,
  FaClock,
  FaCreditCard,
  FaDesktop,
  FaEnvelope,
  FaFaceSmile,
  FaFlask,
  FaFootball,
  FaForward,
  FaGithub,
  FaGraduationCap,
  FaHeadphones,
  FaHouse,
  FaInstagram,
  FaJetFighterUp,
  FaLinkedinIn,
  FaMagnifyingGlass,
  FaMap,
  FaMicrophone,
  FaMusic,
  FaNewspaper,
  FaPalette,
  FaPlay,
  FaPlus,
  FaQuoteLeft,
  FaRocket,
  FaScissors,
  FaShareNodes,
  FaSpotify,
  FaStar,
  FaSuitcase,
  FaSuitcaseMedical,
  FaTiktok,
  FaTriangleExclamation,
  FaUsers,
  FaVideo,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";

export type IconProps = { className?: string; size?: number; title?: string };

function make(I: IconType) {
  return function Icon({ className, size, title }: IconProps) {
    return <I className={className} size={size} aria-hidden={title ? undefined : true} title={title} />;
  };
}

export const IconRocket = make(FaRocket);
export const IconCreditCard = make(FaCreditCard);
export const IconSearch = make(FaMagnifyingGlass);
export const IconSuitcaseMedical = make(FaSuitcaseMedical);
export const IconSuitcase = make(FaSuitcase);
export const IconFlask = make(FaFlask);
export const IconGraduationCap = make(FaGraduationCap);
export const IconAtom = make(FaAtom);
export const IconSmile = make(FaFaceSmile);
export const IconNewspaper = make(FaNewspaper);
export const IconFootball = make(FaFootball);
export const IconWarning = make(FaTriangleExclamation);
export const IconMusic = make(FaMusic);
export const IconHeartPulse = make(FaHeartPulse);
export const IconChip = make(FaMicrochip);
export const IconComments = make(FaComments);
export const IconTrophy = make(FaTrophy);
export const IconShield = make(FaShieldHalved);
export const IconLandmark = make(FaLandmark);
export const IconGlobe = make(FaEarthAmericas);
export const IconMedal = make(FaMedal);
export const IconChevronLeft = make(FaChevronLeft);
export const IconChevronRight = make(FaChevronRight);
export const IconMap = make(FaMap);
export const IconPalette = make(FaPalette);
export const IconUsers = make(FaUsers);
export const IconJetFighter = make(FaJetFighterUp);
export const IconClock = make(FaClock);
export const IconHeadphones = make(FaHeadphones);
export const IconPlay = make(FaPlay);
export const IconHome = make(FaHouse);
export const IconMicrophone = make(FaMicrophone);
export const IconPlus = make(FaPlus);
export const IconVideo = make(FaVideo);
export const IconChevronsRight = make(FaAnglesRight);
export const IconChevronUp = make(FaChevronUp);
export const IconDesktop = make(FaDesktop);
export const IconScissors = make(FaScissors);
export const IconShareNodes = make(FaShareNodes);
export const IconBullhorn = make(FaBullhorn);
export const IconEnvelope = make(FaEnvelope);
export const IconQuote = make(FaQuoteLeft);
export const IconCheck = make(FaCheck);
export const IconArrowUp = make(FaArrowUp);
export const IconBackward = make(FaBackward);
export const IconForward = make(FaForward);
export const IconPlayCircle = make(FaCirclePlay);
export const IconStar = make(FaStar);
export const IconBars = make(FaBars);
export const IconClose = make(FaXmark);

export const IconLinkedin = make(FaLinkedinIn);
export const IconSpotify = make(FaSpotify);
export const IconInstagram = make(FaInstagram);
export const IconTiktok = make(FaTiktok);
export const IconYoutube = make(FaYoutube);
export const IconX = make(FaXTwitter);
export const IconGithub = make(FaGithub);

type SvgProps = ComponentProps<"svg"> & { size?: number };

/** Pro-only "signal-stream": a dot with two arcs each side. */
export function IconSignalStream({ size = 16, className, ...rest }: SvgProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
      {...rest}
    >
      <circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none" />
      <path d="M8.6 8.4a5 5 0 0 0 0 7.2M15.4 8.4a5 5 0 0 1 0 7.2" />
      <path d="M5.4 5.2a9.6 9.6 0 0 0 0 13.6M18.6 5.2a9.6 9.6 0 0 1 0 13.6" />
    </svg>
  );
}

/** Pro-only "sparkles": a large and a small four-point star. */
export function IconSparkles({ size = 16, className, ...rest }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" aria-hidden {...rest}>
      <path d="M9.5 2.5 Q9.5 9.5 16.5 9.5 Q9.5 9.5 9.5 16.5 Q9.5 9.5 2.5 9.5 Q9.5 9.5 9.5 2.5Z" />
      <path d="M17.5 12.5 Q17.5 17 22 17 Q17.5 17 17.5 21.5 Q17.5 17 13 17 Q17.5 17 17.5 12.5Z" />
      <path d="M17 2 Q17 5 20 5 Q17 5 17 8 Q17 5 14 5 Q17 5 17 2Z" />
    </svg>
  );
}

/** Pro-only "stars": one solid star with two small sparkles. */
export function IconStars({ size = 16, className, ...rest }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" aria-hidden {...rest}>
      <path d="m9.3 3.9 1.9 4.1 4.5.5-3.3 3.1.9 4.5-4-2.2-4 2.2.9-4.5L2.9 8.5l4.5-.5z" />
      <path d="M18 2.5 Q18 6 21.5 6 Q18 6 18 9.5 Q18 6 14.5 6 Q18 6 18 2.5Z" />
      <path d="M18.5 13.5 Q18.5 17 22 17 Q18.5 17 18.5 20.5 Q18.5 17 15 17 Q18.5 17 18.5 13.5Z" />
    </svg>
  );
}

/** Pro-only "screencast": a display with cast waves in the corner. */
export function IconScreencast({ size = 16, className, ...rest }: SvgProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      <path d="M3 8.5V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8.5" />
      <path d="M3 12.5a8.5 8.5 0 0 1 8.5 8.5" />
      <path d="M3 16.2a4.8 4.8 0 0 1 4.8 4.8" />
      <circle cx="3.6" cy="20.4" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** The equalizer glyph that leads every section eyebrow. */
export function EqGlyph({ className = "" }: { className?: string }) {
  return (
    <span className={`flex h-5 w-5 items-center justify-center gap-[2px] ${className}`} aria-hidden>
      <i className="block h-[6px] w-[2px] rounded-[24px] bg-current" />
      <i className="block h-[16px] w-[2px] rounded-[24px] bg-current" />
      <i className="block h-[4px] w-[2px] rounded-[24px] bg-current" />
      <i className="block h-[10px] w-[2px] rounded-[24px] bg-current" />
    </span>
  );
}
