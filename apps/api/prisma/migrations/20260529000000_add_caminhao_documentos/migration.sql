-- AddColumn vencimento_crlv, vencimento_seguro, numero_seguro ao modelo Caminhao
ALTER TABLE "caminhoes"
  ADD COLUMN IF NOT EXISTS "vencimento_crlv"   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "vencimento_seguro"  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "numero_seguro"      VARCHAR(100);
