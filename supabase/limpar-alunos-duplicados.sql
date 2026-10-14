-- supabase/limpar-alunos-duplicados.sql
-- Rodar no Supabase Dashboard > SQL Editor, logado como dono do projeto.
--
-- CONTEXTO: o cadastro de aluno podia gravar a mesma pessoa duas vezes (duplo
-- toque em "Salvar" enquanto a busca de CPF ainda rodava). O código já foi
-- corrigido; este script limpa o que ficou.
--
-- COMO USAR (nesta ordem, um bloco de cada vez):
--   PASSO 1 — só lista (não altera nada). Confira se os grupos são mesmo a
--             mesma pessoa.
--   PASSO 2 — junta cada grupo numa ficha só. Vem com ROLLBACK no fim (ensaio):
--             mostra o que faria e desfaz. Só troque ROLLBACK por COMMIT depois
--             de conferir o resultado do ensaio.
--
-- REGRA DE DUPLICATA (conservadora, pra nunca juntar duas pessoas diferentes):
--   mesmo nome (sem diferença de maiúscula/espaço/acento) E mesma data de
--   nascimento preenchida E sem CPFs diferentes. Aluno sem data de nascimento
--   NUNCA é juntado automaticamente — esses ficam só no PASSO 1B, pra conferir
--   na mão.
-- FICHA QUE FICA: a que tem mais presenças; empate -> a mais antiga.
-- O QUE É JUNTADO: turmas (aluno_turmas), presenças, atestados, justificativas
--   e viagens. Presença do mesmo aluno/turma/dia que já exista na ficha
--   principal é mantida e a repetida some.

-- ============================================================================
-- PASSO 1A — LISTA os grupos de duplicatas (somente leitura)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS unaccent;

WITH base AS (
  SELECT a.id, a.nome, a.data_nasc, a.cpf, a.turma_id, a.status, a.data_matricula,
         lower(btrim(unaccent(a.nome))) AS chave_nome,
         NULLIF(regexp_replace(COALESCE(a.cpf, ''), '\D', '', 'g'), '') AS cpf_num,
         (SELECT count(*) FROM presencas p WHERE p.aluno_id = a.id) AS qtd_presencas
  FROM alunos a
),
grupos AS (
  SELECT chave_nome, data_nasc
  FROM base
  WHERE data_nasc IS NOT NULL
  GROUP BY chave_nome, data_nasc
  HAVING count(*) > 1 AND count(DISTINCT cpf_num) <= 1
)
SELECT b.nome, b.data_nasc, b.id, b.cpf, b.status, b.data_matricula,
       t.faixa AS turma_principal, b.qtd_presencas
FROM base b
JOIN grupos g ON g.chave_nome = b.chave_nome AND g.data_nasc = b.data_nasc
LEFT JOIN turmas t ON t.id = b.turma_id
ORDER BY b.chave_nome, b.data_nasc, b.qtd_presencas DESC, b.data_matricula;

-- ============================================================================
-- PASSO 1B — nomes repetidos SEM data de nascimento (só pra você conferir; o
-- script NÃO junta esses sozinho)
-- ============================================================================
SELECT lower(btrim(unaccent(nome))) AS nome_normalizado, count(*) AS fichas,
       array_agg(id) AS ids
FROM alunos
WHERE data_nasc IS NULL
GROUP BY 1
HAVING count(*) > 1
ORDER BY fichas DESC, 1;

-- ============================================================================
-- PASSO 2 — JUNTA as duplicatas do PASSO 1A (ensaio com ROLLBACK no final)
-- ============================================================================
BEGIN;

CREATE TEMP TABLE _dup_map ON COMMIT DROP AS
WITH base AS (
  SELECT a.id, a.data_nasc, a.data_matricula,
         lower(btrim(unaccent(a.nome))) AS chave_nome,
         NULLIF(regexp_replace(COALESCE(a.cpf, ''), '\D', '', 'g'), '') AS cpf_num,
         (SELECT count(*) FROM presencas p WHERE p.aluno_id = a.id) AS qtd_presencas
  FROM alunos a
  WHERE a.data_nasc IS NOT NULL
),
validos AS (
  SELECT chave_nome, data_nasc
  FROM base
  GROUP BY chave_nome, data_nasc
  HAVING count(*) > 1 AND count(DISTINCT cpf_num) <= 1
),
ranqueado AS (
  SELECT b.id, b.chave_nome, b.data_nasc,
         row_number() OVER (
           PARTITION BY b.chave_nome, b.data_nasc
           ORDER BY b.qtd_presencas DESC, b.data_matricula ASC, b.id
         ) AS pos
  FROM base b
  JOIN validos v ON v.chave_nome = b.chave_nome AND v.data_nasc = b.data_nasc
)
SELECT d.id AS duplicado_id, k.id AS principal_id
FROM ranqueado d
JOIN ranqueado k ON k.chave_nome = d.chave_nome AND k.data_nasc = d.data_nasc AND k.pos = 1
WHERE d.pos > 1;

-- resumo do que será feito
SELECT count(*) AS fichas_a_remover, count(DISTINCT principal_id) AS pessoas_afetadas
FROM _dup_map;

-- 1) turmas: a turma principal e as extras do duplicado passam pra ficha principal
INSERT INTO aluno_turmas (aluno_id, turma_id)
SELECT m.principal_id, x.turma_id
FROM _dup_map m
JOIN LATERAL (
  SELECT a.turma_id FROM alunos a WHERE a.id = m.duplicado_id AND a.turma_id IS NOT NULL
  UNION
  SELECT at.turma_id FROM aluno_turmas at WHERE at.aluno_id = m.duplicado_id
) x ON true
ON CONFLICT (aluno_id, turma_id) DO NOTHING;

