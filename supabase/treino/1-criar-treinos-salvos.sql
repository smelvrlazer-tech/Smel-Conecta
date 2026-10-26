-- ============================================================================
-- HISTÓRICO DE TREINOS SALVOS (gerador de treino funcional)
-- Guarda cada treino salvo por polo, com data da aula e (opcional) turma, para
-- reabrir depois em vez de gerar um novo.
-- Como usar: copie TUDO, cole no SQL Editor do Supabase e clique em Run.
-- Resultado esperado: "Success. No rows returned". Seguro de rodar mais de uma vez.
--
-- QUEM ACESSA (fase piloto): SÓ o dono do sistema (conta "Administrador SMEL",
-- is_owner = true). Mais ninguém lê nem grava; o banco nega.
-- ============================================================================

CREATE OR REPLACE FUNCTION treino_dono()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE((SELECT is_owner FROM profiles WHERE id = auth.uid()), false); $$;

CREATE TABLE IF NOT EXISTS treinos_salvos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  polo_id       uuid NOT NULL REFERENCES polos(id) ON DELETE CASCADE,
  turma_id      uuid REFERENCES turmas(id) ON DELETE SET NULL,
  data_aula     date NOT NULL DEFAULT CURRENT_DATE,
  titulo        text NOT NULL CHECK (length(btrim(titulo)) > 0),
  conteudo      jsonb NOT NULL,          -- o treino inteiro (blocos, exercícios, regras)
  observacao    text,
  criado_por    uuid DEFAULT auth.uid(),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS treinos_salvos_polo_data_idx ON treinos_salvos (polo_id, data_aula DESC);

CREATE OR REPLACE FUNCTION treinos_salvos_antes_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_treinos_salvos_update ON treinos_salvos;
CREATE TRIGGER trg_treinos_salvos_update
  BEFORE UPDATE ON treinos_salvos
  FOR EACH ROW EXECUTE FUNCTION treinos_salvos_antes_update();

ALTER TABLE treinos_salvos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treinos_salvos: so o dono do sistema" ON treinos_salvos;
CREATE POLICY "treinos_salvos: so o dono do sistema"
  ON treinos_salvos FOR ALL
  USING (treino_dono())
  WITH CHECK (treino_dono());
