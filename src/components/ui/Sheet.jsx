// src/components/ui/Sheet.jsx
// Painel que sobe de baixo no celular (fácil de alcançar com o polegar) e vira
// janela centralizada em telas maiores. Tem modo claro e escuro.
import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Sheet({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-navy-800 rounded-t-3xl sm:rounded-2xl shadow-xl border border-slate-200 dark:border-navy-700">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-navy-900 dark:text-white leading-tight">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Fechar"
            className="h-10 w-10 -mr-2 -mt-1 flex-shrink-0 grid place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-700">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-4 flex-1">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-100 dark:border-navy-700 flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>
  )
}
