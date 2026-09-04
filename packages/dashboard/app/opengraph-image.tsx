import { ImageResponse } from "next/og";

export const alt = "RIMPILOT — contabilidad por voz para vendedores informales";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GRAD = "linear-gradient(120deg, #8B5CF6 0%, #3B82F6 52%, #22D3EE 100%)";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
        background: "#080D1A", padding: "76px 80px", fontFamily: "sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, backgroundImage: GRAD, color: "#080D1A",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 800,
          }}>R</div>
          <div style={{ fontSize: 30, color: "#9AABCE", letterSpacing: 6, fontWeight: 700 }}>RIMPILOT</div>
          {/* Onda de sonido del logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 12 }}>
            {[18, 34, 52, 34, 22, 12].map((h, i) => (
              <div key={i} style={{ width: 6, height: h, borderRadius: 3, background: "#22D3EE" }} />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 88, color: "#F2F5FF", lineHeight: 1.03, fontWeight: 800, letterSpacing: -3 }}>
            Tu caja, clara.
          </div>
          <div style={{ fontSize: 33, color: "#9AABCE", marginTop: 22 }}>
            Contás tus ventas por teléfono. Wari arma el libro contable.
          </div>
        </div>

        <div style={{ display: "flex", gap: 34, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 19, color: "#9AABCE" }}>Ventas</span>
            <span style={{ fontSize: 38, color: "#22D3EE", fontWeight: 800 }}>S/ 75</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 19, color: "#9AABCE" }}>Gastos</span>
            <span style={{ fontSize: 38, color: "#FB7185", fontWeight: 800 }}>S/ 15</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 19, color: "#9AABCE" }}>Caja</span>
            <span style={{ fontSize: 38, color: "#22D3EE", fontWeight: 800 }}>S/ 60</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 19, color: "#9AABCE" }}>Te deben</span>
            <span style={{ fontSize: 38, color: "#FB7185", fontWeight: 800 }}>S/ 20</span>
          </div>
          <div style={{ marginLeft: "auto", height: 5, width: 220, borderRadius: 3, backgroundImage: GRAD }} />
        </div>
      </div>
    ),
    size,
  );
}
