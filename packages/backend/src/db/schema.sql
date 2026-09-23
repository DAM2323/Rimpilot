CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Hay tres formas de llegar a tener un libro y cada una deja un rastro
  -- distinto: por teléfono (Twilio), registrándose en la web, o entrando como
  -- invitado. Ninguna de las tres columnas puede ser obligatoria por sí sola.
  telefono TEXT UNIQUE,
  email TEXT UNIQUE,
  clave_hash TEXT,
  es_invitado BOOLEAN NOT NULL DEFAULT false,
  nombre TEXT,
  nombre_negocio TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un vendedor sin ninguna de las tres sería un libro al que nadie puede volver.
ALTER TABLE vendedores DROP CONSTRAINT IF EXISTS vendedores_tiene_identidad;
ALTER TABLE vendedores ADD CONSTRAINT vendedores_tiene_identidad
  CHECK (telefono IS NOT NULL OR email IS NOT NULL OR es_invitado);

-- Quien se registra con email necesita clave; el invitado y el del teléfono no.
ALTER TABLE vendedores DROP CONSTRAINT IF EXISTS vendedores_email_con_clave;
ALTER TABLE vendedores ADD CONSTRAINT vendedores_email_con_clave
  CHECK (email IS NULL OR clave_hash IS NOT NULL);

CREATE TABLE IF NOT EXISTS movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES vendedores(id),
  -- Tres tipos y no más. 'retiro' es la plata que el vendedor saca de la caja
  -- para él, no para el negocio: es lo que explica que la caja no cuadre con
  -- las ventas al final del día.
  tipo TEXT NOT NULL CHECK (tipo IN ('venta', 'gasto', 'retiro')),
  descripcion TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  contraparte TEXT,
  metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'yape', 'plin', 'transferencia')),
  call_sid TEXT,
  transcripcion TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_vendedor_fecha ON movimientos(vendedor_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos(tipo);

CREATE TABLE IF NOT EXISTS resumen_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES vendedores(id),
  fecha DATE NOT NULL,
  total_ventas NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_gastos NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_retiros NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- caja = ventas − gastos − retiros
  saldo_del_dia NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE(vendedor_id, fecha)
);

ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumen_diario ENABLE ROW LEVEL SECURITY;

-- The backend and dashboard server use the Supabase service role. No browser
-- policy is deliberately exposed: a vendor's ledger must never be public.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE movimientos;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Este archivo solo crea estructura. El vendedor inicial se carga con
-- `pnpm --filter @rimpilot/backend seed`, que exige los datos por variables de
-- entorno y no tiene ninguna identidad por defecto.
