import Image from "next/image";
import Link from "next/link";
import marca from "../../public/logo.png";

export const metadata = { title: "Entrar | RIMPILOT", robots: { index: false, follow: false } };

export default function Entrar({ searchParams }: { searchParams: { error?: string; volver?: string } }) {
  return <main className="puerta">
    <Link href="/" className="puerta-marca">
      <Image src={marca} alt="RIMPILOT" width={160} height={126} priority />
    </Link>

    <section className="puerta-tarjeta">
      <h1>Entra a tu libro</h1>
      <p className="puerta-bajada">Tu caja, como la dejaste.</p>

      {searchParams.error && <p className="puerta-error" role="alert">{searchParams.error}</p>}

      <form method="post" action="/api/cuenta/entrar">
        {/* A dónde volvía la persona. El servidor solo acepta rutas del libro. */}
        {searchParams.volver && <input type="hidden" name="volver" value={searchParams.volver} />}

        <label htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" autoComplete="email" required />

        <label htmlFor="clave">Contraseña</label>
        <input id="clave" name="clave" type="password" autoComplete="current-password" required />

        <button type="submit">Entrar</button>
      </form>

      <p className="puerta-pie">
        ¿Todavía no tienes libro?{" "}
        <Link href={searchParams.volver ? `/crear-cuenta?volver=${encodeURIComponent(searchParams.volver)}` : "/crear-cuenta"}>
          Crea tu cuenta
        </Link>
      </p>
    </section>
  </main>;
}
