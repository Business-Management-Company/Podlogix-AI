/**
 * Radial gradients as the Figma file describes them: a unit circle pushed
 * through a gradientTransform matrix. Rendering them as an SVG data URI keeps
 * the exact geometry the designer set, and preserveAspectRatio="none" lets the
 * same gradient stretch with the element it fills.
 */
export type Stop = [offset: number, color: string];

export const STOPS_A: Stop[] = [
  [0, "rgb(182,220,207)"],
  [0.21656, "rgb(218,198,149)"],
  [0.43313, "rgb(253,175,91)"],
  [0.68689, "rgb(246,128,65)"],
  [0.94065, "rgb(239,80,39)"],
];

export const STOPS_B: Stop[] = [
  [0, "rgb(182,220,207)"],
  [0.21009, "rgb(218,198,149)"],
  [0.42019, "rgb(253,175,91)"],
  [0.62399, "rgb(246,128,65)"],
  [0.82778, "rgb(239,80,39)"],
];

export const STOPS_PLAY: Stop[] = [
  [0, "rgb(182,220,207)"],
  [0.12922, "rgb(218,198,149)"],
  [0.25845, "rgb(253,175,91)"],
  [0.52256, "rgb(246,128,65)"],
  [0.78666, "rgb(239,80,39)"],
];

export const STOPS_PLUS: Stop[] = [
  [0, "rgb(182,220,207)"],
  [0.33631, "rgb(218,198,149)"],
  [0.67262, "rgb(253,175,91)"],
  [0.80664, "rgb(246,128,65)"],
  [0.94065, "rgb(239,80,39)"],
];

export const STOPS_TAB: Stop[] = [
  [0, "rgb(182,220,207)"],
  [0.17341, "rgb(218,198,149)"],
  [0.34682, "rgb(253,175,91)"],
  [0.54908, "rgb(246,128,65)"],
  [0.75133, "rgb(239,80,39)"],
];

export const STOPS_CREATOR_LEFT: Stop[] = [
  [0.14155, "rgb(253,175,91)"],
  [0.33883, "rgb(246,128,65)"],
  [0.53611, "rgb(239,80,39)"],
  [0.59409, "rgb(232,98,60)"],
  [0.65208, "rgb(225,115,81)"],
  [0.76805, "rgb(211,150,123)"],
  [0.88403, "rgb(196,185,165)"],
  [1, "rgb(182,220,207)"],
];

export const STOPS_CREATOR_RIGHT: Stop[] = [
  [0.12564, "rgb(239,80,39)"],
  [0.30732, "rgb(246,128,65)"],
  [0.489, "rgb(253,175,91)"],
  [0.7445, "rgb(218,198,149)"],
  [1, "rgb(182,220,207)"],
];

export function radial(
  w: number,
  h: number,
  matrix: [number, number, number, number, number, number],
  stops: Stop[] = STOPS_A,
): string {
  const s = stops
    .map(([o, c]) => `<stop stop-color='${c}' offset='${o}'/>`)
    .join("");
  const svg =
    `<svg viewBox='0 0 ${w} ${h}' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'>` +
    `<rect width='100%' height='100%' fill='url(%23g)'/>` +
    `<defs><radialGradient id='g' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(${matrix.join(" ")})'>${s}</radialGradient></defs></svg>`;
  return `url("data:image/svg+xml;utf8,${svg}")`;
}

/** Named presets, one per distinct gradient in the design. */
export const grad = {
  icon40: radial(40, 40, [3.3025, -2.3771, 1.6622, 3.6786, 6, 35]),
  icon32: radial(32, 32, [2.882, -2.1817, 1.5548, 3.2313, 2.4, 30.8]),
  iconText26: radial(26.667, 26.667, [2.2017, -1.5847, 1.1081, 2.4524, 4, 23.333]),
  search40: radial(40, 40, [3.6025, -2.7271, 1.9435, 4.0391, 3, 38.5]),
  play28: radial(28, 28, [2.1321, -3.2375, 1.2674, 1.6033, 1.5413, 28], STOPS_PLAY),
  card220x320: radial(220, 320, [-17.017, 22.826, -25.677, -7.7392, 220, -19.759], STOPS_B),
  board1360x640: radial(1360, 640, [-121.05, 81.993, -40.876, -82.915, 1360, -80.293], STOPS_B),
  plus32: radial(32, 32, [-2.4641, 2.085, -3.4705, -0.8248, 31.889, 0], STOPS_PLUS),
  chevron38: radial(38.4, 38.4, [-2.9569, 2.502, -4.1646, -0.98976, 38.266, 0], STOPS_PLUS),
  tab120x32: radial(120, 32, [-12.988, 4.0595, -3.3677, -4.0437, 122.21, -0.78378], STOPS_TAB),
  pro312x200: radial(312, 200, [-33.769, 25.372, -8.7559, -25.273, 317.74, -4.8986], STOPS_TAB),
  /* The Pro card's 2px outline: the same sweep as its header, stretched over the whole card. */
  proRing328x448: radial(328, 448, [59.239,0,0,84.346,432.36,26.73], STOPS_TAB),
  creatorLeft: radial(220, 400, [-20.706, 39.582, -29.638, -16.884, 243.5, -64.57], STOPS_CREATOR_LEFT),
  creatorMid: radial(220, 527, [-17.017, 37.591, -25.677, -12.746, 220, -32.541], STOPS_B),
  creatorRight: radial(220, 320, [-19.556, 36.022, -25.925, -15.327, 215.5, -24.219], STOPS_CREATOR_RIGHT),
  chip151x40: radial(151.67, 40, [-10.846, 2.6063, -1.1477, -5.5963, 142.81, 0], STOPS_B),
  bar44x295: radial(44, 295, [-4.0396, 22.398, -6.3489, -1.1297, 50.362, -31.765], STOPS_B),
  circle100: radial(100, 100, [8.2564, -5.9427, 4.1555, 9.1964, 15, 87.5]),
} as const;
