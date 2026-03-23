-- Add CHECK constraints to cartera tables for data integrity
-- These constraints enforce business rules at the database level

-- Ensure valor_venta is positive
ALTER TABLE cartera
  ADD CONSTRAINT cartera_valor_venta_positive CHECK (valor_venta > 0);

-- Ensure cash is non-negative and does not exceed valor_venta
ALTER TABLE cartera
  ADD CONSTRAINT cartera_cash_non_negative CHECK (cash >= 0);

ALTER TABLE cartera
  ADD CONSTRAINT cartera_cash_lte_valor CHECK (cash <= valor_venta);

-- Ensure pago monto is positive
ALTER TABLE cartera_pagos
  ADD CONSTRAINT cartera_pagos_monto_positive CHECK (monto > 0);
