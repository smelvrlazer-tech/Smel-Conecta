// src/components/TreinoPolo.jsx
// Aba "Treinos" do polo — gerador de treino funcional (piloto: Água Limpa, só admin).
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Shuffle, Copy, Repeat2, Trash2, Save, FolderOpen, Search, Undo2, Eraser } from 'lucide-react'
import Sheet from './ui/Sheet'
import { supabase } from '../lib/supabase'
import { localIso } from '../lib/semana'
import ConfirmDialog from './ui/ConfirmDialog'
import { useToast } from './ui/Toast'
import { RECURSOS, RECURSOS_AGUA_LIMPA } from '../lib/treino/exercicios'
import { MODELOS, TIPOS_MODELO } from '../lib/treino/modelos'
import {
  FORMATOS, FOCOS, ORGANIZACOES, gerarTreino, textoWhatsApp, alternativasPara, trocarItem, resolverAutomatico,
} from '../lib/treino/gerador'

const inputCls = 'h-12 px-4 rounded-xl border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-700 text-base text-navy-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500'
const btn = 'h-12 px-5 rounded-xl text-base font-semibold transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2'
const btnPrimary = `${btn} bg-primary-500 text-primary-950 hover:bg-primary-400`
const btnGhost = `${btn} border border-slate-200 dark:border-navy-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-700`
const card = 'bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-2xl'

function Opcoes({ valor, onChange, opcoes }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map(([k, rot]) => (
        <button key={k} type="button" onClick={() => onChange(k)}
          className={`h-11 px-4 rounded-xl text-sm font-semibold border ${valor === k
            ? 'bg-primary-500 text-primary-950 border-transparent'
            : 'border-slate-200 dark:border-navy-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-700'}`}>{rot}</button>
      ))}
    </div>
  )
}
const Rotulo = ({ children }) => <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{children}</div>

const CHAVE = (poloId) => `smel_treino_${poloId}`

function Volume({ valor, onSalvar }) {
  const [editando, setEditando] = useState(false)
  const [txt, setTxt] = useState('')
  const cancelou = useRef(false)
  if (!editando) {
    return (
      <button type="button" onClick={() => { cancelou.current = false; setTxt(valor ?? ''); setEditando(true) }}
        aria-label="Mudar o volume deste exercício"
        className={`inline-flex items-center h-9 px-3 rounded-full text-sm font-semibold border ${valor
          ? 'border-slate-200 dark:border-navy-600 text-navy-900 dark:text-white bg-slate-50 dark:bg-navy-700'
          : 'border-dashed border-slate-300 dark:border-navy-500 text-slate-400'}`}>
        {valor || '+ volume'}
      </button>
    )
  }
  return (
    <input autoFocus value={txt} onChange={e => setTxt(e.target.value)} placeholder="ex.: 15 reps, 40s, 3x12"
      onBlur={() => { setEditando(false); if (!cancelou.current) onSalvar(txt.trim()) }}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { cancelou.current = true; e.target.blur() } }}
      className="h-9 w-44 px-3 rounded-full border border-primary-500 bg-white dark:bg-navy-700 text-sm font-semibold text-navy-900 dark:text-white outline-none" />
  )
}

