// src/components/TreinoPolo.jsx
// Aba "Treinos" do polo — gerador de treino funcional (piloto: Água Limpa, só admin).
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Shuffle, Copy, Minus, Plus, Repeat2, Trash2 } from 'lucide-react'
import Sheet from './ui/Sheet'
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

function ListaProntos({ recursos, ocultos, pronto, onUsar, onApagar, onRestaurar }) {
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

export default function TreinoPolo({ poloId, poloNome }) {
  const { showToast, toastEl } = useToast()
  const padrao = { formato: 'auto', foco: 'auto', nivel: null, alunos: null, organizacao: 'auto', duracao: 40, recursos: RECURSOS_AGUA_LIMPA, baixoImpacto: false }
  const [cfg, setCfg] = useState(padrao)
  const [recentes, setRecentes] = useState([])
  const [treino, setTreino] = useState(null)
  const [trocando, setTrocando] = useState(null) // { blocoId, idx }
  const [ocultos, setOcultos] = useState([])
  const [historico, setHistorico] = useState([])   // últimos treinos (formato/foco/organização), para o modo automático variar
  const [modo, setModo] = useState('auto')    // 'auto' (gerar) | 'prontos' (treinos prontos)

  // lembra as últimas escolhas deste polo neste aparelho (e os exercícios usados, para variar)
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE(poloId)) || 'null')
      if (salvo?.cfg) setCfg({ ...padrao, ...salvo.cfg, nivel: null, alunos: null }) // nível e nº de alunos: sempre marcar de novo
      if (salvo?.recentes) setRecentes(salvo.recentes)
      if (Array.isArray(salvo?.historico)) setHistorico(salvo.historico)
      const oc = JSON.parse(localStorage.getItem(`smel_treino_ocultos_${poloId}`) || '[]')
      if (Array.isArray(oc)) setOcultos(oc)
    } catch { /* sem armazenamento: segue com o padrão */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poloId])
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

  function gerar() {
    if (!pronto) return
    // o que estiver em "Automático" é escolhido pelo sistema (variando a rotina)
    const esc = resolverAutomatico(cfg, historico)
    const real = { ...cfg, formato: esc.formato, foco: esc.foco, organizacao: esc.organizacao }
    const t = gerarTreino({ ...real, semente: Math.floor(Math.random() * 1e9), evitar: recentes })
    t.automatico = esc.automatico
    setTreino(t)
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
    setTreino(t); guardar(cfg, recentes, historico)
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

        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-navy-700">
          {[['auto', 'Gerar automático'], ['prontos', 'Treinos prontos']].map(([k, rot]) => (
            <button key={k} type="button" onClick={() => { setModo(k); setTreino(null) }}
              className={`h-11 rounded-lg text-sm font-semibold ${modo === k ? 'bg-primary-500 text-primary-950' : 'text-slate-500 dark:text-slate-300'}`}>{rot}</button>
          ))}
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
      </section>

      {/* ── Treino gerado ── */}
      <section className="space-y-3 min-w-0">
        {modo === 'prontos' && !treino?.config?.modeloId ? (
          <ListaProntos recursos={cfg.recursos} ocultos={ocultos} pronto={pronto} onUsar={usarModelo} onApagar={apagarTreinos} onRestaurar={restaurarTreino} />
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
                {treino.config.modeloId
                  ? <button onClick={() => setTreino(null)} className={btnGhost}>← Outros treinos</button>
                  : <button onClick={gerar} className={btnGhost}><Shuffle size={16} /> Sortear de novo</button>}
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
                          {it.reps && <span className="text-slate-500 dark:text-slate-400 font-medium"> — {it.reps}</span>}
                          {it.dupla && <span className="ml-2 text-xs align-middle px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">dupla</span>}
                        </div>
                        {it.det && <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{it.det}</div>}
                      </div>
                      {it.slots && (
                        <button onClick={() => setTrocando({ blocoId: b.id, idx: i })} aria-label={`Trocar ${it.nome}`}
                          className="h-10 w-10 flex-shrink-0 grid place-items-center rounded-xl text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-navy-700"><Repeat2 size={18} /></button>
                      )}
                    </li>
                  ))}
                </ol>
                {b.obs && <div className="px-5 py-3 border-t border-slate-100 dark:border-navy-700 text-sm text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-900/10">⚠️ {b.obs}</div>}
              </div>
            ))}
          </>
        )}
      </section>

      {/* ── Trocar exercício ── */}
      <Sheet open={!!trocando} onClose={() => setTrocando(null)} title="Trocar exercício" subtitle={itemTrocando?.nome}
        footer={<button onClick={() => { setTreino(t => trocarItem(t, trocando.blocoId, trocando.idx, null)); setTrocando(null) }}
          className={`${btnGhost} text-red-600 dark:text-red-400`}><Trash2 size={16} /> Remover do treino</button>}>
        {alternativas.length === 0 ? (
          <p className="py-4 text-slate-500">Não há outro exercício compatível com o material de hoje.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-navy-700">
            {alternativas.map(a => (
              <li key={a.nome}>
                <button onClick={() => { setTreino(t => trocarItem(t, trocando.blocoId, trocando.idx, a)); setTrocando(null) }}
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
