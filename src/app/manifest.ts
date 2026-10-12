import type { MetadataRoute } from "next";
import { gym } from "@/content/gym";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${gym.name} — Smart Fitness`,
    short_name: gym.shortName,
    description: "Seu treino. Sua evolução. Sua força.",
    lang: "pt-BR",
    start_url: "/aluno/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
