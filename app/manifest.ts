import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Keel — Co-Parenting Calendar",
    short_name: "Keel",
    description: "Who has Patrick, right now.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F3F0E8",
    theme_color: "#22282B",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
