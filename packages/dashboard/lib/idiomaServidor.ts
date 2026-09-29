import { cookies, headers } from "next/headers";
import { COOKIE_IDIOMA, idiomaDe, type Idioma } from "./idioma";

/** El idioma de la petición en curso, para páginas y rutas del servidor. */
export function idiomaActual(): Idioma {
  return idiomaDe(cookies().get(COOKIE_IDIOMA)?.value, headers().get("accept-language"));
}

/** Lo mismo, desde un `Request` de una ruta de API. */
export function idiomaDePeticion(request: Request): Idioma {
  const cookie = request.headers.get("cookie") ?? "";
  const valor = cookie.split(";").map((parte) => parte.trim())
    .find((parte) => parte.startsWith(`${COOKIE_IDIOMA}=`))?.slice(COOKIE_IDIOMA.length + 1);
  return idiomaDe(valor, request.headers.get("accept-language"));
}
