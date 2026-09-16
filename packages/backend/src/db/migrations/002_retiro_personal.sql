-- Reemplaza el fiado y las cuentas por cobrar/pagar por el retiro personal.
--
-- Por qué: ningún vendedor informal da crédito, así que `cuenta_por_cobrar`
-- registraba algo que no pasa. Lo que sí pasa todos los días es que el vendedor
-- saca plata de la caja para él —almuerzo, pasaje de los hijos, la casa— y no lo
-- anota. Esa es la razón número uno de que la caja no cuadre con las ventas.
--
-- Corré este archivo una sola vez sobre un proyecto creado con el esquema anterior.
-- Un proyecto nuevo no lo necesita: `schema.sql` ya trae la forma final.

BEGIN;

-- 1. Nada se borra sin copia. Si había movimientos de fiado quedan acá, con la
--    fecha del archivado, por si hay que revisarlos o revertir.
CREATE TABLE IF NOT EXISTS movimientos_fiado_archivado (LIKE movimientos INCLUDING ALL);
ALTER TABLE movimientos_fiado_archivado
  ADD COLUMN IF NOT EXISTS archivado_en TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE movimientos_fiado_archivado ENABLE ROW LEVEL SECURITY;

INSERT INTO movimientos_fiado_archivado (
  id, vendedor_id, tipo, descripcion, monto, contraparte, metodo_pago, call_sid, transcripcion, creado_en
)
SELECT id, vendedor_id, tipo, descripcion, monto, contraparte, metodo_pago, call_sid, transcripcion, creado_en
FROM movimientos
WHERE tipo IN ('cuenta_por_cobrar', 'cuenta_por_pagar')
ON CONFLICT (id) DO NOTHING;

-- No se convierten a 'retiro': una cuenta por cobrar no es plata que salió de la
-- caja, y reetiquetarla inventaría un movimiento que nunca ocurrió.
DELETE FROM movimientos WHERE tipo IN ('cuenta_por_cobrar', 'cuenta_por_pagar');

-- 2. 'fiado' deja de ser un método de pago.
UPDATE movimientos SET metodo_pago = NULL WHERE metodo_pago = 'fiado';

ALTER TABLE movimientos DROP CONSTRAINT IF EXISTS movimientos_metodo_pago_check;
ALTER TABLE movimientos ADD CONSTRAINT movimientos_metodo_pago_check
  CHECK (metodo_pago IN ('efectivo', 'yape', 'plin', 'transferencia'));

-- La venta al fiado ya no puede existir: sin ese método de pago, el constraint
-- que lo prohibía queda sin objeto.
ALTER TABLE movimientos DROP CONSTRAINT IF EXISTS movimientos_venta_no_fiada;

-- 3. Los tres tipos que quedan.
ALTER TABLE movimientos DROP CONSTRAINT IF EXISTS movimientos_tipo_check;
ALTER TABLE movimientos ADD CONSTRAINT movimientos_tipo_check
  CHECK (tipo IN ('venta', 'gasto', 'retiro'));

-- 4. El resumen deja de contar lo que le deben y pasa a contar lo que sacó.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resumen_diario' AND column_name = 'total_por_cobrar'
  ) THEN
    ALTER TABLE resumen_diario RENAME COLUMN total_por_cobrar TO total_retiros;
  END IF;
END $$;

ALTER TABLE resumen_diario
  ADD COLUMN IF NOT EXISTS total_retiros NUMERIC(12,2) NOT NULL DEFAULT 0;

-- El saldo guardado se recalcula solo en la próxima llamada, pero dejarlo con la
-- fórmula vieja mostraría una caja inflada hasta entonces.
UPDATE resumen_diario SET total_retiros = 0, saldo_del_dia = total_ventas - total_gastos;

COMMIT;
