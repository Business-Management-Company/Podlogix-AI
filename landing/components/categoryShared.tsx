import {
  IconChip,
  IconComments,
  IconFlask,
  IconGlobe,
  IconGraduationCap,
  IconHeartPulse,
  IconLandmark,
  IconMedal,
  IconMusic,
  IconNewspaper,
  IconPalette,
  IconShield,
  IconSmile,
  IconSuitcase,
  IconTrophy,
} from "@/components/icons";

/** Shared between the desktop rail and the mobile rail, which render on different sides of the client boundary. */
export const categoryIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "heart-pulse": IconHeartPulse,
  suitcase: IconSuitcase,
  chip: IconChip,
  flask: IconFlask,
  "graduation-cap": IconGraduationCap,
  comments: IconComments,
  smile: IconSmile,
  newspaper: IconNewspaper,
  trophy: IconTrophy,
  shield: IconShield,
  music: IconMusic,
  landmark: IconLandmark,
  palette: IconPalette,
  globe: IconGlobe,
  medal: IconMedal,
};

/** The cover sits under an ink wash so the label stays the loudest thing on the card. */
export const CATEGORY_WASH = "linear-gradient(180deg, rgba(31,10,9,0.38) 0%, rgba(31,10,9,0.62) 52%, rgba(31,10,9,0.94) 88%)";
