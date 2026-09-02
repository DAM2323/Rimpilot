CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefono TEXT UNIQUE NOT NULL,
  nombre TEXT,
  nombre_negocio TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES vendedores(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('venta', 'gasto', 'cuenta_por_cobrar', 'cuenta_por_pagar')),
  descripcion TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  contraparte TEXT,
  metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'yape', 'plin', 'transferencia', 'fiado')),
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
  saldo_del_dia NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE(vendedor_id, fecha)
);

INSERT INTO vendedores (telefono, nombre, nombre_negocio)
VALUES ('+51999999999', 'María', 'Pollería María')
ON CONFLICT (telefono) DO NOTHING;
