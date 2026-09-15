import type { MetadataRoute } from "next";

// Web App Manifest — served at /manifest.webmanifest (Next Metadata API).
// Makes NourishIQ installable: "Add to Home Screen" launches it standalone,
// fullscreen, with its own icon and green title bar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NourishIQ — Personalised Nutrition Guidance",
    short_name: "NourishIQ",
    description:
      "Prescription-first nutrition: personalised calories, macros, fibre & water targets, fit-scored foods, goal-aligned recipes and progress tracking.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF9F6",
    theme_color: "#0B5C46",
    categories: ["health", "fitness", "food", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
