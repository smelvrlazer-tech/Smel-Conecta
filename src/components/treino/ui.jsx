// src/components/treino/ui.jsx
// Estilos e peças pequenas compartilhadas pelas telas de Treinos (Gerar, Prontos, Histórico).

export const inputCls = 'h-12 px-4 rounded-xl border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-700 text-base text-navy-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500'
export const btn = 'h-12 px-5 rounded-xl text-base font-semibold transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2'
export const btnPrimary = `${btn} bg-primary-500 text-primary-950 hover:bg-primary-400`
export const btnGhost = `${btn} border border-slate-200 dark:border-navy-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-700`
export const card = 'bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-2xl'
// botão pequeno de card (lista): 44px de altura, ainda confortável para o toque
export const btnCardPrimary = 'h-11 px-4 rounded-xl text-sm font-semibold bg-primary-500 text-primary-950 hover:bg-primary-400 inline-flex items-center justify-center gap-2 disabled:opacity-50'
export const btnCardIcon = 'h-11 w-11 grid place-items-center rounded-xl border border-slate-200 dark:border-navy-600 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'

export function Opcoes({ valor, onChange, opcoes }) {
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

export const Rotulo = ({ children }) => <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{children}</div>

export const norm = (t) => (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const dataBr = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export const ORG_ROTULO = { individual: 'Individual', duplas: 'Duplas', trios: 'Trios' }
export const principalDe = (t) => (t?.blocos ?? []).find(b => b.id === 'principal')
