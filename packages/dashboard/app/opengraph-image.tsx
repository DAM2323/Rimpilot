import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "RIMPILOT — tell it your day, keep your books";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** El lockup real del logo, embebido para que la imagen social no dependa de la red. */
const logo = `data:image/png;base64,${readFileSync(join(process.cwd(), "public/logo.png")).toString("base64")}`;

/**
 * En inglés: la imagen es una sola para los dos idiomas y la ven sobre todo
 * quienes reciben el enlace —el jurado, en lablab—, no el vendedor en la app.
 */
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
            Tell it your day.
          </div>
          <div style={{ fontSize: 30, color: "#9AABCE", marginTop: 20, lineHeight: 1.35 }}>
            Keep your books by voice: sales, expenses and what you took for yourself.
          </div>
          {/* Los cuatro números cuentan la resta: vendiste 75 y te quedan 40. */}
          <div style={{ display: "flex", gap: 30, marginTop: 40 }}>
            {[["Sales", "S/ 75", "#01B2F8"], ["Expenses", "S/ 15", "#FB7185"],
              ["You took", "S/ 20", "#A78BFA"], ["Left", "S/ 40", "#01B2F8"]].map(([l, v, c]) => (
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
