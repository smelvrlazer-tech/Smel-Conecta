// src/components/treino/Prontos.jsx
// Aba "Prontos": só a lista de treinos já feitos — os SEUS treinos salvos e os modelos.
// Sem setup de gerar treino aqui. Busca + 3 filtros compactos; cartões enxutos.
import { useState, useMemo } from 'react'
import { Search, Trash2, FolderOpen } from 'lucide-react'
import Sheet from '../ui/Sheet'
import ConfirmDialog from '../ui/ConfirmDialog'
import { MODELOS } from '../../lib/treino/modelos'
import { RECURSOS } from '../../lib/treino/exercicios'
import { FORMATOS, FOCOS } from '../../lib/treino/gerador'
import { inputCls, btnPrimary, btnGhost, card, btnCardPrimary, btnCardIcon, Opcoes, Rotulo, norm, dataBr, ORG_ROTULO, principalDe } from './ui'

const ORG_FILTRO = { individual: 'Individual', duplas: 'Coletivo · Duplas', trios: 'Coletivo · Trios' }

export default function Prontos({
  salvos, carregando, semTabela, erro, turmaNome, ocultos, recursos,
  onAbrirSalvo, onApagarSalvo, onUsarModelo, onApagarModelos, onRestaurarModelo, onVoltar,
}) {
  const [busca, setBusca] = useState('')
  const [fFormato, setFFormato] = useState('todos')
  const [fOrg, setFOrg] = useState('todos')
  const [fFoco, setFFoco] = useState('todos')
  const [verApagados, setVerApagados] = useState(false)
  const [apagando, setApagando] = useState(null)        // { tipo: 'salvo'|'modelo'|'faltam', item }
  const [usando, setUsando] = useState(null)            // modelo que vai abrir (pergunta nível e alunos)
  const [nivel, setNivel] = useState(null)
  const [alunos, setAlunos] = useState(null)

  const faltaMaterial = (m) => m.recursos.filter(r => !recursos.includes(r) && !(m.trocas ?? []).some(t => t.precisa === r))

  const todos = useMemo(() => {
    const dosSalvos = salvos.map(sv => {
      const c = sv.conteudo?.config ?? {}
      return {
        tipo: 'salvo', id: sv.id, titulo: sv.titulo, formato: c.formato, org: c.organizacao ?? 'individual',
        focos: [c.foco].filter(Boolean), n: principalDe(sv.conteudo)?.itens.length ?? 0, data: sv.data_aula,
        turma: turmaNome(sv.turma_id), raw: sv,
      }
    })
    const dosModelos = MODELOS.map(m => ({
      tipo: 'modelo', id: m.id, titulo: m.dia ? `Dia ${m.dia} · ${m.nome}` : m.nome, formato: m.formato, org: m.org,
      focos: m.focos, n: m.principal.itens.length, raw: m, oculto: ocultos.includes(m.id), falta: faltaMaterial(m),
    }))
    return [...dosSalvos, ...dosModelos]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salvos, ocultos, recursos, turmaNome])

  const passa = (it, f = {}) => {
    const fo = f.formato ?? fFormato, or = f.org ?? fOrg, fc = f.foco ?? fFoco
    return (fo === 'todos' || it.formato === fo) && (or === 'todos' || it.org === or) && (fc === 'todos' || it.focos.includes(fc))
      && (!busca.trim() || norm(it.titulo).includes(norm(busca)))
  }
  const visiveis = todos.filter(it => !it.oculto)
  const lista = visiveis.filter(it => passa(it))
  const meus = lista.filter(it => it.tipo === 'salvo')
  const modelos = lista.filter(it => it.tipo === 'modelo')
  const apagados = todos.filter(it => it.oculto)
  const semMaterial = visiveis.filter(it => it.tipo === 'modelo' && it.falta.length > 0)
  const formatosUsados = [...new Set(todos.map(it => it.formato))].filter(f => FORMATOS[f])
  const n = (campo, valor) => visiveis.filter(it => passa(it, { [campo]: valor })).length
  const filtrando = fFormato !== 'todos' || fOrg !== 'todos' || fFoco !== 'todos' || busca.trim()
  const limpar = () => { setFFormato('todos'); setFOrg('todos'); setFFoco('todos'); setBusca('') }

  function abrirUsar(m) { setNivel(null); setAlunos(null); setUsando(m) }

  const Cartao = ({ it }) => {
    const sub = [FORMATOS[it.formato]?.label, it.focos.map(f => FOCOS[f]?.label).filter(Boolean).join(' + '), ORG_ROTULO[it.org]].filter(Boolean).join(' · ')
    return (
      <li className={`${card} p-4 flex flex-col gap-3`}>
        <div className="min-w-0">
          <div className="text-base font-bold text-navy-900 dark:text-white leading-snug break-words">{it.titulo}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>
          <div className="text-sm text-slate-400 mt-0.5">
            {it.tipo === 'salvo' ? `${dataBr(it.data)}${it.turma ? ` · ${it.turma}` : ''}` : `${it.n} exercícios`}
          </div>
          {it.tipo === 'modelo' && it.falta.length > 0 && !verApagados && (
            <div className="text-sm text-amber-700 dark:text-amber-300 mt-1">⚠ Precisa de: {it.falta.map(r => RECURSOS[r] ?? r).join(', ')}</div>
          )}
        </div>
        {verApagados ? (
          <button onClick={() => onRestaurarModelo(it.id)} className={`${btnGhost} h-11 text-sm`}>Restaurar</button>
        ) : (
          <div className="grid grid-cols-[1fr_auto] gap-2 mt-auto">
            <button onClick={() => (it.tipo === 'salvo' ? onAbrirSalvo(it.raw) : abrirUsar(it.raw))} className={btnCardPrimary}>
              <FolderOpen size={16} /> Abrir
            </button>
            <button onClick={() => setApagando({ tipo: it.tipo, item: it })} aria-label={`Apagar ${it.titulo}`} className={btnCardIcon}><Trash2 size={18} /></button>
          </div>
        )}
      </li>
    )
  }

  const Secao = ({ titulo, itens, vazio }) => (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h3 className="text-base font-bold text-navy-900 dark:text-white">{titulo}</h3>
        <span className="text-sm text-slate-400">{itens.length}</span>
      </div>
      {itens.length ? <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{itens.map(it => <Cartao key={`${it.tipo}-${it.id}`} it={it} />)}</ul>
        : vazio ? <div className={`${card} p-6 text-center text-sm text-slate-500 dark:text-slate-400`}>{vazio}</div> : null}
    </section>
  )

  return (
    <div className="space-y-5">
      {onVoltar && <button onClick={onVoltar} className={`${btnGhost} w-full sm:w-auto`}>← Voltar ao treino que está na tela</button>}

      {/* Nível 1: título + busca + filtros */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-navy-900 dark:text-white">{verApagados ? 'Treinos apagados' : 'Treinos prontos'}</h2>
        {verApagados ? (
          <button onClick={() => setVerApagados(false)} className={btnGhost}>← Voltar à lista</button>
        ) : (
          <>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar treino…" className={`${inputCls} w-full pl-11`} />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <select value={fFormato} onChange={e => setFFormato(e.target.value)} aria-label="Formato do treino" className={`${inputCls} h-11 text-sm`}>
                <option value="todos">Formato: todos</option>
                {formatosUsados.map(f => <option key={f} value={f}>{FORMATOS[f].label} ({n('formato', f)})</option>)}
              </select>
              <select value={fOrg} onChange={e => setFOrg(e.target.value)} aria-label="Como os alunos fazem" className={`${inputCls} h-11 text-sm`}>
                <option value="todos">Como fazem: todos</option>
                {Object.entries(ORG_FILTRO).map(([k, v]) => <option key={k} value={k}>{v} ({n('org', k)})</option>)}
              </select>
              <select value={fFoco} onChange={e => setFFoco(e.target.value)} aria-label="Foco" className={`${inputCls} h-11 text-sm`}>
                <option value="todos">Foco: todos</option>
                {Object.entries(FOCOS).map(([k, v]) => <option key={k} value={k}>{v.label} ({n('foco', k)})</option>)}
              </select>
            </div>
            {filtrando && <button onClick={limpar} className="text-sm font-semibold text-primary-600 dark:text-primary-400 underline">Limpar filtros</button>}
          </>
        )}
      </div>

      {erro && <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 text-sm">{erro}</div>}

      {verApagados ? (
        <Secao titulo="Apagados" itens={apagados} vazio="Nenhum treino apagado." />
      ) : (
        <>
          {/* Nível 2: meus treinos salvos */}
          {semTabela ? (
            <div className={`${card} p-5 text-sm text-slate-500 dark:text-slate-400`}>
              Para ver aqui os treinos que você salva, rode o arquivo <b>1-criar-treinos-salvos.sql</b> (pasta supabase\treino) no Supabase.
            </div>
          ) : carregando && !salvos.length ? (
            <div className="text-sm text-slate-400">Carregando seus treinos…</div>
          ) : (
            (salvos.length > 0 || !filtrando) && <Secao titulo="Meus treinos salvos" itens={meus}
              vazio={salvos.length ? 'Nenhum treino salvo com esses filtros.' : 'Você ainda não salvou nenhum treino. Gere um e toque em "Salvar treino".'} />
          )}

          {/* Nível 3: modelos */}
          <Secao titulo="Modelos prontos" itens={modelos} vazio="Nenhum modelo com esses filtros." />

          {/* Nível 4: ações raras, discretas */}
          {(semMaterial.length > 0 || apagados.length > 0) && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-sm">
              {semMaterial.length > 0 && (
                <button onClick={() => setApagando({ tipo: 'faltam' })} className="text-slate-500 dark:text-slate-400 underline">
                  Ocultar {semMaterial.length} modelos que precisam de material que o polo não tem
                </button>
              )}
              {apagados.length > 0 && (
                <button onClick={() => setVerApagados(true)} className="text-slate-500 dark:text-slate-400 underline">Ver apagados ({apagados.length})</button>
              )}
            </div>
          )}
        </>
      )}

      {/* Antes de abrir um modelo: nível e alunos (sempre marcar) */}
      <Sheet open={!!usando} onClose={() => setUsando(null)} title="Antes de abrir" subtitle={usando ? (usando.dia ? `Dia ${usando.dia} · ${usando.nome}` : usando.nome) : ''}
        footer={<>
          <button onClick={() => setUsando(null)} className={btnGhost}>Cancelar</button>
          <button disabled={!nivel || !alunos} onClick={() => { const m = usando; setUsando(null); onUsarModelo(m, nivel, alunos) }} className={btnPrimary}>Abrir treino</button>
        </>}>
        <div className="space-y-5">
          <div><Rotulo>Nível da turma</Rotulo><Opcoes valor={nivel} onChange={setNivel} opcoes={[['i', 'Intermediário'], ['a', 'Avançado']]} /></div>
          <div><Rotulo>Quantos alunos hoje</Rotulo><Opcoes valor={alunos} onChange={setAlunos} opcoes={[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(x => [x, String(x)])} /></div>
        </div>
      </Sheet>

      <ConfirmDialog open={!!apagando} onClose={() => setApagando(null)} confirmLabel={apagando?.tipo === 'salvo' ? 'Excluir' : 'Apagar'}
        title={apagando?.tipo === 'faltam' ? 'Ocultar modelos sem material?' : apagando?.tipo === 'salvo' ? `Excluir "${apagando?.item?.titulo}"?` : `Apagar "${apagando?.item?.titulo}"?`}
        description={apagando?.tipo === 'faltam'
          ? `${semMaterial.length} modelos saem da lista. Dá para restaurar em "Ver apagados".`
          : apagando?.tipo === 'salvo'
            ? 'O treino salvo é excluído e não dá para recuperar.'
            : 'O modelo sai da lista deste polo. Dá para restaurar em "Ver apagados".'}
        onConfirm={() => {
          if (apagando.tipo === 'faltam') onApagarModelos(semMaterial.map(x => x.id))
          else if (apagando.tipo === 'salvo') onApagarSalvo(apagando.item.raw)
          else onApagarModelos([apagando.item.id])
        }} />
    </div>
  )
}
