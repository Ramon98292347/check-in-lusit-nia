ALTER TABLE public.hospedagens
  ADD COLUMN IF NOT EXISTS status_impressao text DEFAULT 'PENDENTE_IMPRESSAO',
  ADD COLUMN IF NOT EXISTS impresso_em timestamptz;

UPDATE public.hospedagens
SET status_impressao = COALESCE(status_impressao, 'PENDENTE_IMPRESSAO')
WHERE status_impressao IS NULL;

CREATE INDEX IF NOT EXISTS idx_hospedagens_status_impressao
  ON public.hospedagens(status_impressao);

CREATE INDEX IF NOT EXISTS idx_hospedagens_impresso_em
  ON public.hospedagens(impresso_em);
