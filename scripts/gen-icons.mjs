// Generates Keel's PWA / home-screen icons from an inline SVG (a "K" monogram,
// drawn as strokes so there's no font dependency). Run: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const INK = "#22282B";
const PAPER = "#F3F0E8";

const kPaths = `
  <g stroke="${PAPER}" stroke-width="46" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M180 150 L180 362"/>
    <path d="M180 256 L336 150"/>
    <path d="M180 256 L336 362"/>
  </g>`;

// Rounded tile (manifest "any" + favicon)
const anySvg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="${INK}"/>${kPaths}
</svg>`;

// Full-bleed square with padding (maskable + apple-touch; iOS applies its own mask)
const maskSvg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="${INK}"/>
  <g transform="translate(256 256) scale(0.74) translate(-256 -256)">${kPaths}</g>
</svg>`;

mkdirSync("public/icons", { recursive: true });

const jobs = [
  [anySvg, 192, "public/icons/icon-192.png"],
  [anySvg, 512, "public/icons/icon-512.png"],
  [maskSvg, 512, "public/icons/maskable-512.png"],
  [maskSvg, 180, "public/apple-touch-icon.png"],
  [anySvg, 32, "public/favicon-32.png"],
];

for (const [svg, size, out] of jobs) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log("wrote", out, `${size}x${size}`);
}
