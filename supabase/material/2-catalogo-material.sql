-- ============================================================================
-- CATÁLOGO DE MODELOS DE MATERIAL (compartilhado entre todos os polos)
-- Cadastra o modelo UMA vez ("Bola de futsal oficial"); depois cada polo só
-- seleciona do catálogo e informa a quantidade. Evita o mesmo item com nomes diferentes.
-- RODE ANTES: o arquivo 1-criar-material.sql.
-- Como usar: copie TUDO, cole no SQL Editor do Supabase e clique em Run.
-- Resultado esperado: "Success. No rows returned". Seguro de rodar mais de uma vez.
--
-- Quem usa: admin e coordenador (professor/estagiário continuam sem acesso).
-- Criar modelo novo: admin e coordenador. Editar/desativar modelo: só admin.
-- ============================================================================

CREATE OR REPLACE FUNCTION material_gestor()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT is_admin() OR get_my_cargo() = 'coordenador'; $$;

CREATE TABLE IF NOT EXISTS material_catalogo (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL CHECK (length(btrim(nome)) > 0),
  categoria  text NOT NULL,
  tipo       text NOT NULL CHECK (tipo IN ('patrimonio', 'consumo')),
  descricao  text,           -- especificação (tamanho, peso, cor, marca...)
  foto_url   text,
  ativo      boolean NOT NULL DEFAULT true,
  criado_por uuid DEFAULT auth.uid(),
  criado_em  timestamptz NOT NULL DEFAULT now()
);

-- o mesmo nome (sem diferença de maiúscula/espaço) não entra duas vezes
CREATE UNIQUE INDEX IF NOT EXISTS material_catalogo_nome_unico
  ON material_catalogo ((lower(btrim(nome))));

ALTER TABLE material_itens
  ADD COLUMN IF NOT EXISTS catalogo_id uuid REFERENCES material_catalogo(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS material_itens_catalogo_idx ON material_itens (catalogo_id);

-- aproveita o que já estiver cadastrado: vira modelo do catálogo
INSERT INTO material_catalogo (nome, categoria, tipo)
SELECT DISTINCT ON (lower(btrim(nome))) btrim(nome), categoria, tipo
FROM material_itens
ORDER BY lower(btrim(nome)), criado_em
ON CONFLICT DO NOTHING;

UPDATE material_itens i
SET catalogo_id = c.id
FROM material_catalogo c
WHERE i.catalogo_id IS NULL AND lower(btrim(c.nome)) = lower(btrim(i.nome));

-- Segurança
ALTER TABLE material_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "material_catalogo: leitura admin e coordenador" ON material_catalogo;
CREATE POLICY "material_catalogo: leitura admin e coordenador"
  ON material_catalogo FOR SELECT USING (material_gestor());

DROP POLICY IF EXISTS "material_catalogo: admin e coordenador criam" ON material_catalogo;
CREATE POLICY "material_catalogo: admin e coordenador criam"
  ON material_catalogo FOR INSERT WITH CHECK (material_gestor());

DROP POLICY IF EXISTS "material_catalogo: so admin edita" ON material_catalogo;
CREATE POLICY "material_catalogo: so admin edita"
  ON material_catalogo FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "material_catalogo: so admin apaga" ON material_catalogo;
CREATE POLICY "material_catalogo: so admin apaga"
  ON material_catalogo FOR DELETE USING (is_admin());
