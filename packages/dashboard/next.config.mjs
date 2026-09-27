/**
 * Regla 4: cabeceras de seguridad en TODAS las respuestas.
 *
 * El middleware ya las pone en las páginas, junto con la CSP y su nonce. Pero
 * el middleware no corre sobre los archivos estáticos —los `.js` de
 * `/_next/static`, las imágenes, `robots.txt`, `llms.txt`— porque su matcher
 * los excluye a propósito, y esas respuestas salían sin ninguna. Justo los
 * `.js` son los que más necesitan `nosniff`.
 *
 * Acá van las cabeceras que no dependen de la petición. La CSP se queda en el
 * middleware, porque lleva un nonce distinto en cada respuesta.
 */
const cabeceras = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Regla 15, explícita aunque sea el valor por defecto: que nadie la active
  // sin ver este comentario.
  productionBrowserSourceMaps: false,
  // No anunciar el framework en cada respuesta.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: cabeceras }];
  },
};

export default nextConfig;
