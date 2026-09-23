import Image from "next/image";
import Link from "next/link";
import marca from "../../public/logo.png";

export const metadata = { title: "Crear cuenta | RIMPILOT", robots: { index: false, follow: false } };

export default function CrearCuenta({ searchParams }: { searchParams: { error?: string; volver?: string } }) {
  return <main className="puerta">
    <Link href="/" className="puerta-marca">
      <Image src={marca} alt="RIMPILOT" width={160} height={126} priority />
    </Link>

    <section className="puerta-tarjeta">
      <h1>Abrí tu libro</h1>
      <p className="puerta-bajada">Dos datos y ya podés hablarle a Wari.</p>

      {searchParams.error && <p className="puerta-error" role="alert">{searchParams.error}</p>}

      <form method="post" action="/api/cuenta/registro">
        {searchParams.volver && <input type="hidden" name="volver" value={searchParams.volver} />}

        <label htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" autoComplete="email" required />

        <label htmlFor="clave">Contraseña</label>
        <input id="clave" name="clave" type="password" autoComplete="new-password" required minLength={8} />
        <small className="puerta-ayuda">Mínimo 8 caracteres.</small>

        <label htmlFor="nombre">Tu nombre <span>(opcional)</span></label>
        <input id="nombre" name="nombre" type="text" autoComplete="given-name" maxLength={80} />

        <label htmlFor="negocio">Tu negocio <span>(opcional)</span></label>
        <input id="negocio" name="negocio" type="text" autoComplete="organization" maxLength={80} />

        <button type="submit">Crear mi libro</button>
      </form>

      <p className="puerta-pie">
        ¿Ya tenés cuenta?{" "}
        <Link href={searchParams.volver ? `/entrar?volver=${encodeURIComponent(searchParams.volver)}` : "/entrar"}>
          Entrá
        </Link>
      </p>
    </section>
  </main>;
}
