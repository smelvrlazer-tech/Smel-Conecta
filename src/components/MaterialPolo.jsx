// src/components/MaterialPolo.jsx
// Aba "Material" dentro do Detalhe do polo — inventário daquele polo.
// Só admin e coordenador (do polo) enxergam; o banco também nega para os demais.
// Realocar entre polos: só admin (função transferir_material no banco).
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Search, Camera, ChevronRight, ArrowRightLeft, Wrench, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from './ui/Toast'
import Sheet from './ui/Sheet'
import {
  CATEGORIAS, ESTADOS, TIPOS, TIPO_MOV, precisaAtencao, resumoMaterial, comprimirImagem, fmtDataHora,
} from '../lib/material'

const VAZIO = { nome: '', categoria: CATEGORIAS[0], tipo: 'consumo', estado: 'bom', quantidade: 1, codigo: '', observacao: '', foto_url: '' }
const inputCls = 'w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-700 text-base text-navy-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500'
const btnBase = 'h-12 px-5 rounded-xl text-base font-semibold transition-colors disabled:opacity-50'
const btnPrimary = `${btnBase} bg-primary-500 text-primary-950 hover:bg-primary-400`
const btnGhost = `${btnBase} border border-slate-200 dark:border-navy-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-700`

function Campo({ label, children, dica }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">{label}</span>
      {children}
      {dica && <span className="block text-sm text-slate-400 mt-1">{dica}</span>}
    </label>
  )
}

