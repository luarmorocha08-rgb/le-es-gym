import type { MetadataRoute } from "next";
import { gym } from "@/content/gym";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${gym.name} — Smart Training`,
    short_name: gym.shortName,
    description: "Dados. Inteligência. Evolução.",
    lang: "pt-BR",
    start_url: "/aluno/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05070b",
    theme_color: "#05070b",
    categories: ["health", "fitness", "sports"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Meu treino", url: "/aluno/meus-treinos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Evolução", url: "/aluno/evolucao", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
