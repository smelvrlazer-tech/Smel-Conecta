// src/components/TreinoPolo.jsx
// Aba "Treinos" do polo — gerador de treino funcional (piloto: Água Limpa, só admin).
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Shuffle, Copy, Minus, Plus, Repeat2, Trash2 } from 'lucide-react'
import Sheet from './ui/Sheet'
import { useToast } from './ui/Toast'
import { RECURSOS, RECURSOS_AGUA_LIMPA } from '../lib/treino/exercicios'
import {
  FORMATOS, FOCOS, ORGANIZACOES, gerarTreino, textoWhatsApp, alternativasPara, trocarItem,
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

export default function TreinoPolo({ poloId, poloNome }) {
  const { showToast, toastEl } = useToast()
  const padrao = { formato: 'circuito', foco: 'pernas', nivel: 'i', alunos: 8, organizacao: 'individual', duracao: 40, recursos: RECURSOS_AGUA_LIMPA }
  const [cfg, setCfg] = useState(padrao)
  const [recentes, setRecentes] = useState([])
  const [treino, setTreino] = useState(null)
  const [trocando, setTrocando] = useState(null) // { blocoId, idx }

  // lembra as últimas escolhas deste polo neste aparelho (e os exercícios usados, para variar)
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE(poloId)) || 'null')
      if (salvo?.cfg) setCfg({ ...padrao, ...salvo.cfg })
      if (salvo?.recentes) setRecentes(salvo.recentes)
    } catch { /* sem armazenamento: segue com o padrão */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poloId])
  const guardar = useCallback((c, r) => {
    try { localStorage.setItem(CHAVE(poloId), JSON.stringify({ cfg: c, recentes: r })) } catch { /* ignora */ }
  }, [poloId])

  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }))
  const alternarRecurso = (k) => setCfg(c => ({ ...c, recursos: c.recursos.includes(k) ? c.recursos.filter(x => x !== k) : [...c.recursos, k] }))

  function gerar() {
    const t = gerarTreino({ ...cfg, semente: Math.floor(Math.random() * 1e9), evitar: recentes })
    setTreino(t)
    const usados = t.blocos.find(b => b.id === 'principal').itens.map(i => i.nome)
    const novosRecentes = [...usados, ...recentes].slice(0, 30)
    setRecentes(novosRecentes); guardar(cfg, novosRecentes)
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

        <div><Rotulo>Formato</Rotulo>
          <Opcoes valor={cfg.formato} onChange={v => set('formato', v)}
            opcoes={Object.entries(FORMATOS).filter(([k]) => k !== 'escadaria' || cfg.recursos.includes('escada')).map(([k, v]) => [k, v.label])} />
          <p className="text-sm text-slate-400 mt-2">{FORMATOS[cfg.formato].desc}</p>
        </div>

        <div><Rotulo>Foco</Rotulo>
          <Opcoes valor={cfg.foco} onChange={v => set('foco', v)} opcoes={Object.entries(FOCOS).map(([k, v]) => [k, v.label])} /></div>

        <div><Rotulo>Nível da turma</Rotulo>
          <Opcoes valor={cfg.nivel} onChange={v => set('nivel', v)} opcoes={[['i', 'Intermediário'], ['a', 'Avançado']]} /></div>

        <div><Rotulo>Como os alunos fazem</Rotulo>
          <Opcoes valor={cfg.organizacao} onChange={v => set('organizacao', v)} opcoes={Object.entries(ORGANIZACOES)} /></div>

        <div className="flex flex-wrap items-end gap-5">
          <div><Rotulo>Alunos hoje</Rotulo>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => set('alunos', Math.max(1, cfg.alunos - 1))} aria-label="Menos alunos" className="h-11 w-11 grid place-items-center rounded-xl border border-slate-200 dark:border-navy-600 text-slate-600 dark:text-slate-200"><Minus size={18} /></button>
              <span className="w-12 text-center text-lg font-bold text-navy-900 dark:text-white">{cfg.alunos}</span>
              <button type="button" onClick={() => set('alunos', Math.min(40, cfg.alunos + 1))} aria-label="Mais alunos" className="h-11 w-11 grid place-items-center rounded-xl bg-primary-500 text-primary-950"><Plus size={18} /></button>
            </div>
          </div>
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

        <button onClick={gerar} className={`${btnPrimary} w-full`}><Shuffle size={18} /> {treino ? 'Gerar outro treino' : 'Gerar treino'}</button>
      </section>

      {/* ── Treino gerado ── */}
      <section className="space-y-3 min-w-0">
        {!treino ? (
          <div className={`${card} p-10 text-center`}>
            <p className="font-semibold text-navy-900 dark:text-white mb-1">Nenhum treino gerado ainda</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Escolha as opções e toque em "Gerar treino". Você pode trocar qualquer exercício depois.</p>
          </div>
        ) : (
          <>
            <div className={`${card} p-5 flex flex-wrap items-center justify-between gap-3`}>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-navy-900 dark:text-white leading-tight">{treino.titulo}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{FORMATOS[treino.config.formato].label} · {treino.config.duracao} min · {ORGANIZACOES[treino.config.organizacao]} · {treino.config.alunos} alunos</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={gerar} className={btnGhost}><Shuffle size={16} /> Sortear de novo</button>
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
