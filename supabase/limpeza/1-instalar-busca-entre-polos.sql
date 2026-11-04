-- PASSO 1 de 4 — Instalar a busca de aluno repetido entre polos.
-- Seguro: só cria uma função nova. Não altera nem apaga nenhum aluno.
-- Como usar: copie TUDO deste arquivo, cole no SQL Editor do Supabase e clique em Run.
-- Resultado esperado: "Success. No rows returned".

CREATE OR REPLACE FUNCTION buscar_aluno_duplicado(p_cpf text, p_nome text, p_data_nasc date)
RETURNS TABLE (id uuid, nome text, cpf text, turma_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.id, a.nome, a.cpf, a.turma_id
  FROM alunos a
  WHERE (
          length(regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g')) = 11
          AND regexp_replace(coalesce(a.cpf, ''), '\D', '', 'g') = regexp_replace(p_cpf, '\D', '', 'g')
        )
     OR (
          p_data_nasc IS NOT NULL AND p_nome IS NOT NULL
          AND a.data_nasc = p_data_nasc
          AND lower(btrim(regexp_replace(a.nome, '\s+', ' ', 'g'))) = lower(btrim(regexp_replace(p_nome, '\s+', ' ', 'g')))
        )
  LIMIT 5;
$$;
REVOKE ALL ON FUNCTION buscar_aluno_duplicado(text, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION buscar_aluno_duplicado(text, text, date) TO authenticated;
