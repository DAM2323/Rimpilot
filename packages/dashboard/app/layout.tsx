import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RIMPILOT | Tu caja, clara",
  description: "Libro contable por voz para vendedores informales.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
