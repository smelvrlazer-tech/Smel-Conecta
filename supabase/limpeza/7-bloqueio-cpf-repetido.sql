-- PASSO 7 — Bloqueio de CPF repetido, SÓ DAQUI PRA FRENTE.
-- Os 11 CPFs que já estão repetidos hoje NÃO são mexidos (ficam como estão até
-- alguém corrigir). A partir de agora, o banco recusa:
--   * cadastrar um aluno com CPF que já existe em outra ficha;
--   * trocar o CPF de uma ficha para um CPF que já existe em outra ficha.
-- Editar outros dados (nome, telefone, turma...) de uma ficha com CPF repetido
-- antigo continua funcionando normalmente.
-- Como usar: copie TUDO deste arquivo, cole no SQL Editor e clique em Run.
-- Resultado esperado: "Success. No rows returned".

CREATE OR REPLACE FUNCTION alunos_bloqueia_cpf_repetido()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_novo text := NULLIF(regexp_replace(COALESCE(NEW.cpf, ''), '\D', '', 'g'), '');
BEGIN
  IF v_novo IS NULL OR length(v_novo) <> 11 THEN
    RETURN NEW;
  END IF;
  -- em edição, só confere se o CPF mudou
  IF TG_OP = 'UPDATE'
     AND v_novo IS NOT DISTINCT FROM NULLIF(regexp_replace(COALESCE(OLD.cpf, ''), '\D', '', 'g'), '') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM alunos a
    WHERE a.id <> NEW.id
      AND regexp_replace(COALESCE(a.cpf, ''), '\D', '', 'g') = v_novo
  ) THEN
    RAISE EXCEPTION 'CPF já cadastrado em outro aluno' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alunos_cpf_repetido ON alunos;
CREATE TRIGGER trg_alunos_cpf_repetido
  BEFORE INSERT OR UPDATE ON alunos
  FOR EACH ROW EXECUTE FUNCTION alunos_bloqueia_cpf_repetido();
