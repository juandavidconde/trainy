// Genera los íconos PWA con la marca "Volt".
// T geométrica en volt sobre fondo #0D100E; el segmento inferior
// separado evoca una serie completada. Correr: node scripts/gen-icons.mjs
import sharp from "sharp";
import { writeFileSync } from "node:fs";

function iconSvg(size, { rounded }) {
  const s = size / 512;
  const r = rounded ? Math.round(512 * 0.227 * s) : 0;
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="${r / s}" fill="#0D100E"/>
  <rect x="122" y="132" width="268" height="58" rx="16" fill="#C8F169"/>
  <rect x="227" y="132" width="58" height="196" rx="16" fill="#C8F169"/>
  <rect x="227" y="348" width="58" height="40" rx="14" fill="#C8F169"/>
</svg>`;
}

const jobs = [
  { file: "public/icon-512.png", size: 512, rounded: true },
  { file: "public/icon-192.png", size: 192, rounded: true },
  { file: "public/apple-touch-icon.png", size: 180, rounded: false },
];

for (const { file, size, rounded } of jobs) {
  const svg = Buffer.from(iconSvg(512, { rounded }));
  await sharp(svg).resize(size, size).png().toFile(file);
  console.log("✓", file);
}
writeFileSync("public/icon.svg", iconSvg(512, { rounded: true }));
console.log("✓ public/icon.svg");
