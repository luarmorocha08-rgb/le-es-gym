import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { gym } from "@/content/gym";

export const alt = `${gym.name} — Smart Fitness Experience`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem de compartilhamento gerada a partir da marca (sem fotos genéricas). */
export default async function OpenGraphImage() {
  const icon = await readFile(join(process.cwd(), "public/icons/icon-512.png"));
  const src = `data:image/png;base64,${icon.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "white",
          background: "radial-gradient(ellipse at 70% 0%, #2a2d33 0%, #050505 60%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <img src={src} width={96} height={96} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: 4 }}>{gym.name}</div>
            <div style={{ fontSize: 24, color: "rgba(255,255,255,0.6)", letterSpacing: 6 }}>SMART FITNESS EXPERIENCE</div>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.02, maxWidth: 1000 }}>{gym.slogan}</div>
        <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.6)" }}>
          {`${gym.address.city}/${gym.address.state} · ${gym.links.instagramHandle}`}
        </div>
      </div>
    ),
    size,
  );
}
