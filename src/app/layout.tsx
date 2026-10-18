import type { Metadata, Viewport } from "next";
import { Connectivity } from "@/components/layout/connectivity";
import { Inter, JetBrains_Mono, Saira_Condensed, Space_Grotesk } from "next/font/google";
import { gym } from "@/content/gym";
import "./globals.css";

// títulos condensados e pesados; rótulos e botões geométricos; dados em mono
const saira = Saira_Condensed({ variable: "--font-saira", weight: "800", subsets: ["latin"], display: "swap" });
const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${gym.name} — Smart Training Experience`,
    template: `%s · ${gym.name}`,
  },
  description:
    "Academia em Santos/SP com estrutura de grandes redes, atendimento de academia de bairro e experiência premium. Treinos, acompanhamento profissional e inteligência artificial em uma só plataforma.",
  applicationName: gym.name,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: gym.name,
    title: `${gym.name} — Revolucione o seu treino`,
    description: "Dados. Inteligência. Evolução.",
  },
  appleWebApp: { capable: true, title: gym.shortName, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#05070b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${saira.variable} ${space.variable} ${inter.variable} ${jetbrains.variable} antialiased`}>
      <body className="min-h-dvh bg-background text-white">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-black"
        >
          Pular para o conteúdo
        </a>
        <Connectivity />
        {children}
      </body>
    </html>
  );
}
