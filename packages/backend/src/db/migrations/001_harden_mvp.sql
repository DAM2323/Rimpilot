-- Run this once on a Supabase project created with an earlier RIMPILOT schema.
ALTER TABLE resumen_diario
  ADD COLUMN IF NOT EXISTS total_por_cobrar NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumen_diario ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE movimientos;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE movimientos DROP CONSTRAINT IF EXISTS movimientos_venta_no_fiada;
ALTER TABLE movimientos ADD CONSTRAINT movimientos_venta_no_fiada
  CHECK (NOT (tipo = 'venta' AND metodo_pago = 'fiado'));
