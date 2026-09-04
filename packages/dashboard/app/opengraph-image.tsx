import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "RIMPILOT — contabilidad por voz para vendedores informales";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** El lockup real del logo, embebido para que la imagen social no dependa de la red. */
const logo = `data:image/png;base64,${readFileSync(join(process.cwd(), "public/logo.png")).toString("base64")}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", alignItems: "center",
        background: "#080D1A", padding: "0 82px", gap: 70, fontFamily: "sans-serif",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" width={362} height={284} />

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 78, color: "#F2F5FF", lineHeight: 1.04, fontWeight: 800, letterSpacing: -3 }}>
            Tu caja, clara.
          </div>
          <div style={{ fontSize: 30, color: "#9AABCE", marginTop: 20, lineHeight: 1.35 }}>
            Contás tus ventas por teléfono. Wari arma el libro contable.
          </div>
          <div style={{ display: "flex", gap: 30, marginTop: 40 }}>
            {[["Ventas", "S/ 75", "#01B2F8"], ["Gastos", "S/ 15", "#FB7185"],
              ["Caja", "S/ 60", "#01B2F8"], ["Te deben", "S/ 20", "#FB7185"]].map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 18, color: "#9AABCE" }}>{l}</span>
                <span style={{ fontSize: 35, color: c, fontWeight: 800 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 5, width: 300, borderRadius: 3, marginTop: 38,
            backgroundImage: "linear-gradient(120deg, #824CE8 0%, #4F73EF 52%, #01B2F8 100%)" }} />
        </div>
      </div>
    ),
    size,
  );
}