function ListaProntos({ recursos, ocultos, pronto, onUsar, onApagar, onRestaurar, onVoltar }) {
  const [tipo, setTipo] = useState('todos')
  const [apagando, setApagando] = useState(null)       // modelo a apagar, ou 'faltam'
  const visiveis = MODELOS.filter(m => !ocultos.includes(m.id))
  const apagados = MODELOS.filter(m => ocultos.includes(m.id))
  const lista = tipo === 'apagados' ? apagados : visiveis.filter(m => tipo === 'todos' || m.tipo === tipo)
  const contagem = (t) => visiveis.filter(m => m.tipo === t).length
  const faltaMaterial = (m) => m.recursos.filter(r => !recursos.includes(r) && !(m.trocas ?? []).some(t => t.precisa === r))
  const semMaterial = visiveis.filter(m => faltaMaterial(m).length > 0)
  return (
    <div className="space-y-3">
      {onVoltar && <button onClick={onVoltar} className={`${btnGhost} w-full sm:w-auto`}>← Voltar ao treino que está na tela</button>}
      <div className={`${card} p-4`}>
        <h2 className="text-lg font-bold text-navy-900 dark:text-white">Treinos prontos</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Seus treinos de exemplo. Toque em "Usar" e o sistema completa o que faltar (mobilidade, aquecimento, alongamento).</p>
        <Opcoes valor={tipo} onChange={setTipo}
          opcoes={[['todos', `Todos (${visiveis.length})`], ...Object.entries(TIPOS_MODELO).map(([k, v]) => [k, `${v.label} (${contagem(k)})`]), ...(apagados.length ? [['apagados', `Apagados (${apagados.length})`]] : [])]} />
        {tipo !== 'apagados' && semMaterial.length > 0 && (
          <button onClick={() => setApagando('faltam')} className={`${btnGhost} mt-3 w-full sm:w-auto`}>Apagar os {semMaterial.length} que precisam de material que o polo não tem</button>
        )}
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {lista.map(m => {
          const faltam = faltaMaterial(m)
          const tp = TIPOS_MODELO[m.tipo]
          return (
            <li key={m.id} className={`${card} p-4 flex flex-col gap-2`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-400">Dia {m.dia}</div>
                  <div className="text-base font-bold text-navy-900 dark:text-white leading-snug">{m.nome}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{m.foco} · {FORMATOS[m.formato].label}{m.dupla ? ' · duplas' : ''}</div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${tp.cls}`} title={tp.dica}>{tp.label}</span>
              </div>
              <ul className="text-sm text-slate-600 dark:text-slate-300 list-disc pl-5 space-y-0.5">
                {m.principal.itens.slice(0, 4).map(i => <li key={typeof i === 'string' ? i : i.nome} className="break-words">{typeof i === 'string' ? i : i.nome}</li>)}
                {m.principal.itens.length > 4 && <li className="text-slate-400 list-none -ml-5">+ {m.principal.itens.length - 4} exercícios</li>}
              </ul>
              {faltam.length > 0 && <div className="text-sm text-amber-700 dark:text-amber-300">⚠️ Precisa de: {faltam.map(r => RECURSOS[r] ?? r).join(', ')}</div>}
              {tipo === 'apagados'
                ? <button onClick={() => onRestaurar(m.id)} className={`${btnGhost} w-full mt-1`}>Restaurar este treino</button>
                : (
                  <div className="grid grid-cols-[1fr_auto] gap-2 mt-1">
                    <button onClick={() => onUsar(m)} disabled={!pronto} className={`${btnPrimary} w-full`}>{pronto ? 'Usar este treino' : 'Marque nível e alunos'}</button>
                    <button onClick={() => setApagando(m)} aria-label={`Apagar ${m.nome}`} className={`${btnGhost} px-4`}><Trash2 size={18} /></button>
                  </div>
                )}
            </li>
          )
        })}
      </ul>
      {lista.length === 0 && <div className={`${card} p-8 text-center text-slate-500 dark:text-slate-400`}>Nenhum treino nesta lista.</div>}

      <ConfirmDialog open={!!apagando} onClose={() => setApagando(null)} confirmLabel="Apagar"
        title={apagando === 'faltam' ? 'Apagar treinos sem material?' : `Apagar "${apagando?.nome}"?`}
        description={apagando === 'faltam'
          ? `${semMaterial.length} treinos precisam de material que este polo não tem e saem da lista. Dá para restaurar depois em "Apagados".`
          : 'O treino sai da lista deste polo. Dá para restaurar depois em "Apagados".'}
        onConfirm={() => onApagar(apagando === 'faltam' ? semMaterial.map(m => m.id) : [apagando.id])} />
    </div>
  )
}

const fmtData = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const norm = (t) => (t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function ListaSalvos({ salvos, carregando, semTabela, erro, turmaNome, onAbrir, onApagar, onVoltar }) {
  const [busca, setBusca] = useState('')
  const [apagando, setApagando] = useState(null)
  const lista = salvos.filter(sv => !busca.trim() || norm(sv.titulo + ' ' + (turmaNome(sv.turma_id) ?? '') + ' ' + (sv.observacao ?? '')).includes(norm(busca)))
  if (semTabela) return (
    <div className={`${card} p-8 text-center`}>
      <p className="font-semibold text-navy-900 dark:text-white mb-1">Falta ativar o histórico no banco</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">Rode o arquivo <b>1-criar-treinos-salvos.sql</b> (pasta supabase\treino) no Supabase e volte aqui.</p>
    </div>
  )
  return (
    <div className="space-y-3">
      {onVoltar && <button onClick={onVoltar} className={`${btnGhost} w-full sm:w-auto`}>← Voltar ao treino que está na tela</button>}
      <div className={`${card} p-4`}>
        <h2 className="text-lg font-bold text-navy-900 dark:text-white">Histórico de treinos</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Treinos que você salvou. Abra para usar de novo na aula — dá para trocar exercícios e atualizar.</p>
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, turma ou observação…" className={`${inputCls} w-full pl-11`} />
        </div>
      </div>
      {erro && <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 text-sm">{erro}</div>}
      {carregando ? <div className="py-10 text-center text-slate-400">Carregando…</div>
        : lista.length === 0 ? <div className={`${card} p-8 text-center text-slate-500 dark:text-slate-400`}>{salvos.length ? 'Nenhum treino encontrado.' : 'Você ainda não salvou nenhum treino. Gere um e toque em "Salvar treino".'}</div>
        : (
          <ul className="grid gap-3 md:grid-cols-2">
            {lista.map(sv => {
              const c = sv.conteudo?.config ?? {}
              const principal = sv.conteudo?.blocos?.find(b => b.id === 'principal')
              return (
                <li key={sv.id} className={`${card} p-4 flex flex-col gap-2`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-400">{fmtData(sv.data_aula)}{turmaNome(sv.turma_id) ? ` · ${turmaNome(sv.turma_id)}` : ''}</div>
                      <div className="text-base font-bold text-navy-900 dark:text-white leading-snug break-words">{sv.titulo}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{FORMATOS[c.formato]?.label ?? '—'}{c.foco && FOCOS[c.foco] ? ` · ${FOCOS[c.foco].label}` : ''}{c.alunos ? ` · ${c.alunos} alunos` : ''}</div>
                    </div>
                  </div>
                  {principal && (
                    <ul className="text-sm text-slate-600 dark:text-slate-300 list-disc pl-5 space-y-0.5">
                      {principal.itens.slice(0, 3).map((i, k) => <li key={k} className="break-words">{i.nome}</li>)}
                      {principal.itens.length > 3 && <li className="text-slate-400 list-none -ml-5">+ {principal.itens.length - 3} exercícios</li>}
                    </ul>
                  )}
                  {sv.observacao && <div className="text-sm text-slate-500 dark:text-slate-400 italic">"{sv.observacao}"</div>}
                  <div className="grid grid-cols-[1fr_auto] gap-2 mt-1">
                    <button onClick={() => onAbrir(sv)} className={`${btnPrimary} w-full`}><FolderOpen size={18} /> Abrir</button>
                    <button onClick={() => setApagando(sv)} aria-label={`Excluir ${sv.titulo}`} className={`${btnGhost} px-4`}><Trash2 size={18} /></button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      <ConfirmDialog open={!!apagando} onClose={() => setApagando(null)} confirmLabel="Excluir"
        title={`Excluir "${apagando?.titulo}"?`}
        description="O treino salvo some do histórico e não dá para recuperar. (Os treinos prontos e o gerador não são afetados.)"
        onConfirm={() => onApagar(apagando)} />
    </div>
  )
}

export default function TreinoPolo({ poloId, poloNome }) {
  const { showToast, toastEl } = useToast()
  const padrao = { formato: 'auto', foco: 'auto', nivel: null, alunos: null, organizacao: 'auto', duracao: 40, recursos: RECURSOS_AGUA_LIMPA, baixoImpacto: false }
  const [cfg, setCfg] = useState(padrao)
  const [recentes, setRecentes] = useState([])
  const [treino, setTreino] = useState(null)
  const [trocando, setTrocando] = useState(null) // { blocoId, idx }
  const [ocultos, setOcultos] = useState([])
  const [historico, setHistorico] = useState([])   // últimos treinos (formato/foco/organização), para o modo automático variar
  const [modo, setModo] = useState('auto')    // 'auto' (gerar) | 'prontos' (treinos prontos) | 'historico' (salvos)
  const [verLista, setVerLista] = useState(false) // true = está escolhendo na lista (Prontos/Histórico); o treino da tela continua guardado
  const [pilha, setPilha] = useState([])          // versões anteriores do treino (para Desfazer)
  const [limpando, setLimpando] = useState(false)
  const [carregadoAtual, setCarregadoAtual] = useState(false)

  // treinos salvos (banco) — histórico por data/turma
  const [salvos, setSalvos] = useState([])
  const [carregandoSalvos, setCarregandoSalvos] = useState(false)
  const [semTabela, setSemTabela] = useState(false)
  const [erroSalvos, setErroSalvos] = useState('')
  const [turmas, setTurmas] = useState([])
  const [sheetSalvar, setSheetSalvar] = useState(false)
  const [formSalvar, setFormSalvar] = useState({ data: localIso(), turmaId: '', obs: '' })
  const [salvandoTreino, setSalvandoTreino] = useState(false)

  const carregarSalvos = useCallback(async () => {
    setCarregandoSalvos(true)
    const { data, error } = await supabase.from('treinos_salvos').select('*').eq('polo_id', poloId)
      .order('data_aula', { ascending: false }).order('criado_em', { ascending: false }).limit(300)
    if (error) {
      if (error.code === '42P01' || /treinos_salvos/.test(error.message ?? '')) setSemTabela(true)
      else setErroSalvos('Não foi possível carregar o histórico agora. Tente de novo.')
    } else { setSemTabela(false); setErroSalvos(''); setSalvos(data ?? []) }
    setCarregandoSalvos(false)
  }, [poloId])
  useEffect(() => { carregarSalvos() }, [carregarSalvos])
  useEffect(() => {
    supabase.from('turmas').select('id,horario,dias,faixa,modalidades(nome)').eq('polo_id', poloId)
      .then(({ data }) => setTurmas(data ?? []))
  }, [poloId])
  const rotuloTurma = (t) => `${t.modalidades?.nome ?? 'Turma'}${t.dias?.length ? ' · ' + t.dias.join('/') : ''}${t.horario ? ' ' + String(t.horario).slice(0, 5) : ''}`
  const turmaNome = (id) => { const t = turmas.find(x => x.id === id); return t ? rotuloTurma(t) : null }

  function abrirSalvar() {
    setFormSalvar({ data: localIso(), turmaId: '', obs: '' })
    setSheetSalvar(true)
  }
  async function salvarTreino(comoNovo) {
    const { salvoId, ...limpo } = treino
    setSalvandoTreino(true)
    const campos = { titulo: limpo.titulo, conteudo: limpo }
    let resp
    if (salvoId && !comoNovo) resp = await supabase.from('treinos_salvos').update(campos).eq('id', salvoId).select().single()
    else resp = await supabase.from('treinos_salvos').insert({
      ...campos, polo_id: poloId, data_aula: formSalvar.data || localIso(), turma_id: formSalvar.turmaId || null, observacao: formSalvar.obs.trim() || null,
    }).select().single()
    setSalvandoTreino(false)
    if (resp.error) {
      if (resp.error.code === '42P01') setSemTabela(true)
      return showToast(resp.error.code === '42501' ? 'Você não tem permissão para salvar treinos.' : 'Não foi possível salvar. Confira a internet e tente de novo.', 'error')
    }
    setTreino(t => ({ ...t, salvoId: resp.data.id }))
    setSheetSalvar(false); showToast(salvoId && !comoNovo ? 'Treino atualizado no histórico.' : 'Treino salvo no histórico.', 'success'); carregarSalvos()
  }
  function abrirSalvo(sv) { setTreino({ ...sv.conteudo, salvoId: sv.id }); setPilha([]); setVerLista(false) }
  async function apagarSalvo(sv) {
    const { error } = await supabase.from('treinos_salvos').delete().eq('id', sv.id)
    if (error) return showToast('Não foi possível excluir.', 'error')
    setSalvos(l => l.filter(x => x.id !== sv.id)); showToast('Treino excluído do histórico.', 'success')
  }

  // lembra as últimas escolhas deste polo neste aparelho (e os exercícios usados, para variar)
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE(poloId)) || 'null')
      if (salvo?.cfg) setCfg({ ...padrao, ...salvo.cfg, nivel: null, alunos: null }) // nível e nº de alunos: sempre marcar de novo
      if (salvo?.recentes) setRecentes(salvo.recentes)
      if (Array.isArray(salvo?.historico)) setHistorico(salvo.historico)
      const oc = JSON.parse(localStorage.getItem(`smel_treino_ocultos_${poloId}`) || '[]')
      if (Array.isArray(oc)) setOcultos(oc)
      // o treino que estava na tela volta como estava (some só ao gerar outro ou em "Limpar tela")
      const atual = JSON.parse(localStorage.getItem(`smel_treino_atual_${poloId}`) || 'null')
      if (atual?.treino?.blocos) { setTreino(atual.treino); if (atual.modo) setModo(atual.modo) }
    } catch { /* sem armazenamento: segue com o padrão */ }
    setCarregadoAtual(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poloId])

  // guarda o treino da tela a cada mudança
  useEffect(() => {
    if (!carregadoAtual) return
    try {
      const k = `smel_treino_atual_${poloId}`
      if (treino) localStorage.setItem(k, JSON.stringify({ treino, modo }))
      else localStorage.removeItem(k)
    } catch { /* ignora */ }
  }, [treino, modo, poloId, carregadoAtual])
  const guardar = useCallback((c, r, h) => {
    try { localStorage.setItem(CHAVE(poloId), JSON.stringify({ cfg: c, recentes: r, historico: h })) } catch { /* ignora */ }
  }, [poloId])

  const salvarOcultos = (lista) => {
    setOcultos(lista)
    try { localStorage.setItem(`smel_treino_ocultos_${poloId}`, JSON.stringify(lista)) } catch { /* ignora */ }
  }
  const apagarTreinos = (ids) => salvarOcultos([...new Set([...ocultos, ...ids])])
  const restaurarTreino = (id) => salvarOcultos(ocultos.filter(x => x !== id))

  const pronto = !!cfg.nivel && !!cfg.alunos

  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }))
  const alternarRecurso = (k) => setCfg(c => ({ ...c, recursos: c.recursos.includes(k) ? c.recursos.filter(x => x !== k) : [...c.recursos, k] }))

  // ── editar o treino da tela: volume, remover, trocar, desfazer ──
  const guardarDesfazer = () => setPilha(p => [...p.slice(-19), treino])
  function desfazer() { if (!pilha.length) return; setTreino(pilha[pilha.length - 1]); setPilha(pilha.slice(0, -1)) }
  function editarVolume(blocoId, idx, valor) {
    const novo = valor || undefined
    if (treino.blocos.find(b => b.id === blocoId)?.itens[idx]?.reps === novo) return
    guardarDesfazer()
    setTreino(t => ({ ...t, blocos: t.blocos.map(b => (b.id !== blocoId ? b : { ...b, itens: b.itens.map((it, i) => (i === idx ? { ...it, reps: novo } : it)) })) }))
  }
  function removerItem(blocoId, idx) {
    guardarDesfazer()
    setTreino(t => trocarItem(t, blocoId, idx, null))
    showToast('Exercício removido. Se foi sem querer, toque em "Desfazer".', 'success')
  }
  function aplicarTroca(blocoId, idx, novo) { guardarDesfazer(); setTreino(t => trocarItem(t, blocoId, idx, novo)) }
  function limparTela() { setTreino(null); setPilha([]); setVerLista(false) }

  function gerar() {
    if (!pronto) return
    // o que estiver em "Automático" é escolhido pelo sistema (variando a rotina)
    const esc = resolverAutomatico(cfg, historico)
    const real = { ...cfg, formato: esc.formato, foco: esc.foco, organizacao: esc.organizacao }
    const t = gerarTreino({ ...real, semente: Math.floor(Math.random() * 1e9), evitar: recentes })
    t.automatico = esc.automatico
    setTreino(t); setPilha([]); setVerLista(false)
    const usados = t.blocos.find(b => b.id === 'principal').itens.map(i => i.nome)
    const novosRecentes = [...usados, ...recentes].slice(0, 30)
    const novoHistorico = [{ formato: real.formato, foco: real.foco, organizacao: real.organizacao }, ...historico].slice(0, 8)
    setRecentes(novosRecentes); setHistorico(novoHistorico); guardar(cfg, novosRecentes, novoHistorico)
  }

  function usarModelo(m) {
    if (!pronto) return
    const t = gerarTreino({
      ...cfg, formato: m.formato, modelo: m, semente: Math.floor(Math.random() * 1e9), evitar: [],
      foco: cfg.foco === 'auto' ? 'full' : cfg.foco,
      organizacao: cfg.organizacao === 'auto' ? (m.dupla ? 'duplas' : 'individual') : cfg.organizacao,
    })
    setTreino(t); setPilha([]); setVerLista(false); guardar(cfg, recentes, historico)
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(textoWhatsApp(treino)); showToast('Treino copiado! Cole no WhatsApp.', 'success') }
    catch { showToast('Não consegui copiar. Selecione o texto e copie manualmente.', 'error') }
  }

  const alternativas = useMemo(
    () => (treino && trocando ? alternativasPara(treino, trocando.blocoId, trocando.idx) : []), [treino, trocando])
  const itemTrocando = treino && trocando ? treino.blocos.find(b => b.id === trocando.blocoId)?.itens[trocando.idx] : null

  return (
    <div className="lg:grid lg:grid-cols-[360px_1fr] lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
      {toastEl}

      {/* ── Opções ── */}
      <section className={`${card} p-5 space-y-5 lg:sticky lg:top-4`}>
        <div>
          <h2 className="text-lg font-bold text-navy-900 dark:text-white">Gerar treino</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{poloNome} · funcional</p>
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-navy-700">
          {[['auto', 'Gerar'], ['prontos', 'Prontos'], ['historico', `Histórico${salvos.length ? ` (${salvos.length})` : ''}`]].map(([k, rot]) => (
            <button key={k} type="button" onClick={() => { setModo(k); setVerLista(k !== 'auto') }}
              className={`h-11 rounded-lg text-sm font-semibold ${modo === k ? 'bg-primary-500 text-primary-950' : 'text-slate-500 dark:text-slate-300'}`}>{rot}</button>
          ))}
        </div>

        {modo === 'historico' && <p className="text-sm text-slate-500 dark:text-slate-400">Aqui ficam os treinos que você salvou, por data e turma. Abra um para usar de novo na aula.</p>}

        {modo !== 'historico' && (<>
        <div className={`rounded-xl border p-3 space-y-4 ${pronto ? 'border-slate-200 dark:border-navy-600' : 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10'}`}>
          <div>
            <Rotulo>Nível da turma <span className="text-amber-600 dark:text-amber-400 font-normal">· marque sempre</span></Rotulo>
            <Opcoes valor={cfg.nivel} onChange={v => set('nivel', v)} opcoes={[['i', 'Intermediário'], ['a', 'Avançado']]} />
          </div>
          <div>
            <Rotulo>Quantos alunos hoje <span className="text-amber-600 dark:text-amber-400 font-normal">· marque sempre</span></Rotulo>
            <Opcoes valor={cfg.alunos} onChange={v => set('alunos', v)} opcoes={[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => [n, String(n)])} />
          </div>
        </div>

        {modo === 'auto' && (<>
        <div><Rotulo>Formato</Rotulo>
          <Opcoes valor={cfg.formato} onChange={v => set('formato', v)}
            opcoes={[['auto', '✨ Automático'], ...Object.entries(FORMATOS).filter(([k]) => k !== 'escadaria' || cfg.recursos.includes('escada')).map(([k, v]) => [k, v.label])]} />
          <p className="text-sm text-slate-400 mt-2">{cfg.formato === 'auto' ? 'O sistema escolhe o formato e varia a rotina (não repete o mesmo seguido).' : FORMATOS[cfg.formato].desc}</p>
        </div>

        <div><Rotulo>Foco</Rotulo>
          <Opcoes valor={cfg.foco} onChange={v => set('foco', v)} opcoes={[['auto', '✨ Automático'], ...Object.entries(FOCOS).map(([k, v]) => [k, v.label])]} /></div>

        </>)}

        <div><Rotulo>Como os alunos fazem</Rotulo>
          <Opcoes valor={cfg.organizacao} onChange={v => set('organizacao', v)} opcoes={[['auto', '✨ Automático'], ...Object.entries(ORGANIZACOES)]} /></div>

        <div className="flex flex-wrap items-end gap-5">
          <div><Rotulo>Duração</Rotulo>
            <select value={cfg.duracao} onChange={e => set('duracao', Number(e.target.value))} className={inputCls}>
              {[30, 40, 50, 60].map(m => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
        </div>

        <div><Rotulo>Material e espaço de hoje</Rotulo>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(RECURSOS).map(([k, rot]) => (
              <label key={k} className={`flex items-center gap-2 min-h-11 px-3 rounded-xl border text-sm cursor-pointer ${cfg.recursos.includes(k)
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-navy-900 dark:text-white font-semibold'
                : 'border-slate-200 dark:border-navy-600 text-slate-500 dark:text-slate-400'}`}>
                <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={cfg.recursos.includes(k)} onChange={() => alternarRecurso(k)} />
                {rot}
              </label>
            ))}
          </div>
        </div>

        <label className={`flex items-center gap-3 min-h-11 px-3 rounded-xl border cursor-pointer text-sm ${cfg.baixoImpacto ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-navy-900 dark:text-white font-semibold' : 'border-slate-200 dark:border-navy-600 text-slate-500 dark:text-slate-400'}`}>
          <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={cfg.baixoImpacto} onChange={e => set('baixoImpacto', e.target.checked)} />
          Sem impacto (sem saltos nem corrida forte)
        </label>

        {!pronto && <p className="text-sm text-amber-700 dark:text-amber-300">Marque o nível da turma e a quantidade de alunos para continuar.</p>}

        {modo === 'auto' && <button onClick={gerar} disabled={!pronto} className={`${btnPrimary} w-full`}><Shuffle size={18} /> {treino ? 'Gerar outro treino' : 'Gerar treino'}</button>}
        </>)}
      </section>

      {/* ── Treino gerado ── */}
      <section className="space-y-3 min-w-0">
        {verLista && modo === 'historico' ? (
          <ListaSalvos salvos={salvos} carregando={carregandoSalvos} semTabela={semTabela} erro={erroSalvos} turmaNome={turmaNome} onAbrir={abrirSalvo} onApagar={apagarSalvo} onVoltar={treino ? () => setVerLista(false) : null} />
        ) : verLista && modo === 'prontos' ? (
          <ListaProntos recursos={cfg.recursos} ocultos={ocultos} pronto={pronto} onUsar={usarModelo} onApagar={apagarTreinos} onRestaurar={restaurarTreino} onVoltar={treino ? () => setVerLista(false) : null} />
        ) : !treino ? (
          <div className={`${card} p-10 text-center`}>
            <p className="font-semibold text-navy-900 dark:text-white mb-1">Nenhum treino gerado ainda</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Escolha as opções e toque em "Gerar treino". Você pode trocar qualquer exercício depois.</p>
          </div>
        ) : (
          <>
            <div className={`${card} p-5 flex flex-wrap items-center justify-between gap-3`}>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-navy-900 dark:text-white leading-tight">{treino.titulo}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{FORMATOS[treino.config.formato].label} · {FOCOS[treino.config.foco]?.label} · {treino.config.duracao} min · {ORGANIZACOES[treino.config.organizacao]} · {treino.config.alunos} alunos</p>
                {treino.automatico?.length > 0 && <p className="text-sm text-primary-600 dark:text-primary-400 mt-0.5">✨ O sistema escolheu: {treino.automatico.map(k => ({ formato: 'formato', foco: 'foco', organizacao: 'organização' })[k]).join(', ')}</p>}
              </div>
              <div className="flex gap-2 flex-wrap">
                {treino.salvoId
                  ? <button onClick={() => { setModo('historico'); setVerLista(true) }} className={btnGhost}>← Histórico</button>
                  : treino.config.modeloId
                    ? <button onClick={() => { setModo('prontos'); setVerLista(true) }} className={btnGhost}>← Outros treinos</button>
                    : <button onClick={gerar} className={btnGhost}><Shuffle size={16} /> Sortear de novo</button>}
                <button onClick={abrirSalvar} className={btnGhost}><Save size={16} /> {treino.salvoId ? 'Atualizar salvo' : 'Salvar treino'}</button>
                {pilha.length > 0 && <button onClick={desfazer} className={btnGhost}><Undo2 size={16} /> Desfazer</button>}
                <button onClick={() => setLimpando(true)} className={btnGhost}><Eraser size={16} /> Limpar tela</button>
                <button onClick={copiar} className={btnPrimary}><Copy size={16} /> Copiar para WhatsApp</button>
              </div>
            </div>

            {treino.blocos.map(b => (
              <div key={b.id} className={`${card} ${b.id === 'principal' ? 'border-primary-500/60 dark:border-primary-500/40' : ''} overflow-hidden`}>
                <div className="px-5 py-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-navy-900 dark:text-white">{b.titulo}</h3>
                    {b.regra && <p className="text-sm text-slate-500 dark:text-slate-400">{b.regra}</p>}
                  </div>
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap bg-slate-100 dark:bg-navy-700 px-3 py-1 rounded-full">{b.minutos} min</span>
                </div>
                <ol className="border-t border-slate-100 dark:border-navy-700 divide-y divide-slate-100 dark:divide-navy-700">
                  {b.itens.map((it, i) => (
                    <li key={`${it.nome}-${i}`} className="px-5 py-3.5 flex items-start gap-3">
                      <span className="mt-0.5 h-7 w-7 flex-shrink-0 grid place-items-center rounded-full bg-slate-100 dark:bg-navy-700 text-sm font-bold text-slate-500 dark:text-slate-300">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold text-navy-900 dark:text-white leading-snug break-words">
                          {it.prefixo && <span className="text-primary-600 dark:text-primary-400">{it.prefixo} · </span>}{it.nome}
                          {it.dupla && <span className="ml-2 text-xs align-middle px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">dupla</span>}
                        </div>
                        {it.det && <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{it.det}</div>}
                        <div className="mt-1.5"><Volume valor={it.reps} onSalvar={v => editarVolume(b.id, i, v)} /></div>
                      </div>
                      {it.slots && (
                        <button onClick={() => setTrocando({ blocoId: b.id, idx: i })} aria-label={`Trocar ${it.nome}`}
                          className="h-10 w-10 flex-shrink-0 grid place-items-center rounded-xl text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-navy-700"><Repeat2 size={18} /></button>
                      )}
                      <button onClick={() => removerItem(b.id, i)} aria-label={`Remover ${it.nome}`}
                        className="h-10 w-10 flex-shrink-0 grid place-items-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={18} /></button>
                    </li>
                  ))}
                  {b.itens.length === 0 && <li className="px-5 py-4 text-sm text-slate-400">Nenhum exercício neste bloco (todos foram removidos).</li>}
                </ol>
                {b.obs && <div className="px-5 py-3 border-t border-slate-100 dark:border-navy-700 text-sm text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-900/10">⚠️ {b.obs}</div>}
              </div>
            ))}
          </>
        )}
      </section>

      <ConfirmDialog open={limpando} onClose={() => setLimpando(false)} confirmLabel="Limpar tela"
        title="Limpar a tela?"
        description={treino?.salvoId ? 'O treino sai da tela. Ele continua salvo no Histórico.' : 'O treino sai da tela e não dá para recuperar. Se quiser guardar, toque em "Salvar treino" antes.'}
        onConfirm={limparTela} />

      {/* ── Salvar no histórico ── */}
      <Sheet open={sheetSalvar} onClose={() => setSheetSalvar(false)} title={treino?.salvoId ? 'Atualizar treino salvo' : 'Salvar treino'} subtitle={treino?.titulo}
        footer={<>
          <button onClick={() => setSheetSalvar(false)} className={btnGhost}>Cancelar</button>
          {treino?.salvoId && <button onClick={() => salvarTreino(true)} disabled={salvandoTreino} className={btnGhost}>Salvar como novo</button>}
          <button onClick={() => salvarTreino(false)} disabled={salvandoTreino} className={btnPrimary}>{salvandoTreino ? 'Salvando…' : treino?.salvoId ? 'Atualizar' : 'Salvar'}</button>
        </>}>
        {treino?.salvoId && <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">"Atualizar" grava as trocas que você fez neste treino salvo. "Salvar como novo" cria outro registro com a data e turma abaixo.</p>}
        <label className="block mb-4">
          <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Data da aula</span>
          <input type="date" value={formSalvar.data} onChange={e => setFormSalvar(f => ({ ...f, data: e.target.value }))} className={`${inputCls} w-full`} />
        </label>
        <label className="block mb-4">
          <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Turma (opcional)</span>
          <select value={formSalvar.turmaId} onChange={e => setFormSalvar(f => ({ ...f, turmaId: e.target.value }))} className={`${inputCls} w-full`}>
            <option value="">Sem turma específica</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{rotuloTurma(t)}</option>)}
          </select>
        </label>
        <label className="block mb-2">
          <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Observação (opcional)</span>
          <input value={formSalvar.obs} onChange={e => setFormSalvar(f => ({ ...f, obs: e.target.value }))} placeholder="Ex.: turma gostou, aumentar o tempo" className={`${inputCls} w-full`} />
        </label>
      </Sheet>

      {/* ── Trocar exercício ── */}
      <Sheet open={!!trocando} onClose={() => setTrocando(null)} title="Trocar exercício" subtitle={itemTrocando?.nome}
        footer={<button onClick={() => { aplicarTroca(trocando.blocoId, trocando.idx, null); setTrocando(null) }}
          className={`${btnGhost} text-red-600 dark:text-red-400`}><Trash2 size={16} /> Remover do treino</button>}>
        {alternativas.length === 0 ? (
          <p className="py-4 text-slate-500">Não há outro exercício compatível com o material de hoje.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-navy-700">
            {alternativas.map(a => (
              <li key={a.nome}>
                <button onClick={() => { aplicarTroca(trocando.blocoId, trocando.idx, a); setTrocando(null) }}
                  className="w-full text-left py-3 hover:bg-slate-50 dark:hover:bg-navy-700/40 rounded-lg px-2">
                  <div className="font-semibold text-navy-900 dark:text-white">{a.nome}</div>
                  {a.det && <div className="text-sm text-slate-500 dark:text-slate-400">{a.det}</div>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  )
}
