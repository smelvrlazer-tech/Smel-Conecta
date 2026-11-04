-- PASSO 6 — JUNTAR DE VERDADE as fichas com o mesmo CPF e a mesma data de nascimento (altera o banco!).
-- Só rode depois do ENSAIO (arquivo 5) mostrar "Turmas perdidas: 0" e "Grupos que sobrariam: 0".
-- SÓ rode depois que o ENSAIO (arquivo 2) mostrou:
--   "Turmas que seriam perdidas: 0" e "Grupos que sobrariam: 0",
-- e depois de conferir se existe um backup em Supabase > Database > Backups.
-- Como usar: copie TUDO deste arquivo, cole no SQL Editor e clique em Run.
-- Resultado esperado: uma tabela com "grupos_que_sobraram = 0".
-- Se aparecer erro, NADA foi gravado (o banco desfaz sozinho). Me mande a mensagem.

CREATE EXTENSION IF NOT EXISTS unaccent;

DO $$
DECLARE
  v_confirmar boolean := true;    -- true = vale de verdade (grava)
  v_remover int; v_pessoas int; v_perdidas int; v_sobraram int; v_detalhe text;
BEGIN
  CREATE TEMP TABLE _dup_map ON COMMIT DROP AS
  WITH base AS (
    SELECT a.id, a.data_nasc, a.data_matricula,
           regexp_replace(COALESCE(a.cpf, ''), '\D', '', 'g') AS chave_nome,
           NULLIF(regexp_replace(COALESCE(a.cpf, ''), '\D', '', 'g'), '') AS cpf_num,
           (SELECT count(*) FROM presencas p WHERE p.aluno_id = a.id) AS qtd_presencas
    FROM alunos a
    WHERE a.data_nasc IS NOT NULL AND length(regexp_replace(COALESCE(a.cpf, ''), '\D', '', 'g')) = 11
  ),
  validos AS (
    SELECT chave_nome, data_nasc FROM base
    GROUP BY chave_nome, data_nasc
    HAVING count(*) > 1 AND count(DISTINCT cpf_num) <= 1
  ),
  ranqueado AS (
    SELECT b.id, b.chave_nome, b.data_nasc,
           row_number() OVER (PARTITION BY b.chave_nome, b.data_nasc
                              ORDER BY b.qtd_presencas DESC, b.data_matricula ASC, b.id) AS pos
    FROM base b JOIN validos v ON v.chave_nome = b.chave_nome AND v.data_nasc = b.data_nasc
  )
  SELECT d.id AS duplicado_id, k.id AS principal_id
  FROM ranqueado d
  JOIN ranqueado k ON k.chave_nome = d.chave_nome AND k.data_nasc = d.data_nasc AND k.pos = 1
  WHERE d.pos > 1;

  SELECT count(*), count(DISTINCT principal_id) INTO v_remover, v_pessoas FROM _dup_map;

  -- 1) turmas (modalidades): turma principal e extras do duplicado vão pra ficha que fica
  INSERT INTO aluno_turmas (aluno_id, turma_id)
  SELECT m.principal_id, x.turma_id
  FROM _dup_map m
  JOIN LATERAL (
    SELECT a.turma_id FROM alunos a WHERE a.id = m.duplicado_id AND a.turma_id IS NOT NULL
    UNION
    SELECT at.turma_id FROM aluno_turmas at WHERE at.aluno_id = m.duplicado_id
  ) x ON true
  ON CONFLICT (aluno_id, turma_id) DO NOTHING;

  UPDATE alunos k
  SET turma_id = (SELECT a.turma_id FROM alunos a JOIN _dup_map m ON m.duplicado_id = a.id
                  WHERE m.principal_id = k.id AND a.turma_id IS NOT NULL LIMIT 1)
  WHERE k.turma_id IS NULL AND k.id IN (SELECT principal_id FROM _dup_map);

  -- 2) presenças que não conflitam
  UPDATE presencas p SET aluno_id = m.principal_id
  FROM _dup_map m
  WHERE p.aluno_id = m.duplicado_id
    AND NOT EXISTS (SELECT 1 FROM presencas x
                    WHERE x.aluno_id = m.principal_id AND x.turma_id = p.turma_id AND x.data = p.data);

  -- 3) atestados e justificativas
  UPDATE atestados t SET aluno_id = m.principal_id FROM _dup_map m WHERE t.aluno_id = m.duplicado_id;
  UPDATE justificativas_ausencia j SET aluno_id = m.principal_id FROM _dup_map m WHERE j.aluno_id = m.duplicado_id;

  -- 4) viagens
  UPDATE participantes_viagem v SET aluno_id = m.principal_id
  FROM _dup_map m
  WHERE v.aluno_id = m.duplicado_id
    AND NOT EXISTS (SELECT 1 FROM participantes_viagem x
                    WHERE x.aluno_id = m.principal_id AND x.viagem_id = v.viagem_id);

  -- CONFERÊNCIA: nenhuma turma do duplicado pode ficar de fora da ficha que fica
  SELECT count(*) INTO v_perdidas
  FROM _dup_map m
  JOIN LATERAL (
    SELECT a.turma_id FROM alunos a WHERE a.id = m.duplicado_id AND a.turma_id IS NOT NULL
    UNION
    SELECT at.turma_id FROM aluno_turmas at WHERE at.aluno_id = m.duplicado_id
  ) x ON true
  WHERE NOT EXISTS (SELECT 1 FROM aluno_turmas k WHERE k.aluno_id = m.principal_id AND k.turma_id = x.turma_id)
    AND NOT EXISTS (SELECT 1 FROM alunos kk WHERE kk.id = m.principal_id AND kk.turma_id = x.turma_id);

  IF v_perdidas > 0 THEN
    RAISE EXCEPTION 'ABORTADO: % turma(s) se perderiam. Nada foi alterado. Me avise.', v_perdidas;
  END IF;

  -- detalhe: modalidades/polos finais de cada pessoa
  SELECT string_agg(x.linha, E'\n' ORDER BY x.linha) INTO v_detalhe
  FROM (
    SELECT a.nome || ' (' || a.data_nasc || '): ' ||
           COALESCE(string_agg(DISTINCT mo.nome || ' - ' || COALESCE(po.bairro, po.nome), ', '), 'sem turma') AS linha
    FROM alunos a
    JOIN (SELECT DISTINCT principal_id FROM _dup_map) p ON p.principal_id = a.id
    LEFT JOIN LATERAL (
      SELECT a.turma_id AS tid WHERE a.turma_id IS NOT NULL
      UNION
      SELECT at.turma_id FROM aluno_turmas at WHERE at.aluno_id = a.id
    ) tt ON true
    LEFT JOIN turmas t ON t.id = tt.tid
    LEFT JOIN modalidades mo ON mo.id = t.modalidade_id
    LEFT JOIN polos po ON po.id = t.polo_id
    GROUP BY a.id, a.nome, a.data_nasc
  ) x;

  -- 5) apaga as fichas repetidas (o que sobrou nelas é repetição)
  DELETE FROM alunos WHERE id IN (SELECT duplicado_id FROM _dup_map);

  SELECT count(*) INTO v_sobraram FROM (
    SELECT 1 FROM alunos WHERE data_nasc IS NOT NULL
    GROUP BY regexp_replace(COALESCE(cpf, ''), '\D', '', 'g'), data_nasc
    HAVING count(*) > 1 AND length(regexp_replace(COALESCE(cpf, ''), '\D', '', 'g')) = 11
  ) s;

  IF NOT v_confirmar THEN
    RAISE EXCEPTION E'ENSAIO CONCLUÍDO - NADA FOI ALTERADO.\nFichas repetidas a remover: %\nPessoas afetadas: %\nTurmas que seriam perdidas (deve ser 0): %\nGrupos que sobrariam (deve ser 0): %\n\nComo cada pessoa fica:\n%',
      v_remover, v_pessoas, v_perdidas, v_sobraram, v_detalhe;
  END IF;
END $$;

-- Conferência final (deve mostrar 0)
SELECT count(*) AS grupos_que_sobraram FROM (
  SELECT 1 FROM alunos WHERE data_nasc IS NOT NULL
  GROUP BY regexp_replace(COALESCE(cpf, ''), '\D', '', 'g'), data_nasc
  HAVING count(*) > 1 AND length(regexp_replace(COALESCE(cpf, ''), '\D', '', 'g')) = 11
) s;
