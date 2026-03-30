-- Vincula abonos de cartera con transacciones de ingreso (1:1).
-- Al borrar la transacción, el abono se elimina en cascada.

ALTER TABLE public.cartera_pagos
  ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS cartera_pagos_transaction_id_key
  ON public.cartera_pagos (transaction_id)
  WHERE transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS cartera_pagos_transaction_id_idx
  ON public.cartera_pagos (transaction_id);
