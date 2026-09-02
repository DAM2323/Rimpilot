import { ImageResponse } from "next/og";

export const alt = "RIMPILOT — contabilidad por voz para vendedores informales";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
        background: "#ffffff", padding: "80px", fontFamily: "sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, background: "#3f5a2f", color: "#ffffff",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 800,
          }}>R</div>
          <div style={{ fontSize: 32, color: "#4a5c42", letterSpacing: 2 }}>RIMPILOT</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, color: "#22301c", lineHeight: 1.05 }}>Tu caja, clara.</div>
          <div style={{ fontSize: 34, color: "#5c6b55", marginTop: 24 }}>
            Contás tus ventas por teléfono. Wari arma el libro contable.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
