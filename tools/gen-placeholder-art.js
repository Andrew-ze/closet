// Generates simple, elegant SVG placeholder illustrations for the shop.
// These are garment silhouettes (no faces/photos) in the site's gold/brown/
// white palette, used until Nakiah supplies real product photography.
// Run with: node tools/gen-placeholder-art.js

const fs = require("fs");
const path = require("path");

const OUT_PRODUCTS = path.join(__dirname, "..", "public", "images", "products");
const OUT_BRAND = path.join(__dirname, "..", "public", "images", "brand");
fs.mkdirSync(OUT_PRODUCTS, { recursive: true });
fs.mkdirSync(OUT_BRAND, { recursive: true });

const IVORY = "#FAF6EF";
const CAMEL = "#E4D3B4";
const GOLD = "#C6972E";
const ESPRESSO = "#3B2A1E";
const BARK = "#241608";

function wrap(inner, w = 480, h = 640) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${IVORY}"/>
      <stop offset="1" stop-color="${CAMEL}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  ${inner}
</svg>`;
}

// A simple robed silhouette (works for abaya/dera), with a params object to vary trim.
function robeSilhouette({ trim = GOLD, pattern = false, open = false, belt = false }) {
  const head = `<circle cx="240" cy="150" r="46" fill="${ESPRESSO}" opacity="0.9"/>`;
  const veil = `<path d="M170 150 Q240 90 310 150 L322 230 Q240 200 158 230 Z" fill="${BARK}" opacity="0.92"/>`;
  const bodyLeft = open
    ? `M180 235 C150 340 140 470 150 590 L235 590 C222 470 220 350 205 235 Z`
    : `M170 235 C130 350 120 480 130 590 L350 590 C360 480 350 350 310 235 C270 210 210 210 170 235 Z`;
  const bodyRight = open ? `M300 235 C330 340 340 470 330 590 L245 590 C258 470 260 350 275 235 Z` : "";

  const main = `<path d="${bodyLeft}" fill="${ESPRESSO}"/>`;
  const rightPanel = open ? `<path d="${bodyRight}" fill="${ESPRESSO}"/>` : "";
  const innerSlip = open
    ? `<path d="M205 250 C195 360 195 480 202 585 L278 585 C285 480 285 360 275 250 Z" fill="${CAMEL}"/>`
    : "";

  const trimLine = `<path d="M170 235 C130 350 120 480 130 590" fill="none" stroke="${trim}" stroke-width="5"/>
    <path d="M310 235 C350 350 360 480 350 590" fill="none" stroke="${trim}" stroke-width="5" opacity="${open ? 0 : 1}"/>
    <path d="M180 235 C150 340 140 470 150 590" fill="none" stroke="${trim}" stroke-width="5" opacity="${open ? 1 : 0}"/>
    <path d="M300 235 C330 340 340 470 330 590" fill="none" stroke="${trim}" stroke-width="5" opacity="${open ? 1 : 0}"/>`;

  const beltPath = belt
    ? `<rect x="178" y="330" width="124" height="14" rx="3" fill="${trim}"/>`
    : "";

  const patternDots = pattern
    ? Array.from({ length: 26 })
        .map((_, i) => {
          const x = 150 + ((i * 37) % 200);
          const y = 300 + Math.floor(i / 6) * 55;
          return `<circle cx="${x}" cy="${y}" r="3.2" fill="${trim}" opacity="0.55"/>`;
        })
        .join("")
    : "";

  return `${veil}${head}${main}${rightPanel}${innerSlip}${trimLine}${beltPath}${patternDots}`;
}

function veilSilhouette({ trim = GOLD, instant = false }) {
  const head = `<circle cx="240" cy="230" r="52" fill="${ESPRESSO}" opacity="0.9"/>`;
  const drape = instant
    ? `<path d="M160 230 Q240 150 320 230 L340 420 Q240 460 140 420 Z" fill="${BARK}"/>`
    : `<path d="M150 235 Q240 130 330 235 L365 520 Q240 580 115 520 Z" fill="${BARK}"/>`;
  const edge = `<path d="M150 235 Q240 130 330 235" fill="none" stroke="${trim}" stroke-width="6"/>`;
  return `${drape}${edge}${head}`;
}

const products = [
  { file: "abaya-classic-black.svg", art: robeSilhouette({ trim: GOLD }) },
  { file: "abaya-embroidered.svg", art: robeSilhouette({ trim: GOLD, pattern: true }) },
  { file: "abaya-butterfly.svg", art: robeSilhouette({ trim: GOLD, open: true, belt: true }) },
  { file: "dera-cotton.svg", art: robeSilhouette({ trim: "#8a6a3c", belt: true }) },
  { file: "dera-printed.svg", art: robeSilhouette({ trim: "#8a6a3c", pattern: true, belt: true }) },
  { file: "veil-chiffon-gold.svg", art: veilSilhouette({ trim: GOLD }) },
  { file: "veil-jersey-plain.svg", art: veilSilhouette({ trim: CAMEL }) },
  { file: "veil-instant.svg", art: veilSilhouette({ trim: GOLD, instant: true }) }
];

for (const p of products) {
  fs.writeFileSync(path.join(OUT_PRODUCTS, p.file), wrap(p.art));
}

// Category + hero art
fs.writeFileSync(
  path.join(OUT_PRODUCTS, "category-abaya.svg"),
  wrap(robeSilhouette({ trim: GOLD, pattern: true }))
);
fs.writeFileSync(
  path.join(OUT_PRODUCTS, "category-dera.svg"),
  wrap(robeSilhouette({ trim: "#8a6a3c", belt: true }))
);
fs.writeFileSync(
  path.join(OUT_PRODUCTS, "category-veil.svg"),
  wrap(veilSilhouette({ trim: GOLD }))
);
fs.writeFileSync(
  path.join(OUT_BRAND, "hero.svg"),
  wrap(robeSilhouette({ trim: GOLD, pattern: true, belt: true }), 560, 700)
);
fs.writeFileSync(
  path.join(OUT_BRAND, "about.svg"),
  wrap(robeSilhouette({ trim: GOLD, open: true, belt: true }), 560, 700)
);

console.log("Placeholder art generated in public/images/products and public/images/brand");
