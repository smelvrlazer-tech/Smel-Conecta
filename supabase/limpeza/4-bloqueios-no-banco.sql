-- PASSO 4 — Bloqueio no banco: mesmo NOME COMPLETO + mesma DATA DE NASCIMENTO.
-- (O bloqueio de CPF repetido fica para depois — arquivo 7.)
-- Como usar: copie TUDO deste arquivo, cole no SQL Editor e clique em Run.
-- Resultado esperado: "Success. No rows returned".

CREATE UNIQUE INDEX IF NOT EXISTS alunos_nome_nascimento_unico
  ON alunos ((lower(btrim(nome))), data_nasc)
  WHERE data_nasc IS NOT NULL;
