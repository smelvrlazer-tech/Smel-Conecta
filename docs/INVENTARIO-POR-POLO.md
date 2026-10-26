# Inventário de material por polo — especificação (rascunho para aprovação)

## Decisões já tomadas
- Controla **os dois tipos**: patrimônio (item a item, com código) e material de consumo (por quantidade).
- **Quem acessa:** SÓ admin e coordenador. Professor e estagiário **não têm acesso nem visualização**
  (o menu/aba nem aparece para eles e o banco também bloqueia a leitura). Coordenador edita só o polo dele; admin, todos.
- **Realocação:** o admin move direto (escolhe item, polo de destino e quantidade). Sempre fica no histórico.
- **Dados atuais:** não existe lista. Começa do zero, com cadastro rápido e categorias sugeridas.

## Modelo de dados (3 tabelas novas)
1. `material_catalogo` — o "tipo" de coisa: nome, categoria, tipo (`patrimonio` | `consumo`).
   Ex.: "Bola de futsal oficial" (patrimônio), "Cone de treino" (consumo).
2. `material_itens` — o que existe em cada polo:
   `polo_id`, `catalogo_id`, `estado` (bom / precisa de reparo / danificado / baixado),
   `quantidade` (patrimônio = sempre 1), `codigo` (plaqueta, único; só patrimônio), `foto_url`, `observacao`.
   Consumo: uma linha por polo + estado (ex.: Retiro / Cone / bom = 30; Retiro / Cone / danificado = 4).
3. `material_movimentacoes` — histórico imutável: cadastro, ajuste, transferência, baixa
   (`de polo`, `para polo`, `quantidade`, `motivo`, `quem`, `quando`).

Regras: a transferência é feita por uma função do banco (tudo ou nada, só admin), que divide a quantidade
quando se move só parte (ex.: 10 dos 30 cones) e grava o histórico. Nada se apaga: "baixa" muda o estado.

## Segurança (mesmo padrão do resto do sistema)
- Admin: tudo, todos os polos. Coordenador: lê e edita só os polos dele.
- **Professor e estagiário: nenhum acesso** — nem a aba/menu na tela, nem leitura no banco (regra de segurança nega).
- Mover item entre polos: só admin, pela função (não por edição direta).
- Entra na matriz de permissões existente (tela `material`), com Professor e Estagiário bloqueados por padrão.
- A "aba Material" do Detalhe do polo e o item de menu só renderizam para coordenador/admin.

## Telas
- **Detalhe do polo → aba "Material":** resumo (total de itens, em reparo, danificados) + lista por categoria.
  Botão "Adicionar" (cadastro rápido: nome, categoria, quantidade, estado, foto pelo celular). Toque no item = editar.
- **Sem item no menu lateral** (decisão do usuário): o inventário vive só dentro de cada polo.
  Realocar (só admin) e Histórico também ficam dentro do polo: cada item tem o botão **Realocar**
  (destino + quantidade + motivo) e a aba **Histórico** mostra as movimentações daquele polo.
- (Fica para depois, se quiserem: comparativo entre polos dentro da lista de Polos.)
- Visual: simples, uma ação principal por tela, texto mínimo 14 px, claro e escuro.

## Categorias sugeridas (começo do zero)
Bolas · Cones e marcadores · Coletes · Redes e traves · Colchonetes/tatames · Equipamentos de pilates ·
Equipamentos de ginástica · Material de dança/ritmo · Som e microfones · Mobiliário · Primeiros socorros ·
Uniformes · Eletrônicos (projetor, notebook) · Outros.

## Fases
1. **MVP:** tabelas + segurança + aba Material no polo + cadastro/edição + estados + histórico de cadastro.
2. **Realocação:** função de transferência + tela do admin + visão geral comparativa.
3. **Complementos:** relatório PDF por polo, importação por planilha,
   alerta de estoque mínimo, QR/etiqueta de patrimônio. (Acesso de professor/estagiário: fora do escopo por enquanto.)

## Pontos em aberto
- Fotos usam o armazenamento do Supabase (plano gratuito: 1 GB) — comprimir fotos no envio.
- Quem é "coordenador do polo" segue a tabela `atribuicoes` já existente.
- Precisamos de um banco de teste (mesmo projeto Supabase de teste do redesign) para validar antes da produção.
  Em produção, as tabelas novas são criadas por você no SQL Editor, em passos simples como na limpeza de alunos.
