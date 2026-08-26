// Generates the Expo app's icon / adaptive-icon / splash from the K monogram.
// Run: node scripts/gen-mobile-assets.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const INK = "#22282B";
const PAPER = "#F3F0E8";

const kPaths = (scale = 1) => `
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)"
     stroke="${PAPER}" stroke-width="92" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M360 300 L360 724"/>
    <path d="M360 512 L672 300"/>
    <path d="M360 512 L672 724"/>
  </g>`;

// Opaque app icon (iOS requires no alpha): full-bleed ink + K.
const iconSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="${INK}"/>${kPaths(0.72)}
</svg>`;

// Android adaptive foreground: K only, on transparent, kept in the safe zone.
const adaptiveSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${kPaths(0.5)}
</svg>`;

// Splash: K centered; Expo fills the rest with backgroundColor.
const splashSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="${INK}"/>${kPaths(0.55)}
</svg>`;

mkdirSync("mobile/assets", { recursive: true });

const jobs = [
  [iconSvg, 1024, "mobile/assets/icon.png"],
  [adaptiveSvg, 1024, "mobile/assets/adaptive-icon.png"],
  [splashSvg, 1024, "mobile/assets/splash.png"],
  [iconSvg, 48, "mobile/assets/favicon.png"],
];

for (const [svg, size, out] of jobs) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log("wrote", out, `${size}x${size}`);
}
