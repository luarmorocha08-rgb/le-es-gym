import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // áreas autenticadas e rotas técnicas não devem ser indexadas
      disallow: ["/aluno/", "/profissional/", "/admin/", "/api/", "/offline", "/redefinir-senha", "/acesso-negado"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
