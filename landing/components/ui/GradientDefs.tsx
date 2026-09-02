/**
 * One hidden SVG holding the brand radial gradient so any icon can take it as
 * a fill with `[fill:url(#pl-grad)]`. objectBoundingBox units map the same
 * bottom-left-to-top-right sweep onto every glyph regardless of size.
 */
export function GradientDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <radialGradient id="pl-grad" cx="0.15" cy="0.875" r="1.05" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor="#b6dccf" />
          <stop offset="0.21656" stopColor="#dac695" />
          <stop offset="0.43313" stopColor="#fdaf5b" />
          <stop offset="0.68689" stopColor="#f68041" />
          <stop offset="0.94065" stopColor="#ef5027" />
        </radialGradient>
        <radialGradient id="pl-grad-tr" cx="0.98" cy="0.02" r="1.15" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor="#b6dccf" />
          <stop offset="0.33631" stopColor="#dac695" />
          <stop offset="0.67262" stopColor="#fdaf5b" />
          <stop offset="0.80664" stopColor="#f68041" />
          <stop offset="0.94065" stopColor="#ef5027" />
        </radialGradient>
      </defs>
    </svg>
  );
}
