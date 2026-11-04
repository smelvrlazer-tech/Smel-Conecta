// src/components/TreinoEditor.jsx
// Editor do treino: criar do zero e mudar qualquer treino (gerado, pronto ou salvo).
// Edita título, formato, foco, como fazem, duração, e cada bloco (nome, tempo, regra) com seus
// exercícios (nome, volume, como fazer), podendo adicionar, remover e reordenar.
import { useState, useRef } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { FORMATOS, FOCOS, ORGANIZACOES } from '../lib/treino/gerador'
import { PRINCIPAIS, MOBILIDADE, AQUECIMENTO, ALONGAMENTO } from '../lib/treino/exercicios'

const card = 'bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-2xl'
const inputCls = 'h-11 px-3 rounded-xl border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-700 text-base text-navy-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500'
const iconBtn = 'h-10 w-10 flex-shrink-0 grid place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-700'

// nomes da biblioteca, para sugerir enquanto digita (sem obrigar a usar)
const NOMES = [...new Set([...PRINCIPAIS, ...MOBILIDADE, ...AQUECIMENTO, ...ALONGAMENTO].map(e => e.nome))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

// Campo que só grava ao sair dele (ou Enter), para não refazer o treino a cada letra.
function Campo({ valor, onSalvar, className = '', ...resto }) {
  const [txt, setTxt] = useState(valor ?? '')
  const ultimo = useRef(valor ?? '')
  if ((valor ?? '') !== ultimo.current) { ultimo.current = valor ?? ''; setTxt(valor ?? '') }
  return (
    <input {...resto} value={txt} onChange={e => setTxt(e.target.value)}
      onBlur={() => { if (txt.trim() !== (valor ?? '').trim()) onSalvar(txt.trim()) }}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
      className={`${inputCls} ${className}`} />
  )
}

const Rot = ({ children }) => <span className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">{children}</span>

export default function TreinoEditor({ treino, onMudar }) {
  const cfg = treino.config

  const setCfg = (patch) => onMudar(t => ({ ...t, config: { ...t.config, ...patch } }))
  const setBloco = (id, patch) => onMudar(t => ({ ...t, blocos: t.blocos.map(b => (b.id === id ? { ...b, ...patch } : b)) }))
  const setItem = (id, idx, patch) => onMudar(t => ({
    ...t, blocos: t.blocos.map(b => (b.id !== id ? b : { ...b, itens: b.itens.map((it, i) => (i === idx ? { ...it, ...patch } : it)) })),
  }))
  const addItem = (id) => onMudar(t => ({ ...t, blocos: t.blocos.map(b => (b.id !== id ? b : { ...b, itens: [...b.itens, { nome: '' }] })) }))
  const delItem = (id, idx) => onMudar(t => ({ ...t, blocos: t.blocos.map(b => (b.id !== id ? b : { ...b, itens: b.itens.filter((_, i) => i !== idx) })) }))
  const moverItem = (id, idx, d) => onMudar(t => ({
    ...t, blocos: t.blocos.map(b => {
      if (b.id !== id) return b
      const j = idx + d
      if (j < 0 || j >= b.itens.length) return b
      const itens = [...b.itens];[itens[idx], itens[j]] = [itens[j], itens[idx]]
      return { ...b, itens }
    }),
  }))
  const addBloco = () => onMudar(t => ({ ...t, blocos: [...t.blocos, { id: `extra-${Date.now()}`, titulo: 'Novo bloco', minutos: 0, regra: '', itens: [{ nome: '' }] }] }))
  const delBloco = (id) => onMudar(t => ({ ...t, blocos: t.blocos.filter(b => b.id !== id) }))
  const moverBloco = (id, d) => onMudar(t => {
    const i = t.blocos.findIndex(b => b.id === id), j = i + d
    if (j < 0 || j >= t.blocos.length) return t
    const blocos = [...t.blocos];[blocos[i], blocos[j]] = [blocos[j], blocos[i]]
    return { ...t, blocos }
  })

  return (
    <div className="space-y-3">
      <datalist id="lista-exercicios">{NOMES.map(n => <option key={n} value={n} />)}</datalist>

      {/* Detalhes do treino */}
      <div className={`${card} p-5 space-y-4`}>
        <div><Rot>Nome do treino</Rot>
          <Campo valor={treino.titulo} onSalvar={v => onMudar(t => ({ ...t, titulo: v || 'Treino sem nome' }))} className="w-full" placeholder="Ex.: Conditioning + For Time" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Rot>Formato</Rot>
            <select value={cfg.formato} onChange={e => setCfg({ formato: e.target.value })} className={`${inputCls} w-full`}>
              {Object.entries(FORMATOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select></div>
          <div><Rot>Como fazem</Rot>
            <select value={cfg.organizacao} onChange={e => setCfg({ organizacao: e.target.value })} className={`${inputCls} w-full`}>
              {Object.entries(ORGANIZACOES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div><Rot>Foco</Rot>
            <select value={cfg.foco} onChange={e => setCfg({ foco: e.target.value })} className={`${inputCls} w-full`}>
              {Object.entries(FOCOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select></div>
          <div><Rot>Duração (min)</Rot>
            <input type="number" inputMode="numeric" min={5} max={180} value={cfg.duracao} onChange={e => setCfg({ duracao: Math.max(5, Number(e.target.value) || 40) })} className={`${inputCls} w-full`} /></div>
        </div>
      </div>

      {/* Blocos */}
      {treino.blocos.map((b, bi) => (
        <div key={b.id} className={`${card} overflow-hidden ${b.id === 'principal' ? 'border-primary-500/60 dark:border-primary-500/40' : ''}`}>
          <div className="p-4 space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 min-w-0"><Rot>Bloco</Rot><Campo valor={b.titulo} onSalvar={v => setBloco(b.id, { titulo: v || 'Bloco' })} className="w-full font-semibold" /></div>
              <div className="w-24"><Rot>Minutos</Rot>
                <input type="number" inputMode="numeric" min={0} value={b.minutos ?? 0} onChange={e => setBloco(b.id, { minutos: Math.max(0, Number(e.target.value) || 0) })} className={`${inputCls} w-full`} /></div>
              <div className="flex">
                <button onClick={() => moverBloco(b.id, -1)} disabled={bi === 0} aria-label="Subir bloco" className={`${iconBtn} disabled:opacity-30`}><ChevronUp size={18} /></button>
                <button onClick={() => moverBloco(b.id, 1)} disabled={bi === treino.blocos.length - 1} aria-label="Descer bloco" className={`${iconBtn} disabled:opacity-30`}><ChevronDown size={18} /></button>
                {b.id !== 'principal' && <button onClick={() => delBloco(b.id)} aria-label="Excluir bloco" className={`${iconBtn} hover:!text-red-500`}><Trash2 size={18} /></button>}
              </div>
            </div>
            <div><Rot>Regra do bloco</Rot><Campo valor={b.regra} onSalvar={v => setBloco(b.id, { regra: v })} className="w-full" placeholder="Ex.: 3 rounds for time · cap 15 min" /></div>
          </div>

          <ol className="border-t border-slate-100 dark:border-navy-700 divide-y divide-slate-100 dark:divide-navy-700">
            {b.itens.map((it, i) => (
              <li key={i} className="p-3 flex gap-2 items-start">
                <span className="mt-2.5 h-7 w-7 flex-shrink-0 grid place-items-center rounded-full bg-slate-100 dark:bg-navy-700 text-sm font-bold text-slate-500 dark:text-slate-300">{i + 1}</span>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex gap-2">
                    <Campo list="lista-exercicios" valor={it.nome} onSalvar={v => setItem(b.id, i, { nome: v })} className="flex-1 min-w-0 font-semibold" placeholder="Exercício" aria-label="Nome do exercício" />
                    <Campo valor={it.reps} onSalvar={v => setItem(b.id, i, { reps: v || undefined })} className="w-28" placeholder="Volume" aria-label="Volume (ex.: 15 reps, 40s)" />
                  </div>
                  <Campo valor={it.det} onSalvar={v => setItem(b.id, i, { det: v || undefined })} className="w-full text-sm" placeholder="Como fazer / observação (opcional)" aria-label="Como fazer" />
                </div>
                <div className="flex flex-col">
                  <button onClick={() => moverItem(b.id, i, -1)} disabled={i === 0} aria-label="Subir exercício" className={`${iconBtn} h-9 w-9 disabled:opacity-30`}><ChevronUp size={16} /></button>
                  <button onClick={() => moverItem(b.id, i, 1)} disabled={i === b.itens.length - 1} aria-label="Descer exercício" className={`${iconBtn} h-9 w-9 disabled:opacity-30`}><ChevronDown size={16} /></button>
                </div>
                <button onClick={() => delItem(b.id, i)} aria-label="Remover exercício" className={`${iconBtn} mt-1 hover:!text-red-500`}><Trash2 size={18} /></button>
              </li>
            ))}
          </ol>
          <div className="p-3 border-t border-slate-100 dark:border-navy-700">
            <button onClick={() => addItem(b.id)} className="h-11 w-full rounded-xl border border-dashed border-slate-300 dark:border-navy-500 text-sm font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-navy-700"><Plus size={16} /> Adicionar exercício</button>
          </div>
          <div className="px-4 pb-4"><Rot>Observação do bloco (opcional)</Rot>
            <Campo valor={b.obs} onSalvar={v => setBloco(b.id, { obs: v || undefined })} className="w-full text-sm" placeholder="Ex.: Sem carga: usar o bastão" /></div>
        </div>
      ))}

      <button onClick={addBloco} className="h-12 w-full rounded-2xl border border-dashed border-slate-300 dark:border-navy-500 text-base font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-navy-700"><Plus size={18} /> Adicionar bloco (ex.: Conditioning, Liberação miofascial)</button>
    </div>
  )
}
