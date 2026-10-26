-- ============================================================================
-- INVENTÁRIO DE MATERIAL POR POLO — criação das tabelas e regras de segurança
-- Como usar: copie TUDO deste arquivo, cole no SQL Editor do Supabase e clique em Run.
-- Resultado esperado: "Success. No rows returned".
-- Seguro de rodar mais de uma vez (não apaga nada existente).
--
-- QUEM ACESSA: SÓ admin (todos os polos) e coordenador (só o polo dele).
-- Professor e estagiário NÃO têm acesso nenhum (nem leitura) — o banco nega.
-- Realocar entre polos: só admin, pela função transferir_material().
-- Nada é apagado: "baixa" muda o estado. O histórico não pode ser editado nem apagado.
-- ============================================================================

-- ─── 1. Itens de material ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS material_itens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  polo_id       uuid NOT NULL REFERENCES polos(id) ON DELETE RESTRICT,
  nome          text NOT NULL CHECK (length(btrim(nome)) > 0),
  categoria     text NOT NULL,
  tipo          text NOT NULL CHECK (tipo IN ('patrimonio', 'consumo')),
  estado        text NOT NULL DEFAULT 'bom' CHECK (estado IN ('bom', 'reparo', 'danificado', 'baixado')),
  quantidade    integer NOT NULL DEFAULT 1 CHECK (quantidade >= 0),
  codigo        text,
  foto_url      text,
  observacao    text,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  -- patrimônio é sempre 1 unidade
  CONSTRAINT material_patrimonio_unitario CHECK (tipo <> 'patrimonio' OR quantidade = 1)
);

-- código/plaqueta não repete; consumo = uma linha por polo + nome + estado
CREATE UNIQUE INDEX IF NOT EXISTS material_codigo_unico
  ON material_itens ((lower(btrim(codigo)))) WHERE codigo IS NOT NULL AND btrim(codigo) <> '';
CREATE UNIQUE INDEX IF NOT EXISTS material_consumo_unico
  ON material_itens (polo_id, (lower(btrim(nome))), estado) WHERE tipo = 'consumo';
CREATE INDEX IF NOT EXISTS material_itens_polo_idx ON material_itens (polo_id);

-- ─── 2. Histórico (imutável: ninguém edita nem apaga) ───────────────────────
CREATE TABLE IF NOT EXISTS material_movimentacoes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      uuid REFERENCES material_itens(id) ON DELETE SET NULL,
  polo_origem  uuid REFERENCES polos(id) ON DELETE SET NULL,
  polo_destino uuid REFERENCES polos(id) ON DELETE SET NULL,
  tipo         text NOT NULL CHECK (tipo IN ('cadastro', 'ajuste', 'estado', 'transferencia')),
  nome         text NOT NULL,
  quantidade   integer,
  detalhe      text,
  motivo       text,
  feito_por    uuid DEFAULT auth.uid(),
  feito_em     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS material_mov_data_idx ON material_movimentacoes (feito_em DESC);

