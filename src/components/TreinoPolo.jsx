// src/components/TreinoPolo.jsx
// Aba "Treinos" do polo — gerador de treino funcional (piloto: Água Limpa, só o dono do sistema).
//   Gerar   → o setup para criar um treino novo (só aqui) + o treino gerado.
//   Prontos → só a lista: meus treinos salvos + modelos (sem setup).
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Shuffle, Copy, Repeat2, Trash2, Save, Undo2, Eraser, Pencil, Check, Plus } from 'lucide-react'
import Sheet from './ui/Sheet'
import ConfirmDialog from './ui/ConfirmDialog'
import TreinoEditor from './TreinoEditor'
import Prontos from './treino/Prontos'
import { inputCls, btnPrimary, btnGhost, card, Opcoes, Rotulo } from './treino/ui'
import { supabase } from '../lib/supabase'
import { localIso } from '../lib/semana'
import { useToast } from './ui/Toast'
import { RECURSOS, RECURSOS_AGUA_LIMPA } from '../lib/treino/exercicios'
import {
  FORMATOS, FOCOS, ORGANIZACOES, gerarTreino, textoWhatsApp, alternativasPara, trocarItem, resolverAutomatico,
} from '../lib/treino/gerador'
import { MODELOS } from '../lib/treino/modelos'

const CHAVE = (poloId) => `smel_treino_${poloId}`

// compara dois treinos ignorando a ordem das chaves e os campos de controle
function semControle(t) { const { salvoId, ...r } = t ?? {}; return r }
function igual(a, b) {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false
  const ka = Object.keys(a).filter(k => a[k] !== undefined), kb = Object.keys(b).filter(k => b[k] !== undefined)
  return ka.length === kb.length && ka.every(k => igual(a[k], b[k]))
}
const temConteudo = (t) => (t?.blocos ?? []).some(b => b.itens.length > 0)

// volume do exercício: toque para editar (Enter confirma, Esc cancela)
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

