import type { MetadataRoute } from "next";

// Permite instalar o painel na tela inicial do celular (necessário para push no iPhone).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PedeEasy",
    short_name: "PedeEasy",
    description: "Painel de pedidos do PedeEasy",
    start_url: "/admin",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111827",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
