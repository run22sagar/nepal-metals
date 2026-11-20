import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("public/icons", { recursive: true });
for (const size of [192, 512]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="100" fill="#203d34"/><path d="M160 170h192l48 72-144 140L112 242z" fill="none" stroke="#d8b868" stroke-width="18" stroke-linejoin="round"/><path d="M112 242h288M208 170l-32 72 80 140 80-140-32-72" fill="none" stroke="#d8b868" stroke-width="12" stroke-linejoin="round"/></svg>`;
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
  if (size === 512)
    await sharp(Buffer.from(svg)).png().toFile("public/icons/maskable-512.png");
}
console.log("PWA icons generated.");
