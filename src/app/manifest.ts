import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Nepal Metals — Gold & Silver",
    short_name: "Nepal Metals",
    description: "Verified Nepal gold and silver reference prices.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8f4",
    theme_color: "#203d34",
    lang: "en",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