function EstadoChip({ estado }) {
  const e = ESTADOS[estado] ?? ESTADOS.bom
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-semibold whitespace-nowrap ${e.cls}`}>{e.label}</span>
}

export default function MaterialPolo({ poloId, poloNome, isAdmin }) {
  const { showToast, toastEl } = useToast()
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState('lista') // 'lista' | 'historico'
  const [busca, setBusca] = useState('')
  const [soProblema, setSoProblema] = useState(false)
  const [outrosPolos, setOutrosPolos] = useState([])
  const [historico, setHistorico] = useState([])
  const [loadingHist, setLoadingHist] = useState(false)

  const [form, setForm] = useState(VAZIO)
  const [editId, setEditId] = useState(null)
  const [sheetForm, setSheetForm] = useState(false)
  const [detalhe, setDetalhe] = useState(null)       // item aberto
  const [sheetEstado, setSheetEstado] = useState(false)
  const [sheetMover, setSheetMover] = useState(false)
  const [estadoForm, setEstadoForm] = useState({ estado: 'bom', qtd: 1, motivo: '' })
  const [moverForm, setMoverForm] = useState({ destino: '', qtd: 1, motivo: '' })
  const [salvando, setSalvando] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('material_itens').select('*').eq('polo_id', poloId).order('nome')
    if (error) setErro('Não foi possível carregar o material agora. Tente de novo.')
    else { setErro(''); setItens(data ?? []) }
    setLoading(false)
  }, [poloId])
  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (!isAdmin) return
    supabase.from('polos').select('id,nome,bairro').neq('id', poloId).order('nome')
      .then(({ data }) => setOutrosPolos(data ?? []))
  }, [isAdmin, poloId])

  const carregarHistorico = useCallback(async () => {
    setLoadingHist(true)
    const { data: movs } = await supabase.from('material_movimentacoes').select('*')
      .or(`polo_origem.eq.${poloId},polo_destino.eq.${poloId}`).order('feito_em', { ascending: false }).limit(100)
    const lista = movs ?? []
    const idsPolo = [...new Set(lista.flatMap(m => [m.polo_origem, m.polo_destino]).filter(Boolean))]
    const idsUser = [...new Set(lista.map(m => m.feito_por).filter(Boolean))]
    const [{ data: polos }, { data: pessoas }] = await Promise.all([
      idsPolo.length ? supabase.from('polos').select('id,nome,bairro').in('id', idsPolo) : { data: [] },
      idsUser.length ? supabase.from('profiles').select('id,nome').in('id', idsUser) : { data: [] },
    ])
    const nomePolo = Object.fromEntries((polos ?? []).map(p => [p.id, p.bairro || p.nome]))
    const nomePessoa = Object.fromEntries((pessoas ?? []).map(p => [p.id, p.nome]))
    setHistorico(lista.map(m => ({ ...m, _origem: nomePolo[m.polo_origem], _destino: nomePolo[m.polo_destino], _quem: nomePessoa[m.feito_por] })))
    setLoadingHist(false)
  }, [poloId])
  useEffect(() => { if (aba === 'historico') carregarHistorico() }, [aba, carregarHistorico])

  const resumo = useMemo(() => resumoMaterial(itens), [itens])

  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const visiveis = itens.filter(i =>
      (!soProblema || precisaAtencao(i)) && (!termo || i.nome.toLowerCase().includes(termo) || (i.codigo ?? '').toLowerCase().includes(termo)))
    const mapa = {}
    for (const i of visiveis) (mapa[i.categoria] ??= []).push(i)
    return Object.entries(mapa).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
  }, [itens, busca, soProblema])

  // ── ações ───────────────────────────────────────────────────────────────
  function abrirNovo() { setEditId(null); setForm(VAZIO); setSheetForm(true) }
  function abrirEditar(i) {
    setEditId(i.id)
    setForm({ nome: i.nome, categoria: i.categoria, tipo: i.tipo, estado: i.estado, quantidade: i.quantidade,
              codigo: i.codigo ?? '', observacao: i.observacao ?? '', foto_url: i.foto_url ?? '' })
    setDetalhe(null); setSheetForm(true)
  }

  async function enviarFoto(file) {
    if (!file) return
    setEnviandoFoto(true)
    try {
      const blob = await comprimirImagem(file)
      const caminho = `${poloId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
      const { error } = await supabase.storage.from('material').upload(caminho, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      const { data } = supabase.storage.from('material').getPublicUrl(caminho)
      setForm(f => ({ ...f, foto_url: data.publicUrl }))
    } catch {
      showToast('Não foi possível enviar a foto. Tente de novo.', 'error')
    }
    setEnviandoFoto(false)
  }

  async function salvarItem() {
    const nome = form.nome.trim()
    if (!nome) return showToast('Informe o nome do material.', 'warning')
    const consumo = form.tipo === 'consumo'
    const quantidade = consumo ? Math.floor(Number(form.quantidade)) : 1
    if (consumo && (!Number.isFinite(quantidade) || quantidade < (editId ? 0 : 1))) return showToast('Informe uma quantidade válida.', 'warning')
    const codigo = !consumo ? form.codigo.trim() : ''
    if (!consumo && !editId && !codigo) return showToast('Informe o código/plaqueta do patrimônio.', 'warning')

    setSalvando(true)
    const dados = {
      nome, categoria: form.categoria, quantidade,
      codigo: codigo || null, observacao: form.observacao.trim() || null, foto_url: form.foto_url || null,
    }
    let error
    if (editId) {
      ;({ error } = await supabase.from('material_itens').update(dados).eq('id', editId))
    } else {
      // consumo já existente no mesmo estado: soma na linha que já existe, em vez de duplicar
      const existente = consumo && itens.find(i => i.tipo === 'consumo' && i.estado === form.estado &&
        i.nome.trim().toLowerCase() === nome.toLowerCase())
      if (existente) ({ error } = await supabase.from('material_itens').update({ quantidade: existente.quantidade + quantidade }).eq('id', existente.id))
      else ({ error } = await supabase.from('material_itens').insert({ ...dados, polo_id: poloId, tipo: form.tipo, estado: form.estado }))
    }
    setSalvando(false)
    if (error) {
      return showToast(error.code === '23505' ? 'Já existe um item com esse código/plaqueta.'
        : error.code === '42501' ? 'Você não tem permissão para alterar o material deste polo.'
        : 'Não foi possível salvar. Confira a internet e tente de novo.', 'error')
    }
    setSheetForm(false); showToast(editId ? 'Material atualizado.' : 'Material cadastrado.', 'success'); carregar()
  }

  function abrirEstado(i) {
    setEstadoForm({ estado: i.estado === 'bom' ? 'reparo' : 'bom', qtd: i.quantidade, motivo: '' })
    setSheetEstado(true)
  }
  async function salvarEstado() {
    const i = detalhe
    setSalvando(true)
    const { error } = await supabase.rpc('alterar_estado_material', {
      p_item: i.id, p_estado: estadoForm.estado,
      p_qtd: i.tipo === 'consumo' ? Math.floor(Number(estadoForm.qtd)) : null, p_motivo: estadoForm.motivo || null,
    })
    setSalvando(false)
    if (error) return showToast(error.message?.includes('Quantidade') ? error.message : 'Não foi possível mudar o estado.', 'error')
    setSheetEstado(false); setDetalhe(null); showToast('Estado atualizado.', 'success'); carregar()
  }

  function abrirMover(i) {
    setMoverForm({ destino: '', qtd: i.quantidade, motivo: '' })
    setSheetMover(true)
  }
  async function confirmarMover() {
    const i = detalhe
    if (!moverForm.destino) return showToast('Escolha o polo de destino.', 'warning')
    setSalvando(true)
    const { error } = await supabase.rpc('transferir_material', {
      p_item: i.id, p_destino: moverForm.destino,
      p_qtd: i.tipo === 'consumo' ? Math.floor(Number(moverForm.qtd)) : null, p_motivo: moverForm.motivo || null,
    })
    setSalvando(false)
    if (error) return showToast(error.message?.includes('Quantidade') ? error.message : 'Não foi possível realocar.', 'error')
    setSheetMover(false); setDetalhe(null); showToast('Material realocado.', 'success'); carregar()
  }

  // ── tela ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {toastEl}

      {/* Nível 1: resumo em uma faixa */}
      <div className="grid grid-cols-3 gap-3">
        {[['Total de itens', resumo.total, ''], ['Precisam de atenção', resumo.atencao, resumo.atencao ? 'text-amber-500' : ''], ['Em bom estado', resumo.bons, 'text-emerald-500']].map(([rot, val, cor]) => (
          <div key={rot} className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-2xl p-4">
            <div className={`text-2xl sm:text-3xl font-bold text-navy-900 dark:text-white ${cor}`}>{val}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{rot}</div>
          </div>
        ))}
      </div>

      {/* Nível 2: abas + ação principal */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-slate-100 dark:bg-navy-800 p-1 rounded-xl">
          {[['lista', 'Material'], ['historico', 'Histórico']].map(([k, rot]) => (
            <button key={k} onClick={() => setAba(k)}
              className={`h-10 px-4 rounded-lg text-sm font-semibold ${aba === k ? 'bg-primary-500 text-primary-950' : 'text-slate-500 dark:text-slate-300'}`}>{rot}</button>
          ))}
        </div>
        {aba === 'lista' && <button onClick={abrirNovo} className={`${btnPrimary} hidden sm:inline-flex items-center gap-2 ml-auto`}><Plus size={18} /> Adicionar</button>}
      </div>

      {erro && <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 text-sm">{erro}</div>}

      {aba === 'lista' && (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="relative basis-full sm:basis-0 sm:flex-1 sm:min-w-[240px]">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar material ou código…" className={`${inputCls} pl-11`} />
            </div>
            <button onClick={() => setSoProblema(v => !v)}
              className={`${btnGhost} ${soProblema ? '!bg-primary-500 !text-primary-950 !border-transparent' : ''}`}>
              {soProblema ? '✓ ' : ''}Só com problema
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">Carregando material…</div>
          ) : grupos.length === 0 ? (
            <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-2xl p-10 text-center">
              <p className="font-semibold text-navy-900 dark:text-white mb-1">{itens.length ? 'Nenhum material encontrado' : 'Nenhum material cadastrado neste polo'}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{itens.length ? 'Tente outra busca ou tire o filtro.' : `Cadastre o que existe em ${poloNome ?? 'este polo'} para começar o controle.`}</p>
              {!itens.length && <button onClick={abrirNovo} className={btnPrimary}>+ Adicionar o primeiro material</button>}
            </div>
          ) : (
            // celular: 1 coluna · tablet/desktop: categorias lado a lado
            <div className="grid gap-3 lg:grid-cols-2 items-start">
              {grupos.map(([cat, lista]) => (
                <details key={cat} open className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-2xl overflow-hidden">
                  <summary className="px-4 py-3.5 flex items-center justify-between cursor-pointer font-semibold text-navy-900 dark:text-white">
                    <span>{cat}</span>
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{lista.reduce((t, i) => t + i.quantidade, 0)}</span>
                  </summary>
                  <ul className="border-t border-slate-100 dark:border-navy-700 divide-y divide-slate-100 dark:divide-navy-700">
                    {lista.map(i => (
                      <li key={i.id}>
                        <button onClick={() => setDetalhe(i)} className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-navy-700/40">
                          {i.foto_url
                            ? <img src={i.foto_url} alt="" className="h-11 w-11 rounded-lg object-cover flex-shrink-0" />
                            : <div className="h-11 w-11 rounded-lg bg-slate-100 dark:bg-navy-700 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-navy-900 dark:text-white leading-snug break-words">{i.nome}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">{i.tipo === 'patrimonio' ? `Código ${i.codigo ?? '—'}` : `${i.quantidade} unidades`}</div>
                          </div>
                          <EstadoChip estado={i.estado} />
                          <ChevronRight size={18} className="text-slate-300 flex-shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          )}
        </>
      )}

      {aba === 'historico' && (
        loadingHist ? <div className="py-12 text-center text-slate-400">Carregando histórico…</div>
        : historico.length === 0 ? <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-2xl p-10 text-center text-slate-500">Ainda não há movimentações neste polo.</div>
        : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {historico.map(m => (
              <li key={m.id} className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-navy-900 dark:text-white">{TIPO_MOV[m.tipo]} · {m.nome}</div>
                  <div className="text-sm text-slate-400 whitespace-nowrap">{fmtDataHora(m.feito_em)}</div>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {m.tipo === 'transferencia' && m._origem && m._destino ? `${m.quantidade} un. · ${m._origem} → ${m._destino}` : m.detalhe || (m.quantidade != null ? `${m.quantidade} un.` : '')}
                </div>
                <div className="text-sm text-slate-400 mt-0.5">{m._quem ?? 'Usuário'}{m.motivo ? ` · ${m.motivo}` : ''}</div>
              </li>
            ))}
          </ul>
        )
      )}

      {/* Botão fixo no celular */}
      {aba === 'lista' && (
        <div className="sm:hidden fixed bottom-4 inset-x-4 z-30">
          <button onClick={abrirNovo} className={`${btnPrimary} w-full shadow-lg flex items-center justify-center gap-2`}><Plus size={18} /> Adicionar material</button>
        </div>
      )}

      {/* ── Detalhe do item ── */}
      <Sheet open={!!detalhe && !sheetForm && !sheetEstado && !sheetMover} onClose={() => setDetalhe(null)}
        title={detalhe?.nome} subtitle={detalhe ? `${detalhe.categoria} · ${TIPOS[detalhe.tipo]}` : ''}
        footer={detalhe && (
          <>
            <button onClick={() => abrirEditar(detalhe)} className={btnGhost}>Editar dados</button>
            <button onClick={() => abrirEstado(detalhe)} className={`${btnGhost} inline-flex items-center gap-2`}><Wrench size={16} /> Mudar estado</button>
            {isAdmin && detalhe.estado !== 'baixado' && (
              <button onClick={() => abrirMover(detalhe)} className={`${btnPrimary} inline-flex items-center gap-2`}><ArrowRightLeft size={16} /> Realocar</button>
            )}
          </>
        )}>
        {detalhe && (
          <div className="space-y-3">
            {detalhe.foto_url && <img src={detalhe.foto_url} alt="" className="w-full max-h-64 object-cover rounded-xl" />}
            <div className="flex items-center gap-3"><EstadoChip estado={detalhe.estado} />
              <span className="text-base text-navy-900 dark:text-white font-semibold">{detalhe.tipo === 'patrimonio' ? `Código ${detalhe.codigo ?? '—'}` : `${detalhe.quantidade} unidades`}</span></div>
            {detalhe.observacao && <p className="text-base text-slate-600 dark:text-slate-300">{detalhe.observacao}</p>}
          </div>
        )}
      </Sheet>

      {/* ── Adicionar / editar ── */}
      <Sheet open={sheetForm} onClose={() => setSheetForm(false)} title={editId ? 'Editar material' : 'Adicionar material'} subtitle={poloNome}
        footer={<><button onClick={() => setSheetForm(false)} className={btnGhost}>Cancelar</button>
          <button onClick={salvarItem} disabled={salvando || enviandoFoto} className={btnPrimary}>{salvando ? 'Salvando…' : 'Salvar'}</button></>}>
        <Campo label="Nome"><input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex.: Bola de futsal oficial" className={inputCls} /></Campo>
        <Campo label="Categoria">
          <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className={inputCls}>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Campo>
        {!editId && (
          <Campo label="Tipo">
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-navy-700">
              {Object.entries(TIPOS).map(([k, rot]) => (
                <button type="button" key={k} onClick={() => setForm(f => ({ ...f, tipo: k }))}
                  className={`h-11 rounded-lg text-sm font-semibold ${form.tipo === k ? 'bg-primary-500 text-primary-950' : 'text-slate-500 dark:text-slate-300'}`}>{rot}</button>
              ))}
            </div>
          </Campo>
        )}
        {form.tipo === 'consumo'
          ? <Campo label="Quantidade"><input type="number" inputMode="numeric" min={editId ? 0 : 1} value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} className={inputCls} /></Campo>
          : <Campo label="Código / plaqueta"><input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ex.: SMEL-00123" className={inputCls} /></Campo>}
        {!editId && (
          <Campo label="Estado">
            <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} className={inputCls}>
              {['bom', 'reparo', 'danificado'].map(k => <option key={k} value={k}>{ESTADOS[k].label}</option>)}
            </select>
          </Campo>
        )}
        <Campo label="Observação (opcional)"><input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} className={inputCls} /></Campo>
        <Campo label="Foto (opcional)">
          {form.foto_url && (
            <div className="relative mb-2 w-fit">
              <img src={form.foto_url} alt="" className="h-28 rounded-xl object-cover" />
              <button type="button" onClick={() => setForm(f => ({ ...f, foto_url: '' }))} aria-label="Remover foto"
                className="absolute -top-2 -right-2 h-7 w-7 grid place-items-center rounded-full bg-red-500 text-white"><X size={14} /></button>
            </div>
          )}
          <label className={`${btnGhost} inline-flex items-center gap-2 cursor-pointer`}>
            <Camera size={18} /> {enviandoFoto ? 'Enviando…' : 'Tirar foto ou escolher'}
            <input type="file" accept="image/*" className="hidden" disabled={enviandoFoto} onChange={e => { enviarFoto(e.target.files?.[0]); e.target.value = '' }} />
          </label>
        </Campo>
      </Sheet>

      {/* ── Mudar estado ── */}
      <Sheet open={sheetEstado} onClose={() => setSheetEstado(false)} title="Mudar estado" subtitle={detalhe?.nome}
        footer={<><button onClick={() => setSheetEstado(false)} className={btnGhost}>Cancelar</button>
          <button onClick={salvarEstado} disabled={salvando} className={btnPrimary}>{salvando ? 'Salvando…' : 'Confirmar'}</button></>}>
        <Campo label="Novo estado">
          <select value={estadoForm.estado} onChange={e => setEstadoForm(f => ({ ...f, estado: e.target.value }))} className={inputCls}>
            {Object.entries(ESTADOS).filter(([k]) => k !== detalhe?.estado).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Campo>
        {detalhe?.tipo === 'consumo' && (
          <Campo label="Quantos itens mudam de estado?" dica={`Disponível: ${detalhe.quantidade}. Pode mudar só parte (ex.: 4 de 30 cones).`}>
            <input type="number" inputMode="numeric" min={1} max={detalhe.quantidade} value={estadoForm.qtd} onChange={e => setEstadoForm(f => ({ ...f, qtd: e.target.value }))} className={inputCls} />
          </Campo>
        )}
        <Campo label="Motivo (opcional)"><input value={estadoForm.motivo} onChange={e => setEstadoForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Ex.: furou no jogo de ontem" className={inputCls} /></Campo>
      </Sheet>

      {/* ── Realocar (só admin) ── */}
      <Sheet open={sheetMover} onClose={() => setSheetMover(false)} title="Realocar material"
        subtitle={detalhe ? `${detalhe.nome} · de ${poloNome ?? 'este polo'}` : ''}
        footer={<><button onClick={() => setSheetMover(false)} className={btnGhost}>Cancelar</button>
          <button onClick={confirmarMover} disabled={salvando} className={btnPrimary}>{salvando ? 'Realocando…' : 'Confirmar realocação'}</button></>}>
        <Campo label="Enviar para o polo">
          <select value={moverForm.destino} onChange={e => setMoverForm(f => ({ ...f, destino: e.target.value }))} className={inputCls}>
            <option value="">Escolha o polo…</option>
            {outrosPolos.map(p => <option key={p.id} value={p.id}>{p.bairro || p.nome}</option>)}
          </select>
        </Campo>
        {detalhe?.tipo === 'consumo' && (
          <Campo label="Quantidade a enviar" dica={`Disponível: ${detalhe.quantidade}.`}>
            <input type="number" inputMode="numeric" min={1} max={detalhe.quantidade} value={moverForm.qtd} onChange={e => setMoverForm(f => ({ ...f, qtd: e.target.value }))} className={inputCls} />
          </Campo>
        )}
        <Campo label="Motivo (opcional)"><input value={moverForm.motivo} onChange={e => setMoverForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Ex.: turma nova precisa de coletes" className={inputCls} /></Campo>
      </Sheet>
    </div>
  )
}
