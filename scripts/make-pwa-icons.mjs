// Generate NourishIQ PWA icons from one master SVG (sprout-in-bowl glyph on the
// brand gradient). Run: bun scripts/make-pwa-icons.mjs
// Outputs to public/: icons/icon-{192,512}.png, icons/maskable-{192,512}.png,
// apple-touch-icon.png (180, no transparency for iOS).

import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const W = 1024;

// Glyph stays inside the maskable safe zone (all points ≤ ~30% from centre).
const art = (scale = 1) => {
  const s = (v) => Math.round(W / 2 + (v - W / 2) * scale);
  return `
  <g>
    <!-- bowl -->
    <path d="M ${s(332)} ${s(748)} C ${s(384)} ${s(826)} ${s(640)} ${s(826)} ${s(692)} ${s(748)}"
      stroke="#FFFFFF" stroke-width="${Math.round(44 * scale)}" stroke-linecap="round" fill="none"/>
    <!-- stem -->
    <path d="M ${s(512)} ${s(742)} C ${s(516)} ${s(648)} ${s(508)} ${s(560)} ${s(512)} ${s(452)}"
      stroke="#FFFFFF" stroke-width="${Math.round(34 * scale)}" stroke-linecap="round" fill="none"/>
    <!-- left leaf -->
    <path d="M ${s(512)} ${s(566)} C ${s(398)} ${s(560)} ${s(318)} ${s(478)} ${s(310)} ${s(352)}
             C ${s(436)} ${s(360)} ${s(506)} ${s(444)} ${s(512)} ${s(566)} Z" fill="#FFFFFF"/>
    <!-- right leaf -->
    <path d="M ${s(514)} ${s(508)} C ${s(518)} ${s(394)} ${s(606)} ${s(310)} ${s(730)} ${s(302)}
             C ${s(722)} ${s(428)} ${s(638)} ${s(506)} ${s(514)} ${s(508)} Z" fill="#FFFFFF"/>
  </g>`;
};

const svgFor = (glyphScale) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0F766E"/>
        <stop offset="0.55" stop-color="#0B5C46"/>
        <stop offset="1" stop-color="#084B38"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${W}" fill="url(#g)"/>
    ${art(glyphScale)}
  </svg>`;

mkdirSync("public/icons", { recursive: true });

const jobs = [
  ["public/icons/icon-192.png", 192, 1],
  ["public/icons/icon-512.png", 512, 1],
  ["public/icons/maskable-192.png", 192, 0.82],
  ["public/icons/maskable-512.png", 512, 0.82],
  ["public/apple-touch-icon.png", 180, 0.94],
];

for (const [out, size, glyphScale] of jobs) {
  const png = await sharp(Buffer.from(svgFor(glyphScale))).resize(size, size).png().toBuffer();
  writeFileSync(out, png);
  console.log("wrote", out, `${size}x${size}`);
}
console.log("done");
