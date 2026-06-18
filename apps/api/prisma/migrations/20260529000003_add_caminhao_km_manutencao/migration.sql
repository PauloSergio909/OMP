-- Add proximaManutencaoKm for km-based maintenance tracking
ALTER TABLE "caminhoes"
  ADD COLUMN IF NOT EXISTS "proxima_manutencao_km" INTEGER;