-- se a ficha principal está sem turma principal, herda a do duplicado
UPDATE alunos k
SET turma_id = (SELECT a.turma_id FROM alunos a JOIN _dup_map m ON m.duplicado_id = a.id
                WHERE m.principal_id = k.id AND a.turma_id IS NOT NULL LIMIT 1)
WHERE k.turma_id IS NULL AND k.id IN (SELECT principal_id FROM _dup_map);

-- 2) presenças: move as que não conflitam (mesma turma/dia já registrada na principal)
UPDATE presencas p
SET aluno_id = m.principal_id
FROM _dup_map m
WHERE p.aluno_id = m.duplicado_id
  AND NOT EXISTS (
    SELECT 1 FROM presencas x
    WHERE x.aluno_id = m.principal_id AND x.turma_id = p.turma_id AND x.data = p.data
  );

-- 3) atestados e justificativas: passam pra ficha principal
UPDATE atestados t SET aluno_id = m.principal_id
FROM _dup_map m WHERE t.aluno_id = m.duplicado_id;

UPDATE justificativas_ausencia j SET aluno_id = m.principal_id
FROM _dup_map m WHERE j.aluno_id = m.duplicado_id;

-- 4) viagens: move quem não está na viagem pela ficha principal
UPDATE participantes_viagem v SET aluno_id = m.principal_id
FROM _dup_map m
WHERE v.aluno_id = m.duplicado_id
  AND NOT EXISTS (
    SELECT 1 FROM participantes_viagem x
    WHERE x.aluno_id = m.principal_id AND x.viagem_id = v.viagem_id
  );

-- CONFERÊNCIA ANTES DE APAGAR: nenhuma turma/modalidade do duplicado pode ficar
-- de fora da ficha principal. O resultado tem que ser 0.
SELECT count(*) AS turmas_que_seriam_perdidas
FROM _dup_map m
JOIN LATERAL (
  SELECT a.turma_id FROM alunos a WHERE a.id = m.duplicado_id AND a.turma_id IS NOT NULL
  UNION
  SELECT at.turma_id FROM aluno_turmas at WHERE at.aluno_id = m.duplicado_id
) x ON true
WHERE NOT EXISTS (SELECT 1 FROM aluno_turmas k WHERE k.aluno_id = m.principal_id AND k.turma_id = x.turma_id)
  AND NOT EXISTS (SELECT 1 FROM alunos kk WHERE kk.id = m.principal_id AND kk.turma_id = x.turma_id);

-- Como cada ficha principal fica (modalidades e polos que ela passa a ter)
SELECT a.nome, a.data_nasc,
       string_agg(DISTINCT mo.nome || ' - ' || COALESCE(po.bairro, po.nome), ', ') AS modalidades_apos_juntar
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
ORDER BY a.nome;

-- 5) remove as fichas duplicadas (o que sobrou nelas é repetido e vai junto)
DELETE FROM alunos WHERE id IN (SELECT duplicado_id FROM _dup_map);

-- conferência: não deve sobrar nenhum grupo
SELECT count(*) AS grupos_que_sobraram FROM (
  SELECT 1 FROM alunos WHERE data_nasc IS NOT NULL
  GROUP BY lower(btrim(unaccent(nome))), data_nasc HAVING count(*) > 1
) s;

ROLLBACK;   -- ENSAIO: desfaz tudo. Depois de conferir, troque por COMMIT e rode de novo.

-- ============================================================================
-- PASSO 3 — BLOQUEIO NO BANCO (rodar SÓ DEPOIS do COMMIT do passo 2)
-- Garante que, mesmo com bug de tela, duplo toque ou duas pessoas cadastrando
-- ao mesmo tempo, o banco recusa a ficha repetida. O app já mostra uma
-- mensagem amigável quando isso acontece.
-- Se der erro "could not create unique index", ainda sobraram duplicatas:
-- rode o PASSO 1A/1B de novo e resolva na mão.
-- ============================================================================
-- Mesmo CPF (só números, 11 dígitos) = mesma pessoa
CREATE UNIQUE INDEX IF NOT EXISTS alunos_cpf_unico
  ON alunos ((regexp_replace(cpf, '\D', '', 'g')))
  WHERE cpf IS NOT NULL AND length(regexp_replace(cpf, '\D', '', 'g')) = 11;

-- Mesmo nome completo + mesma data de nascimento = mesma pessoa
CREATE UNIQUE INDEX IF NOT EXISTS alunos_nome_nascimento_unico
  ON alunos ((lower(btrim(nome))), data_nasc)
  WHERE data_nasc IS NOT NULL;

-- ============================================================================
-- PASSO 0 — BUSCA DE ALUNO REPETIDO ENTRE POLOS (rodar ANTES de tudo; é seguro)
-- A mesma aluna pode estar em mais de um polo: ela tem UM cadastro e várias
-- turmas (aluno_turmas), cada turma de um polo. Mas a regra de segurança só
-- deixa o professor ver alunos do próprio polo, então a tela não achava a aluna
-- já cadastrada em outro polo e criava ficha nova. Esta função devolve só o
-- aluno repetido (mesmo CPF, ou mesmo nome + data de nascimento) sem abrir a
-- lista de alunos de outros polos. Ao matricular, a aluna passa a aparecer no
-- polo novo normalmente.
-- ============================================================================
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
