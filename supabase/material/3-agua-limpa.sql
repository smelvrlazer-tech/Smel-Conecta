-- ============================================================================
-- MATERIAL DO POLO ÁGUA LIMPA (piloto do gerador de treino funcional)
-- Cadastra no catálogo e no polo: 10 colchonetes e 10 bastões de PVC.
-- RODE ANTES: 1-criar-material.sql e 2-catalogo-material.sql.
-- Como usar: copie TUDO, cole no SQL Editor do Supabase e clique em Run.
-- Resultado esperado: "Success. No rows returned".
-- Seguro de rodar mais de uma vez (não duplica). Se não achar exatamente 1 polo
-- "Água Limpa", para com uma mensagem e NÃO grava nada.
-- Quadra, arquibancada e escada são estrutura do polo (não material): não entram aqui.
-- ============================================================================

DO $$
DECLARE
  v_polo uuid;
  v_n integer;
BEGIN
  SELECT count(*) INTO v_n FROM polos WHERE nome ILIKE '%gua limpa%' OR bairro ILIKE '%gua limpa%';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Esperava achar 1 polo "Água Limpa" e achei %. Nada foi gravado. Me avise.', v_n;
  END IF;
  SELECT id INTO v_polo FROM polos WHERE nome ILIKE '%gua limpa%' OR bairro ILIKE '%gua limpa%';

  INSERT INTO material_catalogo (nome, categoria, tipo, descricao) VALUES
    ('Colchonete',    'Colchonetes e tatames',     'consumo', NULL),
    ('Bastão de PVC', 'Equipamentos de ginástica', 'consumo', 'Para mobilidade e exercícios com bastão')
  ON CONFLICT DO NOTHING;

  INSERT INTO material_itens (polo_id, catalogo_id, nome, categoria, tipo, estado, quantidade)
  SELECT v_polo, c.id, c.nome, c.categoria, 'consumo', 'bom', 10
  FROM material_catalogo c
  WHERE lower(btrim(c.nome)) IN ('colchonete', 'bastão de pvc')
  ON CONFLICT DO NOTHING;
END $$;
