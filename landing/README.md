# Podlogix landing page

Marketing site for podlogix.io, built from the Sept 1 design in Figma. Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript.

## Run

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the keys you have. Without keys the page renders seed content, so nothing is blocked on the API.

## Deploy

The site lives in the `landing` folder of the Podlogix repository and deploys as its own Vercel project: set the Root Directory to `landing`, framework Next.js, and add the environment variables from `.env.example` (the Podchaser key stays server-side). The app keeps the root domain; the marketing routes are proxied to this deployment through the app's `vercel.json` rewrites.

## How the page is built

- **Two layouts, one DOM.** Every section has a desktop variant (`components/sections`) and a mobile variant (`components/mobile`), swapped at 1024px with CSS. Anchors live on the wrappers in `app/page.tsx`.
- **The design is drawn at 1440.** All lengths are written in px and compiled to rem (`postcss-pxtorem`); the root font-size in `app/globals.css` scales the whole layout between 1024 and 1439px. JavaScript motion reads the same factor through `lib/useRem.ts`.
- **Gradients** are the exact radial definitions from the file, generated in `lib/gradient.ts`. The layered rings behind the hero, workspace, features and closing banner are the SVGs Figma exports, placed at the file's coordinates by `components/ui/GradientRings.tsx`.
- **Icons** go through `components/icons.tsx` (Font Awesome Free via react-icons, plus four drawn glyphs for Pro-only names). Swap the set there and nothing else changes.
- **Content** flows through `lib/content.ts`: the app's public feed first (featured Podlogix shows, then Podchaser's most followed shows and their hosts, fetched by the app with its own key), then seed data from `lib/data.ts`, cached for an hour. Sections always receive five trending shows and ten creators.

## Motion

- Loading screen and hero entrance: `components/PageIntro.tsx` and the keyframes in `app/globals.css`. Plays on every load; `?intro=0` skips it.
- Nothing pins the page. Category advances its rail one card every 2.2s while on screen, Trending deals its five cards once it comes into view, Workspace cycles rooms every 3.2s (a click holds a room for 8s), and Features flips views every 7s (a click holds for 12s). All of it rests when the section is off screen.
- The Features board plays its choreography whenever a view becomes active: the input lands, its line draws into the hub, the hub pops, the connectors draw outward and each card pops in at the end of its line, nearest first; the dashes keep flowing away from the hub. Connectors are inline SVG in `components/sections/Features.tsx`, keyframes in `app/globals.css`.
- Creator of the month rotates ten creators through the equalizer every three seconds.
- How it works cycles the highlighted stage; hovering a stage holds it.
- Why choose us: each card's illustration wakes when a third of it is on screen (the player rises through its stack and plays, the platforms pop out from the mark and light up in turn, the chart grows in, counts up, breathes and pings, the cursor tours the team on the creator beat). Keyframes in `app/globals.css` under `why-`.
- Everything respects `prefers-reduced-motion`.

## Brand

The lockup and marks in `public/l/brand` come from the Podlogix Logo file: `logo-lockup.svg` (orange mark, cream wordmark) for the nav, `logo-lockup-cream.svg` for the closing banner and the giant footer wordmark, `logo-mark.svg` / `logo-mark-cream.svg` / `logo-mark-gradient.svg` where the mark stands alone. Favicon, `icon.png` and `apple-icon.png` in `app` are rendered from the same mark on the icon frame's cocoa tile.

## Fonts

Anton from Google Fonts, Satoshi self-hosted in `app/fonts` under the Fontshare Free Font License.