export default function TreinoPolo({ poloId, poloNome }) {
  const { showToast, toastEl } = useToast()
  const padrao = { formato: 'auto', foco: 'auto', nivel: null, alunos: null, organizacao: 'auto', duracao: 40, recursos: RECURSOS_AGUA_LIMPA, baixoImpacto: false }
  const [cfg, setCfg] = useState(padrao)
  const [recentes, setRecentes] = useState([])
  const [treino, setTreino] = useState(null)
  const [trocando, setTrocando] = useState(null)       // { blocoId, idx }
  const [ocultos, setOcultos] = useState([])           // modelos que você apagou da lista deste polo
  const [rotina, setRotina] = useState([])             // últimos formato/foco/organização (o automático varia)
  const [modo, setModo] = useState('auto')             // 'auto' (Gerar) | 'prontos'
  const [verLista, setVerLista] = useState(false)      // em Prontos: true = vendo a lista; false = vendo o treino aberto
  const [pilha, setPilha] = useState([])               // versões anteriores do treino (Desfazer)
  const [limpando, setLimpando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [carregadoAtual, setCarregadoAtual] = useState(false)
  const [guarda, setGuarda] = useState(null)           // { acao } — aviso "salvar antes?"
  const posSalvar = useRef(null)
  const semGuardaGerar = useRef(false)

  // treinos salvos (banco), por data e turma
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
      else setErroSalvos('Não foi possível carregar seus treinos agora. Tente de novo.')
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

  // ── restaura o que estava na tela e as preferências deste polo ──
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE(poloId)) || 'null')
      if (salvo?.cfg) setCfg({ ...padrao, ...salvo.cfg, nivel: null, alunos: null }) // nível e nº de alunos: sempre marcar de novo
      if (salvo?.recentes) setRecentes(salvo.recentes)
      if (Array.isArray(salvo?.historico)) setRotina(salvo.historico)
      const oc = JSON.parse(localStorage.getItem(`smel_treino_ocultos_${poloId}`) || '[]')
      if (Array.isArray(oc)) setOcultos(oc)
      const atual = JSON.parse(localStorage.getItem(`smel_treino_atual_${poloId}`) || 'null')
      if (atual?.treino?.blocos) { setTreino(atual.treino); setModo(atual.modo === 'prontos' ? 'prontos' : 'auto') }
    } catch { /* sem armazenamento: segue com o padrão */ }
    setCarregadoAtual(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poloId])
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
  const apagarModelos = (ids) => salvarOcultos([...new Set([...ocultos, ...ids])])
  const restaurarModelo = (id) => salvarOcultos(ocultos.filter(x => x !== id))

  const pronto = !!cfg.nivel && !!cfg.alunos
  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }))
  const alternarRecurso = (k) => setCfg(c => ({ ...c, recursos: c.recursos.includes(k) ? c.recursos.filter(x => x !== k) : [...c.recursos, k] }))

  // ── aviso "salvar antes?" quando um treino não salvo (ou com mudanças) vai ser substituído ──
  function precisaSalvar() {
    if (!treino || !temConteudo(treino)) return false
    if (!treino.salvoId) return true
    const sv = salvos.find(s => s.id === treino.salvoId)
    return !!sv && !igual(semControle(sv.conteudo), semControle(treino))
  }
  function comGuarda(acao, { gerar = false } = {}) {
    if (precisaSalvar() && !(gerar && semGuardaGerar.current)) { setGuarda({ acao, gerar }); return }
    acao()
  }

  // ── colocar um treino na tela ──
  function colocarNaTela(t) { setTreino(t); setPilha([]); setVerLista(false); setEditando(false) }

  function executarGerar() {
    // o que estiver em "Automático" é escolhido pelo sistema (variando a rotina)
    const esc = resolverAutomatico(cfg, rotina)
    const real = { ...cfg, formato: esc.formato, foco: esc.foco, organizacao: esc.organizacao }
    const t = gerarTreino({ ...real, semente: Math.floor(Math.random() * 1e9), evitar: recentes })
    t.automatico = esc.automatico
    colocarNaTela(t)
    const usados = t.blocos.find(b => b.id === 'principal').itens.map(i => i.nome)
    const novosRecentes = [...usados, ...recentes].slice(0, 30)
    const novaRotina = [{ formato: real.formato, foco: real.foco, organizacao: real.organizacao }, ...rotina].slice(0, 8)
    setRecentes(novosRecentes); setRotina(novaRotina); guardar(cfg, novosRecentes, novaRotina)
  }
  function gerar() { if (pronto) comGuarda(executarGerar, { gerar: true }) }

  function usarModelo(m, nivel, alunos) {
    // semente fixa por treino: a mobilidade, o aquecimento e o alongamento que completam o treino são sempre os mesmos
    const semente = [...m.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
    colocarNaTela(gerarTreino({
      ...cfg, nivel, alunos, formato: m.formato, modelo: m, semente, evitar: [],
      foco: m.focos?.[0] ?? 'full', organizacao: m.org ?? 'individual',
    }))
  }

  function novoManual() {
    comGuarda(() => {
      const vazio = (id, titulo, minutos) => ({ id, titulo, minutos, regra: '', itens: [] })
      colocarNaTela({
        titulo: 'Novo treino',
        config: { formato: 'fortime', foco: 'full', nivel: cfg.nivel ?? 'i', alunos: cfg.alunos ?? null, organizacao: 'individual', duracao: 40, recursos: cfg.recursos, semente: 0, baixoImpacto: false, modeloId: null, manual: true },
        blocos: [vazio('mobilidade', 'Mobilidade', 8), vazio('aquecimento', 'Aquecimento', 6), vazio('principal', 'Treino', 22), vazio('calma', 'Volta à calma', 4)],
      })
      setModo('auto'); setEditando(true)
    })
  }

  function abrirSalvo(sv) {
    const { histId, ...c } = sv.conteudo
    colocarNaTela({ ...c, salvoId: sv.id })
  }

  // ── salvar ──
  function abrirSalvar() { setFormSalvar({ data: localIso(), turmaId: '', obs: '' }); setSheetSalvar(true) }
  function fecharSalvar() { posSalvar.current = null; setSheetSalvar(false) }
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
    semGuardaGerar.current = false
    setSheetSalvar(false); showToast(salvoId && !comoNovo ? 'Treino atualizado em Prontos.' : 'Treino salvo em Prontos.', 'success')
    await carregarSalvos()
    const depois = posSalvar.current; posSalvar.current = null
    if (depois) depois()
  }
  async function apagarSalvo(sv) {
    const { error } = await supabase.from('treinos_salvos').delete().eq('id', sv.id)
    if (error) return showToast('Não foi possível excluir.', 'error')
    setSalvos(l => l.filter(x => x.id !== sv.id)); showToast('Treino excluído.', 'success')
  }

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
  const mudarTreino = (fn) => { setPilha(p => [...p.slice(-19), treino]); setTreino(fn) }
  function limparTela() { setTreino(null); setPilha([]); setVerLista(false); setEditando(false) }

  async function copiar() {
    try { await navigator.clipboard.writeText(textoWhatsApp(treino)); showToast('Treino copiado! Cole no WhatsApp.', 'success') }
    catch { showToast('Não consegui copiar. Selecione o texto e copie manualmente.', 'error') }
  }

  const alternativas = useMemo(
    () => (treino && trocando ? alternativasPara(treino, trocando.blocoId, trocando.idx) : []), [treino, trocando])
  const itemTrocando = treino && trocando ? treino.blocos.find(b => b.id === trocando.blocoId)?.itens[trocando.idx] : null
  const totalProntos = salvos.length + MODELOS.filter(m => !ocultos.includes(m.id)).length

  // ───────────────────────────── telas ─────────────────────────────
  const treinoView = !treino ? (
    <div className={`${card} p-10 text-center`}>
      <p className="font-semibold text-navy-900 dark:text-white mb-1">Nenhum treino na tela</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">Escolha as opções e toque em "Gerar treino", ou abra um treino em Prontos.</p>
    </div>
  ) : (
    <div className="space-y-3 min-w-0">
      <div className={`${card} p-5 flex flex-wrap items-center justify-between gap-3`}>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-navy-900 dark:text-white leading-tight">{treino.titulo}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{FORMATOS[treino.config.formato]?.label} · {FOCOS[treino.config.foco]?.label} · {treino.config.duracao} min · {ORGANIZACOES[treino.config.organizacao]}{treino.config.alunos ? ` · ${treino.config.alunos} alunos` : ''}</p>
          {treino.automatico?.length > 0 && <p className="text-sm text-primary-600 dark:text-primary-400 mt-0.5">✨ O sistema escolheu: {treino.automatico.map(k => ({ formato: 'formato', foco: 'foco', organizacao: 'organização' })[k]).join(', ')}</p>}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {modo === 'prontos'
            ? <button onClick={() => setVerLista(true)} className={btnGhost}>← Prontos</button>
            : <button onClick={gerar} disabled={!pronto} className={btnGhost}><Shuffle size={16} /> Sortear de novo</button>}
          <button onClick={() => setEditando(v => !v)} className={editando ? btnPrimary : btnGhost}>{editando ? <><Check size={16} /> Concluir edição</> : <><Pencil size={16} /> Editar</>}</button>
          <button onClick={abrirSalvar} className={btnGhost}><Save size={16} /> {treino.salvoId ? 'Atualizar salvo' : 'Salvar'}</button>
          {pilha.length > 0 && <button onClick={desfazer} aria-label="Desfazer" title="Desfazer" className={`${btnGhost} px-0 w-12`}><Undo2 size={18} /></button>}
          <button onClick={() => setLimpando(true)} aria-label="Limpar tela" title="Limpar tela" className={`${btnGhost} px-0 w-12`}><Eraser size={18} /></button>
          <button onClick={copiar} className={btnPrimary}><Copy size={16} /> WhatsApp</button>
        </div>
      </div>

      {editando ? <TreinoEditor treino={treino} onMudar={mudarTreino} /> : treino.blocos.map(b => (
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
            {b.itens.length === 0 && <li className="px-5 py-4 text-sm text-slate-400">Nenhum exercício neste bloco.</li>}
          </ol>
          {b.obs && <div className="px-5 py-3 border-t border-slate-100 dark:border-navy-700 text-sm text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-900/10">⚠️ {b.obs}</div>}
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      {toastEl}

      {/* Barra de cima: 2 abas + criar do zero */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-navy-700 w-full sm:w-80">
          {[['auto', 'Gerar'], ['prontos', `Prontos (${totalProntos})`]].map(([k, rot]) => (
            <button key={k} type="button" onClick={() => { setModo(k); setVerLista(k === 'prontos') }}
              className={`h-11 rounded-lg text-sm font-semibold ${modo === k ? 'bg-primary-500 text-primary-950' : 'text-slate-500 dark:text-slate-300'}`}>{rot}</button>
          ))}
        </div>
        <button onClick={novoManual} className={btnGhost}><Plus size={18} /> Criar treino do zero</button>
      </div>

      {modo === 'auto' ? (
        /* ── GERAR: setup + treino ── */
        <div className="lg:grid lg:grid-cols-[360px_1fr] lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
          <section className={`${card} p-5 space-y-5 lg:sticky lg:top-4`}>
            <div>
              <h2 className="text-lg font-bold text-navy-900 dark:text-white">Novo treino</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{poloNome} · funcional</p>
            </div>

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

            <div><Rotulo>Formato</Rotulo>
              <Opcoes valor={cfg.formato} onChange={v => set('formato', v)}
                opcoes={[['auto', '✨ Automático'], ...Object.entries(FORMATOS).filter(([k]) => k !== 'escadaria' || cfg.recursos.includes('escada')).map(([k, v]) => [k, v.label])]} />
              <p className="text-sm text-slate-400 mt-2">{cfg.formato === 'auto' ? 'O sistema escolhe o formato e varia a rotina (não repete o mesmo seguido).' : FORMATOS[cfg.formato].desc}</p>
            </div>
            <div><Rotulo>Foco</Rotulo>
              <Opcoes valor={cfg.foco} onChange={v => set('foco', v)} opcoes={[['auto', '✨ Automático'], ...Object.entries(FOCOS).map(([k, v]) => [k, v.label])]} /></div>
            <div><Rotulo>Como os alunos fazem</Rotulo>
              <Opcoes valor={cfg.organizacao} onChange={v => set('organizacao', v)} opcoes={[['auto', '✨ Automático'], ...Object.entries(ORGANIZACOES)]} /></div>

            <div><Rotulo>Duração</Rotulo>
              <select value={cfg.duracao} onChange={e => set('duracao', Number(e.target.value))} className={inputCls}>
                {[30, 40, 50, 60].map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
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
            <button onClick={gerar} disabled={!pronto} className={`${btnPrimary} w-full`}><Shuffle size={18} /> {treino ? 'Gerar outro treino' : 'Gerar treino'}</button>
          </section>

          <section className="min-w-0">{treinoView}</section>
        </div>
      ) : verLista ? (
        /* ── PRONTOS: só a lista ── */
        <Prontos
          salvos={salvos} carregando={carregandoSalvos} semTabela={semTabela} erro={erroSalvos} turmaNome={turmaNome}
          ocultos={ocultos} recursos={cfg.recursos}
          onAbrirSalvo={sv => comGuarda(() => abrirSalvo(sv))} onApagarSalvo={apagarSalvo}
          onUsarModelo={(m, n, a) => comGuarda(() => usarModelo(m, n, a))}
          onApagarModelos={apagarModelos} onRestaurarModelo={restaurarModelo}
          onVoltar={treino ? () => setVerLista(false) : null} />
      ) : (
        /* ── treino aberto a partir de Prontos ── */
        <section className="min-w-0">{treinoView}</section>
      )}

      {/* Aviso: salvar antes de substituir o treino da tela */}
      <Sheet open={!!guarda} onClose={() => setGuarda(null)} title="Salvar este treino antes?"
        subtitle={treino?.salvoId ? 'Você mudou o treino e não atualizou o salvo.' : 'Ele ainda não foi salvo e vai sair da tela.'}
        footer={<>
          <button onClick={() => setGuarda(null)} className={btnGhost}>Cancelar</button>
          <button onClick={() => { const a = guarda.acao; if (guarda.gerar) semGuardaGerar.current = true; setGuarda(null); a() }} className={btnGhost}>Continuar sem salvar</button>
          <button onClick={() => { posSalvar.current = guarda.acao; setGuarda(null); abrirSalvar() }} className={btnPrimary}>{treino?.salvoId ? 'Atualizar salvo' : 'Salvar'}</button>
        </>}>
        <p className="text-sm text-slate-500 dark:text-slate-400">Treino: <b className="text-navy-900 dark:text-white">{treino?.titulo}</b></p>
      </Sheet>

      <ConfirmDialog open={limpando} onClose={() => setLimpando(false)} confirmLabel="Limpar tela"
        title="Limpar a tela?"
        description={treino?.salvoId ? 'O treino sai da tela. Ele continua salvo em Prontos.' : 'O treino sai da tela e não dá para recuperar. Se quiser guardar, toque em "Salvar" antes.'}
        onConfirm={limparTela} />

      {/* Salvar */}
      <Sheet open={sheetSalvar} onClose={fecharSalvar} title={treino?.salvoId ? 'Atualizar treino salvo' : 'Salvar treino'} subtitle={treino?.titulo}
        footer={<>
          <button onClick={fecharSalvar} className={btnGhost}>Cancelar</button>
          {treino?.salvoId && <button onClick={() => salvarTreino(true)} disabled={salvandoTreino} className={btnGhost}>Salvar como novo</button>}
          <button onClick={() => salvarTreino(false)} disabled={salvandoTreino} className={btnPrimary}>{salvandoTreino ? 'Salvando…' : treino?.salvoId ? 'Atualizar' : 'Salvar'}</button>
        </>}>
        {treino?.salvoId && <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">"Atualizar" grava as mudanças neste treino salvo. "Salvar como novo" cria outro registro com a data e turma abaixo.</p>}
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

      {/* Trocar exercício */}
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
