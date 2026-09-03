/**
 * The four rooms of the workspace section, as drawn in the Figma states.
 * Every mockup is a 780px-wide browser window placed at the file's own
 * coordinates inside the 930x672 gradient panel. The window keeps its
 * corner radius and carries an OUTSIDE stroke, white at 20%, that Figma
 * composites over the gradient; the PNGs hold the content pixels only (2x,
 * corners already transparent) so the stroke is drawn in CSS as a spread
 * shadow with exactly the file's width. The Dashboard window is 429 tall but
 * its content ends at 426.4, which leaves the file's hairline of gradient
 * between content and stroke.
 */
export type Room = {
  key: "dashboard" | "live" | "podcast" | "discovery";
  label: string;
  image: string;
  /** window origin inside the panel */
  x: number;
  y: number;
  /** window height (width is always 780) */
  h: number;
  /** content height inside the window */
  imgH: number;
  /** corner radius */
  r: number;
  /** outside stroke width */
  s: number;
};

export const ROOM_W = 780;
export const STROKE_COLOR = "rgba(255, 255, 255, 0.2)";

export const rooms: Room[] = [
  { key: "dashboard", label: "Dashboard", image: "/l/images/workspace/room-dashboard.png", x: 74.64, y: 122, h: 429, imgH: 426.4, r: 17.16, s: 8.667 },
  { key: "live", label: "Live studio", image: "/l/images/workspace/room-live-studio.png", x: 75, y: 127, h: 417.45, imgH: 417.45, r: 24.861, s: 10.359 },
  { key: "podcast", label: "Podcast", image: "/l/images/workspace/room-podcast.png", x: 75, y: 123, h: 426, imgH: 426, r: 24, s: 10 },
  { key: "discovery", label: "Discovery", image: "/l/images/workspace/room-discovery.png", x: 75, y: 123, h: 427, imgH: 427, r: 16, s: 10 },
];

/** Lengths in the design are px at 1440; the CSS is rem so the page scales. */
export const rem = (px: number) => `${px / 16}rem`;