-- ─── 3. Quem pode mexer num polo ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION material_pode_editar(p_polo uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT is_admin()
      OR (get_my_cargo() = 'coordenador' AND p_polo = ANY (my_polo_ids()));
$$;

-- ─── 4. Segurança (RLS) ─────────────────────────────────────────────────────
ALTER TABLE material_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "material_itens: admin e coordenador do polo" ON material_itens;
CREATE POLICY "material_itens: admin e coordenador do polo"
  ON material_itens FOR ALL
  USING (material_pode_editar(polo_id))
  WITH CHECK (material_pode_editar(polo_id));
-- (sem política de DELETE específica: FOR ALL acima permite, mas o app nunca apaga;
--  a remoção prática é "baixar" o item)

DROP POLICY IF EXISTS "material_mov: leitura admin e coordenador" ON material_movimentacoes;
CREATE POLICY "material_mov: leitura admin e coordenador"
  ON material_movimentacoes FOR SELECT
  USING (
    (polo_origem IS NOT NULL AND material_pode_editar(polo_origem))
    OR (polo_destino IS NOT NULL AND material_pode_editar(polo_destino))
  );
-- sem política de INSERT/UPDATE/DELETE: só os gatilhos/funções abaixo (que rodam com
-- permissão do sistema) gravam; ninguém altera o histórico pela tela.

-- ─── 5. Gatilhos: carimbo de atualização e histórico automático ─────────────
CREATE OR REPLACE FUNCTION material_antes_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_material_antes_update ON material_itens;
CREATE TRIGGER trg_material_antes_update
  BEFORE UPDATE ON material_itens
  FOR EACH ROW EXECUTE FUNCTION material_antes_update();

CREATE OR REPLACE FUNCTION material_log()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_det text;
BEGIN
  -- as funções de realocar/alterar estado gravam o próprio histórico
  IF current_setting('app.sem_log', true) = '1' THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO material_movimentacoes (item_id, polo_destino, tipo, nome, quantidade, detalhe)
    VALUES (NEW.id, NEW.polo_id, 'cadastro', NEW.nome, NEW.quantidade, 'Estado: ' || NEW.estado);
  ELSE
    v_det := concat_ws('; ',
      CASE WHEN NEW.quantidade <> OLD.quantidade THEN 'quantidade ' || OLD.quantidade || ' → ' || NEW.quantidade END,
      CASE WHEN NEW.estado <> OLD.estado THEN 'estado ' || OLD.estado || ' → ' || NEW.estado END,
      CASE WHEN NEW.nome <> OLD.nome THEN 'nome "' || OLD.nome || '" → "' || NEW.nome || '"' END,
      CASE WHEN NEW.polo_id <> OLD.polo_id THEN 'mudou de polo' END);
    IF v_det <> '' THEN
      INSERT INTO material_movimentacoes (item_id, polo_origem, polo_destino, tipo, nome, quantidade, detalhe)
      VALUES (NEW.id, OLD.polo_id, NEW.polo_id,
              CASE WHEN NEW.polo_id <> OLD.polo_id THEN 'transferencia' ELSE 'ajuste' END,
              NEW.nome, NEW.quantidade, v_det);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_material_log ON material_itens;
CREATE TRIGGER trg_material_log
  AFTER INSERT OR UPDATE ON material_itens
  FOR EACH ROW EXECUTE FUNCTION material_log();

-- ─── 6. Realocar entre polos (SÓ ADMIN) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION transferir_material(p_item uuid, p_destino uuid, p_qtd integer, p_motivo text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  i material_itens%ROWTYPE;
  v_dest uuid;
  q integer;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Somente o administrador pode realocar material' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO i FROM material_itens WHERE id = p_item FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado'; END IF;
  IF i.polo_id = p_destino THEN RAISE EXCEPTION 'O polo de destino é o mesmo de origem'; END IF;
  IF NOT EXISTS (SELECT 1 FROM polos WHERE id = p_destino) THEN RAISE EXCEPTION 'Polo de destino não existe'; END IF;
  IF i.estado = 'baixado' THEN RAISE EXCEPTION 'Item baixado não pode ser realocado'; END IF;

  q := CASE WHEN i.tipo = 'patrimonio' THEN 1 ELSE COALESCE(p_qtd, i.quantidade) END;
  IF q < 1 OR q > i.quantidade THEN RAISE EXCEPTION 'Quantidade inválida (disponível: %)', i.quantidade; END IF;

  PERFORM set_config('app.sem_log', '1', true);

  IF i.tipo = 'consumo' THEN
    SELECT id INTO v_dest FROM material_itens
     WHERE polo_id = p_destino AND tipo = 'consumo' AND estado = i.estado
       AND lower(btrim(nome)) = lower(btrim(i.nome))
     FOR UPDATE;
  END IF;

  IF q = i.quantidade THEN
    IF v_dest IS NOT NULL THEN
      UPDATE material_itens SET quantidade = quantidade + q WHERE id = v_dest;
      DELETE FROM material_itens WHERE id = i.id;
    ELSE
      UPDATE material_itens SET polo_id = p_destino WHERE id = i.id;
    END IF;
  ELSE
    UPDATE material_itens SET quantidade = quantidade - q WHERE id = i.id;
    IF v_dest IS NOT NULL THEN
      UPDATE material_itens SET quantidade = quantidade + q WHERE id = v_dest;
    ELSE
      INSERT INTO material_itens (polo_id, nome, categoria, tipo, estado, quantidade, foto_url, observacao)
      VALUES (p_destino, i.nome, i.categoria, 'consumo', i.estado, q, i.foto_url, i.observacao);
    END IF;
  END IF;

  INSERT INTO material_movimentacoes (item_id, polo_origem, polo_destino, tipo, nome, quantidade, motivo)
  VALUES (i.id, i.polo_id, p_destino, 'transferencia', i.nome, q, NULLIF(btrim(p_motivo), ''));

  PERFORM set_config('app.sem_log', '0', true);
END $$;

REVOKE ALL ON FUNCTION transferir_material(uuid, uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transferir_material(uuid, uuid, integer, text) TO authenticated;

-- ─── 7. Mudar o estado de um item (admin ou coordenador do polo) ────────────
-- Em material de consumo permite mudar o estado de SÓ PARTE da quantidade
-- (ex.: 4 dos 30 cones ficaram danificados).
CREATE OR REPLACE FUNCTION alterar_estado_material(p_item uuid, p_estado text, p_qtd integer, p_motivo text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  i material_itens%ROWTYPE;
  v_dest uuid;
  q integer;
BEGIN
  IF p_estado NOT IN ('bom', 'reparo', 'danificado', 'baixado') THEN
    RAISE EXCEPTION 'Estado inválido';
  END IF;

  SELECT * INTO i FROM material_itens WHERE id = p_item FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado'; END IF;
  IF NOT material_pode_editar(i.polo_id) THEN
    RAISE EXCEPTION 'Sem permissão para este polo' USING ERRCODE = '42501';
  END IF;
  IF i.estado = p_estado THEN RAISE EXCEPTION 'O item já está nesse estado'; END IF;

  q := CASE WHEN i.tipo = 'patrimonio' THEN 1 ELSE COALESCE(p_qtd, i.quantidade) END;
  IF q < 1 OR q > i.quantidade THEN RAISE EXCEPTION 'Quantidade inválida (disponível: %)', i.quantidade; END IF;

  PERFORM set_config('app.sem_log', '1', true);

  IF i.tipo = 'patrimonio' THEN
    UPDATE material_itens SET estado = p_estado WHERE id = i.id;
  ELSE
    SELECT id INTO v_dest FROM material_itens
     WHERE polo_id = i.polo_id AND tipo = 'consumo' AND estado = p_estado
       AND lower(btrim(nome)) = lower(btrim(i.nome))
     FOR UPDATE;
    IF q = i.quantidade THEN
      IF v_dest IS NOT NULL THEN
        UPDATE material_itens SET quantidade = quantidade + q WHERE id = v_dest;
        DELETE FROM material_itens WHERE id = i.id;
      ELSE
        UPDATE material_itens SET estado = p_estado WHERE id = i.id;
      END IF;
    ELSE
      UPDATE material_itens SET quantidade = quantidade - q WHERE id = i.id;
      IF v_dest IS NOT NULL THEN
        UPDATE material_itens SET quantidade = quantidade + q WHERE id = v_dest;
      ELSE
        INSERT INTO material_itens (polo_id, nome, categoria, tipo, estado, quantidade, foto_url, observacao)
        VALUES (i.polo_id, i.nome, i.categoria, 'consumo', p_estado, q, i.foto_url, i.observacao);
      END IF;
    END IF;
  END IF;

  INSERT INTO material_movimentacoes (item_id, polo_origem, polo_destino, tipo, nome, quantidade, detalhe, motivo)
  VALUES (i.id, i.polo_id, i.polo_id, 'estado', i.nome, q, i.estado || ' → ' || p_estado, NULLIF(btrim(p_motivo), ''));

  PERFORM set_config('app.sem_log', '0', true);
END $$;

REVOKE ALL ON FUNCTION alterar_estado_material(uuid, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION alterar_estado_material(uuid, text, integer, text) TO authenticated;

-- ─── 8. Fotos do material (pasta pública, só admin/coordenador enviam) ──────
INSERT INTO storage.buckets (id, name, public)
VALUES ('material', 'material', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "material_fotos: admin e coordenador enviam" ON storage.objects;
CREATE POLICY "material_fotos: admin e coordenador enviam"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'material' AND (is_admin() OR get_my_cargo() = 'coordenador'));
