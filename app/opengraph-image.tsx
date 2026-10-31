import { ImageResponse } from "next/og";
import { PROFILE } from "@/content/portfolio";

export const alt = `${PROFILE.name} | Full-Stack Developer`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#f4fffb",
          background:
            "radial-gradient(900px 520px at 80% 0%, rgba(63,224,200,0.45), transparent 60%), radial-gradient(700px 480px at 0% 100%, rgba(255,106,69,0.28), transparent 60%), linear-gradient(180deg, #0b4a5c 0%, #04141c 70%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 14, height: 64, borderRadius: 8, background: "linear-gradient(#ffb085, #ff4d6d 45%, #3fe0c8)" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 44, fontStyle: "italic", letterSpacing: -1 }}>{PROFILE.brand}</span>
            <span style={{ fontSize: 20, letterSpacing: 6, textTransform: "uppercase", color: "#bffff3" }}>
              {PROFILE.footerBrand}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 26, letterSpacing: 6, textTransform: "uppercase", color: "#ffd0c2" }}>
            {PROFILE.name} · {PROFILE.role}
          </span>
          <span style={{ fontSize: 68, lineHeight: 1.08, maxWidth: 980, letterSpacing: -1.5 }}>{PROFILE.title}</span>
        </div>
      </div>
    ),
    size,
  );
}
