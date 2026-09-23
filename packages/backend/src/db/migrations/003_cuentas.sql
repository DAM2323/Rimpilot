-- Cuentas de verdad: registro con email, y entrada como invitado.
--
-- Hasta acá RIMPILOT era de un vendedor por despliegue: el `vendedor_id` salía
-- de una variable de entorno y el acceso era una contraseña compartida. Con
-- cuentas, cada persona tiene su propio libro y ninguna consulta puede volver a
-- fiarse de una constante.
--
-- Corré este archivo una sola vez sobre un proyecto anterior a las cuentas.

BEGIN;

-- El teléfono deja de ser obligatorio: quien se registra en la web no lo tiene.
ALTER TABLE vendedores ALTER COLUMN telefono DROP NOT NULL;

ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS clave_hash TEXT;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS es_invitado BOOLEAN NOT NULL DEFAULT false;

-- UNIQUE sobre columna nullable: Postgres permite varios NULL, que es lo que
-- necesitamos para los invitados y para los vendedores que entraron por teléfono.
CREATE UNIQUE INDEX IF NOT EXISTS vendedores_email_unico ON vendedores (email);

ALTER TABLE vendedores DROP CONSTRAINT IF EXISTS vendedores_tiene_identidad;
ALTER TABLE vendedores ADD CONSTRAINT vendedores_tiene_identidad
  CHECK (telefono IS NOT NULL OR email IS NOT NULL OR es_invitado);

ALTER TABLE vendedores DROP CONSTRAINT IF EXISTS vendedores_email_con_clave;
ALTER TABLE vendedores ADD CONSTRAINT vendedores_email_con_clave
  CHECK (email IS NULL OR clave_hash IS NOT NULL);

-- Los libros de invitados se acumulan solos. Este índice hace barato encontrarlos
-- para borrarlos cuando haga falta; el borrado en sí es una decisión de operación,
-- no algo que esta migración deba tomar por nadie.
CREATE INDEX IF NOT EXISTS idx_vendedores_invitados ON vendedores (creado_en) WHERE es_invitado;

COMMIT;
