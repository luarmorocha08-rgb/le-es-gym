import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const pages: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/academia", priority: 0.8, changeFrequency: "monthly" },
    { path: "/equipe", priority: 0.7, changeFrequency: "weekly" },
    { path: "/contato", priority: 0.8, changeFrequency: "monthly" },
    { path: "/cadastro", priority: 0.6, changeFrequency: "yearly" },
    { path: "/login", priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacidade", priority: 0.2, changeFrequency: "yearly" },
  ];
  return pages.map((p) => ({ url: `${base}${p.path}`, changeFrequency: p.changeFrequency, priority: p.priority }));
}
