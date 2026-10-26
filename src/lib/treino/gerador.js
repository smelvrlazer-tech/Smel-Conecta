// src/lib/treino/gerador.js
// Gerador de treino funcional por regras (sem IA externa): escolhe exercícios compatíveis com o
// material do polo e monta mobilidade → aquecimento → parte principal → alongamento.
import { PRINCIPAIS, MOBILIDADE, AQUECIMENTO, JOGOS, ALONGAMENTO } from './exercicios.js'

export const FORMATOS = {
  circuito: { label: 'Circuito', desc: 'Rounds de 5 exercícios: tempo de trabalho e de troca' },
  estacoes: { label: 'Estações', desc: 'Grupos rodam pelas estações; cada um com seu tempo' },
  tabata:   { label: 'Tabata', desc: 'Blocos de 4 min: 20s faz / 10s descansa, alternando 2 exercícios' },
  escada:   { label: 'Escada (repetições)', desc: 'Repetições que descem (10→1) ou em degraus (20-16-12-8-4)' },
  amrap:    { label: 'AMRAP', desc: 'O máximo de rounds possíveis no tempo' },
  emom:     { label: 'EMOM', desc: 'A cada minuto, um exercício diferente' },
  fortime:  { label: 'For time', desc: 'Sequência o mais rápido possível, com limite de tempo' },
  livre:    { label: 'Funcional livre', desc: 'Sequência contínua, ritmo do aluno' },
  escadaria:{ label: 'Escadaria', desc: 'Treino usando a escada do polo (sobe e desce com exercícios)' },
  mobilidade:{ label: 'Mobilidade e alongamento', desc: 'Aula de mobilidade, controle e alongamento — sem impacto' },
}

export const FOCOS = {
  pernas:    { label: 'Pernas', receita: ['pernas_bi', 'pernas_uni', 'pliometria', 'cardio', 'core', 'pernas_uni'] },
  core:      { label: 'Core', receita: ['core', 'rotacao', 'isometria', 'core', 'rotacao', 'core'] },
  cardio:    { label: 'Cardio e agilidade', receita: ['corrida', 'pliometria', 'cardio', 'pernas_bi', 'core', 'agilidade'] },
  full:      { label: 'Corpo todo', receita: ['pernas_bi', 'empurrar', 'core', 'cardio', 'pliometria', 'full'] },
  superiores:{ label: 'Superiores', receita: ['empurrar', 'full', 'core', 'empurrar', 'cardio', 'core'] },
  agilidade: { label: 'Agilidade', receita: ['agilidade', 'corrida', 'pliometria', 'agilidade', 'core', 'cardio'] },
}

export const ORGANIZACOES = { individual: 'Individual', duplas: 'Duplas', trios: 'Trios' }

const NOMES = {
  pernas: ['THE ARENA', 'LEG DAY', 'ELEVATE', 'TERRA FIRME'],
  core: ['CORE CENTRAL', 'NÚCLEO DE AÇO', 'EIXO FORTE'],
  cardio: ['COURT AGILITY', 'ALTA ROTAÇÃO', 'SEM FREIO'],
  full: ['CORPO TODO', 'COMBO', 'FULL ENGINE'],
  superiores: ['PUSH DAY', 'FORÇA DE BRAÇO', 'PARTE DE CIMA'],
  agilidade: ['PÉS DE FOGO', 'COURT AGILITY', 'MUDANÇA DE DIREÇÃO'],
}

// ── sorteio com semente (mesma semente = mesmo treino; "sortear de novo" troca a semente) ──
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const sortear = (rand, lista) => lista[Math.floor(rand() * lista.length)]
const embaralhar = (rand, lista) => { const l = [...lista]; for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1));[l[i], l[j]] = [l[j], l[i]] } return l }

const temRecursos = (e, recursos) => e.r.every(x => recursos.includes(x))
const nivelOk = (e, nivel) => e.n === 'ia' || e.n === nivel
const fmtSeg = (s) => (s % 60 === 0 ? `${s / 60} min` : s > 60 ? `${Math.floor(s / 60)}min${s % 60}s` : `${s}s`)

export function opcoesDisponiveis(recursos) {
  return { escadaria: recursos.includes('escada') }
}

export function gerarTreino(cfg) {
  const {
    formato = 'circuito', foco = 'pernas', nivel = 'i', alunos = 8, organizacao = 'individual',
    duracao = 40, recursos = [], semente = Date.now(), evitar = [], baixoImpacto = false, modelo = null,
  } = cfg
  const semImpacto = baixoImpacto || formato === 'mobilidade'
  const rand = rng(semente)
  const evit = new Set(evitar.map(n => n.toLowerCase()))
  const grupoTam = organizacao === 'duplas' ? 2 : organizacao === 'trios' ? 3 : 1
  const nivelCod = nivel === 'a' ? 'a' : 'i'

  // tempos da aula
  const mob = duracao >= 45 ? 10 : duracao >= 35 ? 8 : 5
  const aquec = duracao >= 45 ? 8 : duracao >= 35 ? 6 : 4
  const calma = duracao >= 35 ? 4 : 3
  const principalMin = Math.max(10, duracao - mob - aquec - calma)

  const usados = new Set()
  const pool = (lista) => lista.filter(e => temRecursos(e, recursos) && nivelOk(e, nivelCod) && (!semImpacto || e.imp === 'baixo'))

  // escolhe um exercício de um "papel" (slot), evitando repetir e os usados recentemente
  function escolher(slot, lista = PRINCIPAIS, extra = () => true) {
    const base = pool(lista).filter(e => e.slots.includes(slot) && extra(e) && !usados.has(e.nome))
    const novos = base.filter(e => !evit.has(e.nome.toLowerCase()))
    const e = sortear(rand, novos.length ? novos : base)
    if (e) usados.add(e.nome)
    return e
  }
  function escolherVarios(receita, extra) {
    const out = []
    for (const slot of receita) {
      const e = escolher(slot, PRINCIPAIS, extra) ?? escolher('full', PRINCIPAIS, extra) ?? escolher('cardio', PRINCIPAIS, extra)
      if (e) out.push(e)
    }
    return out
  }

  // exercícios da parte principal, conforme o foco (e em dupla/trio, troca alguns por exercícios de dupla)
  function exerciciosPrincipais(qtd, extra, receitaBase) {
    const receita = (receitaBase ?? FOCOS[foco].receita).slice(0, qtd)
    let lista = escolherVarios(receita, extra)
    if (grupoTam > 1) {
      const quantos = Math.min(2, Math.max(1, Math.floor(qtd / 3)))
      for (let k = 0; k < quantos; k++) {
        const slotRef = lista[lista.length - 1 - k]?.slots?.[0]
        const par = pool(PRINCIPAIS).find(e => e.d && !usados.has(e.nome) && (!slotRef || e.slots.includes(slotRef)))
          ?? sortear(rand, pool(PRINCIPAIS).filter(e => e.d && !usados.has(e.nome)).concat([null]).filter(Boolean))
        if (par) { usados.add(par.nome); lista[lista.length - 1 - k] = par }
      }
    }
    return lista
  }

  const repsDe = (e) => {
    if (e.slots.includes('isometria')) return nivelCod === 'a' ? '45s' : '30s'
    if (e.slots.includes('corrida')) return '1 ida e volta'
    if (e.slots.includes('escadaria')) return '2 subidas'
    return nivelCod === 'a' ? '15 reps' : '12 reps'
  }
  const item = (e, extra = {}) => ({ nome: e.nome, det: e.det, dupla: e.d, slots: e.slots, ...extra })
  const regraDupla = grupoTam > 1
    ? (grupoTam === 2 ? 'Em duplas: enquanto um faz, o outro descansa e conta ("I go, you go").'
                      : 'Em trios: um faz, os outros dois descansam alternando.')
    : ''

  const blocos = []

  // 1) Mobilidade
  {
    const porExercicio = 40
    const qtd = Math.max(4, Math.min(8, Math.round((mob * 60) / (porExercicio * 2))))
    const comBastao = pool(MOBILIDADE).filter(e => e.r.includes('bastao'))
    const gerais = embaralhar(rand, pool(MOBILIDADE).filter(e => !e.r.includes('bastao')))
    let sel = gerais.slice(0, qtd - (comBastao.length ? 1 : 0))
    if (comBastao.length) sel.push(sortear(rand, comBastao))
    sel = sel.slice(0, qtd)
    blocos.push({
      id: 'mobilidade', titulo: 'Mobilidade', minutos: mob,
      regra: `${sel.length} movimentos · ${porExercicio}s cada · ${Math.max(1, Math.round((mob * 60) / (sel.length * porExercicio)))} volta(s)`,
      itens: sel.map(e => item(e)),
    })
  }

  // 2) Aquecimento
  {
    const baixo = nivelCod === 'i'
    const aq = pool(AQUECIMENTO)
    const par = () => { const l = embaralhar(rand, aq.filter(e => !baixo || e.imp === 'baixo' || rand() > 0.5)); return [l[0], l.find(e => e.nome !== l[0].nome)] }
    const jogosOk = JOGOS.filter(j => j.r.every(x => recursos.includes(x)))
    const itens = []
    let regra
    if (aquec >= 8) {
      const [a1, b1] = par(), [a2, b2] = par()
      itens.push({ nome: `Tabata 1: ${a1.nome} / ${b1.nome}`, det: '8 séries de 20s faz / 10s descansa (4 min).' })
      itens.push({ nome: `Tabata 2: ${a2.nome} / ${b2.nome}`, det: '8 séries de 20s faz / 10s descansa (4 min).' })
      regra = '2 tabatas'
    } else if (jogosOk.length && rand() > 0.4) {
      const j = sortear(rand, jogosOk), [a, b] = par()
      itens.push({ nome: `Jogo: ${j.nome}`, det: j.det })
      itens.push({ nome: `Tabata: ${a.nome} / ${b.nome}`, det: '4 séries de 20s faz / 10s descansa (2 min).' })
      regra = 'Jogo + mini tabata'
    } else {
      const [a, b] = par(), [c, d] = par()
      itens.push({ nome: `Tabata 1: ${a.nome} / ${b.nome}`, det: '6 séries de 20s faz / 10s descansa (3 min).' })
      itens.push({ nome: `Tabata 2: ${c.nome} / ${d.nome}`, det: '6 séries de 20s faz / 10s descansa (3 min).' })
      regra = '2 mini tabatas'
    }
    blocos.push({ id: 'aquecimento', titulo: 'Aquecimento', minutos: aquec, regra, itens })
  }

  // 3) Parte principal
  const principal = { id: 'principal', titulo: `Treino · ${FORMATOS[formato].label}`, minutos: principalMin, regra: '', itens: [], obs: regraDupla }
  const extraEscada = (e) => !e.slots.includes('escadaria')

  if (formato === 'circuito' || formato === 'escadaria') {
    const usaEscada = formato === 'escadaria' && recursos.includes('escada')
    const n = nivelCod === 'a' && principalMin >= 20 ? 6 : 5
    const trab = nivelCod === 'a' ? 45 : 40, desc = nivelCod === 'a' ? 15 : 20
    let lista
    if (usaEscada) {
      const esc = embaralhar(rand, pool(PRINCIPAIS).filter(e => e.slots.includes('escadaria')))
      lista = esc.slice(0, n)
      const faltam = n - lista.length
      if (faltam > 0) lista = lista.concat(escolherVarios(FOCOS[foco].receita.slice(0, faltam), extraEscada))
    } else {
      lista = exerciciosPrincipais(n, extraEscada)
    }
    lista.forEach(e => usados.add(e.nome))
    const rounds = Math.max(3, Math.min(6, Math.round((principalMin * 60) / (n * (trab + desc)))))
    principal.regra = `${rounds} rounds · ${trab}s faz / ${desc}s troca · ${lista.length} exercícios`
    principal.itens = lista.map(e => item(e))
    if (usaEscada) principal.obs = ['Na escada: sobe com o exercício e desce andando com cuidado. Respeite o espaçamento entre alunos.', regraDupla].filter(Boolean).join(' ')
  } else if (formato === 'estacoes') {
    const grupos = Math.max(1, Math.ceil(alunos / grupoTam))
    const k = Math.max(3, Math.min(6, grupos))
    const voltas = principalMin >= 22 ? 2 : 1
    const trabalho = Math.max(30, Math.round((principalMin * 60) / (k * voltas)) - 20)
    const lista = exerciciosPrincipais(k, extraEscada)
    principal.regra = `${k} estações · ${voltas} volta(s) · ${fmtSeg(trabalho)} em cada + 20s de troca`
    principal.itens = lista.map((e, i) => item(e, { prefixo: `Estação ${i + 1}` }))
    principal.obs = [`${grupos} grupo(s) de ${grupoTam === 1 ? '1 pessoa' : grupoTam + ' pessoas'}.`, grupos < k ? 'Há mais estações que grupos: deixe algumas livres ou pule.' : '', regraDupla].filter(Boolean).join(' ')
  } else if (formato === 'tabata') {
    const qtd = Math.max(3, Math.min(5, Math.floor(principalMin / 5)))
    const itens = []
    const receita = FOCOS[foco].receita
    for (let i = 0; i < qtd; i++) {
      const slotA = receita[(i * 2) % receita.length], slotB = receita[(i * 2 + 1) % receita.length]
      const a = escolher(slotA, PRINCIPAIS, extraEscada) ?? escolher('cardio', PRINCIPAIS, extraEscada)
      const b = escolher(slotB, PRINCIPAIS, extraEscada) ?? escolher('core', PRINCIPAIS, extraEscada)
      if (a && b) itens.push({ nome: `Tabata ${i + 1}: ${a.nome} / ${b.nome}`, det: '8 séries de 20s faz / 10s descansa, alternando os dois. Depois 1 min de pausa.', dupla: a.d || b.d })
    }
    principal.regra = `${itens.length} tabatas · 20s faz / 10s descansa · 4 min cada + 1 min de pausa`
    principal.itens = itens
  } else if (formato === 'escada') {
    const lista = exerciciosPrincipais(3, extraEscada)
    const desc = rand() > 0.5
    principal.regra = desc
      ? `Escada 10-9-8-7-6-5-4-3-2-1 de cada exercício · 30s de prancha entre os rounds · limite ${principalMin} min`
      : `Escada 20-16-12-8-4 de cada exercício · limite ${principalMin} min`
    principal.itens = lista.map(e => item(e))
  } else if (formato === 'amrap') {
    const lista = exerciciosPrincipais(3, extraEscada, ['pernas_bi', 'core', 'cardio'])
    const base = nivelCod === 'a' ? [15, 20, 12] : [10, 15, 10]
    principal.regra = `AMRAP ${principalMin} min · o máximo de rounds possíveis`
    principal.itens = lista.map((e, i) => item(e, { reps: e.slots.includes('isometria') ? '30s' : `${base[i]} reps` }))
    principal.obs = ['Anote os rounds completos. Descanse só quando precisar.', regraDupla].filter(Boolean).join(' ')
  } else if (formato === 'emom') {
    const lista = exerciciosPrincipais(3, extraEscada)
    const ciclos = Math.max(3, Math.floor(principalMin / 3))
    principal.regra = `EMOM ${ciclos * 3} min · a cada minuto muda o exercício`
    principal.itens = lista.map((e, i) => item(e, { prefixo: `Minuto ${i + 1}`, reps: e.slots.includes('isometria') ? '40s' : e.slots.includes('corrida') ? '1 ida e volta' : nivelCod === 'a' ? '15 reps' : '12 reps' }))
    principal.obs = 'O que sobrar do minuto é descanso. Repita a sequência de 3 minutos.'
  } else if (formato === 'fortime') {
    const lista = exerciciosPrincipais(4, extraEscada, ['pernas_bi', 'empurrar', 'core', 'cardio'])
    const base = nivelCod === 'a' ? [20, 15, 20, 10] : [15, 10, 15, 10]
    const rounds = nivelCod === 'a' ? 4 : 3
    principal.regra = `${rounds} rounds for time · limite ${principalMin} min`
    principal.itens = lista.map((e, i) => item(e, { reps: `${base[i]} reps` }))
    principal.obs = ['Anote o tempo final de cada aluno.', regraDupla].filter(Boolean).join(' ')
  } else if (formato === 'mobilidade') {
    const mobs = embaralhar(rand, pool(MOBILIDADE)).slice(0, 5)
    const cores = escolherVarios(['isometria', 'core', 'isometria'], extraEscada)
    const alos = embaralhar(rand, pool(ALONGAMENTO)).slice(0, 3)
    const todos = [...mobs.map(e => item(e)), ...cores.map(e => item(e)), ...alos.map(e => item(e))]
    const voltas = 2
    const seg = Math.max(30, Math.round((principalMin * 60) / (todos.length * voltas) / 5) * 5)
    principal.regra = `Fluxo contínuo · ${todos.length} posições · ${seg}s cada · ${voltas} voltas · movimentos lentos e controlados`
    principal.itens = todos
    principal.obs = 'Sem impacto: respire fundo e respeite o limite de cada articulação.'
  } else { // livre
    const n = principalMin >= 20 ? 7 : 6
    const lista = exerciciosPrincipais(n, extraEscada)
    principal.regra = `3 rounds · ${nivelCod === 'a' ? '15 a 20' : '12 a 15'} reps · 30s de pausa entre os rounds`
    principal.itens = lista.map(e => item(e, { reps: repsDe(e) }))
  }
  blocos.push(principal)
  if (modelo) aplicarModelo(blocos, modelo, recursos)

  // 4) Alongamento / volta à calma
  {
    const sel = embaralhar(rand, pool(ALONGAMENTO)).slice(0, calma >= 4 ? 5 : 4)
    blocos.push({ id: 'calma', titulo: 'Volta à calma', minutos: calma, regra: `${sel.length} alongamentos · 30 a 40s cada`, itens: sel.map(e => item(e)) })
  }

  return {
    titulo: modelo ? `Dia ${modelo.dia} · ${modelo.nome}` : `${sortear(rand, NOMES[foco] ?? ['TREINO'])} — ${FOCOS[foco].label}`,
    config: { formato, foco, nivel, alunos, organizacao, duracao, recursos, semente, baixoImpacto, modeloId: modelo?.id ?? null },
    blocos,
  }
}

// Texto pronto para colar no WhatsApp
export function textoWhatsApp(t) {
  const c = t.config
  const linhas = [`*${t.titulo}*`, `${FORMATOS[c.formato].label} · ${c.duracao} min · ${ORGANIZACOES[c.organizacao]}`, '']
  for (const b of t.blocos) {
    linhas.push(`*${b.titulo.toUpperCase()}* (${b.minutos} min)`)
    if (b.regra) linhas.push(`_${b.regra}_`)
    b.itens.forEach((i, k) => linhas.push(`${i.prefixo ? i.prefixo + ': ' : `${k + 1}. `}${i.nome}${i.reps ? ` — ${i.reps}` : ''}`))
    if (b.obs) linhas.push(`⚠️ ${b.obs}`)
    linhas.push('')
  }
  return linhas.join('\n').trim()
}

// Exercícios que podem substituir um item (mesmo "papel", só com o material do polo, sem repetir)
export function alternativasPara(treino, blocoId, idx) {
  const c = treino.config
  const bloco = treino.blocos.find(b => b.id === blocoId)
  const it = bloco?.itens[idx]
  if (!it?.slots) return []
  const lista = blocoId === 'mobilidade' ? MOBILIDADE : blocoId === 'calma' ? ALONGAMENTO : PRINCIPAIS
  const jaUsados = new Set(treino.blocos.flatMap(b => b.itens.map(i => i.nome)))
  const nivelCod = c.nivel === 'a' ? 'a' : 'i'
  return lista.filter(e =>
    temRecursos(e, c.recursos) && nivelOk(e, nivelCod) && !jaUsados.has(e.nome) && e.slots.some(s => it.slots.includes(s)))
}

// Devolve uma cópia do treino com o item trocado (ou removido, se novo = null)
export function trocarItem(treino, blocoId, idx, novo) {
  return {
    ...treino,
    blocos: treino.blocos.map(b => {
      if (b.id !== blocoId) return b
      const itens = [...b.itens]
      if (novo) itens[idx] = { ...itens[idx], nome: novo.nome, det: novo.det, dupla: novo.d, slots: novo.slots }
      else itens.splice(idx, 1)
      return { ...b, itens }
    }),
  }
}

// Monta os blocos de um "treino pronto": usa a mobilidade/aquecimento do modelo (se tiver) e a parte principal dele.
// Se faltar um corda/bola etc., troca o exercício pelo substituto indicado no modelo.
function aplicarModelo(blocos, modelo, recursos) {
  const trocar = (nome) => {
    for (const t of modelo.trocas ?? []) if (nome.includes(t.de) && !recursos.includes(t.precisa)) return nome.replace(t.de, t.para)
    return nome
  }
  const paraItens = (lista) => lista.map(x => (typeof x === 'string' ? { nome: trocar(x) } : { ...x, nome: trocar(x.nome) }))
  const i = (id) => blocos.findIndex(b => b.id === id)
  if (modelo.mobilidade) blocos[i('mobilidade')] = { ...blocos[i('mobilidade')], regra: modelo.mobilidadeRegra ?? '', itens: paraItens(modelo.mobilidade) }
  if (modelo.aquecimento) blocos[i('aquecimento')] = { ...blocos[i('aquecimento')], regra: modelo.aquecimentoRegra ?? '', itens: paraItens(modelo.aquecimento) }
  const pr = modelo.principal
  const idx = i('principal')
  blocos[idx] = {
    ...blocos[idx], titulo: pr.titulo ?? blocos[idx].titulo, minutos: pr.minutos ?? blocos[idx].minutos,
    regra: pr.regra ?? '', itens: paraItens(pr.itens), obs: [pr.obs, ...(modelo.trocas ?? []).filter(t => !recursos.includes(t.precisa)).map(t => `Sem ${t.precisa}: ${t.de} → ${t.para}.`)].filter(Boolean).join(' '),
  }
}

// Modo automático: quando formato, foco ou organização estão em "auto", o sistema escolhe.
// Varia a rotina: prefere o que foi usado há MAIS tempo (historico[0] = o mais recente).
export function resolverAutomatico(cfg, historico = []) {
  const { alunos = 8, recursos = [], baixoImpacto = false } = cfg
  const out = { formato: cfg.formato, foco: cfg.foco, organizacao: cfg.organizacao, automatico: [] }
  const idade = (campo, valor) => { const i = historico.findIndex(h => h[campo] === valor); return i === -1 ? 99 : i }
  const maisAntigo = (opcoes, campo) => {
    const max = Math.max(...opcoes.map(o => idade(campo, o)))
    const melhores = opcoes.filter(o => idade(campo, o) === max)
    return melhores[Math.floor(Math.random() * melhores.length)]
  }
  if (cfg.foco === 'auto') { out.foco = maisAntigo(Object.keys(FOCOS), 'foco'); out.automatico.push('foco') }
  if (cfg.formato === 'auto') {
    const candidatos = Object.keys(FORMATOS).filter(k => k !== 'mobilidade' && (k !== 'escadaria' || recursos.includes('escada')))
    const ultimaMob = historico.findIndex(h => h.formato === 'mobilidade')
    // aula só de mobilidade: de vez em quando (mais frequente se for "sem impacto")
    const sorteiaMob = baixoImpacto ? Math.random() < 0.3 : (Math.random() < 0.12 && (ultimaMob === -1 || ultimaMob > 5))
    out.formato = sorteiaMob ? 'mobilidade' : maisAntigo(candidatos, 'formato')
    out.automatico.push('formato')
  }
  if (cfg.organizacao === 'auto') {
    const ultima = historico[0]?.organizacao
    const pesos = [['individual', 5]]
    if (alunos >= 4) pesos.push(['duplas', 4])
    if (alunos >= 6) pesos.push(['trios', 2])
    const ajustados = pesos.map(([k, p]) => [k, k === ultima ? Math.max(1, p - 3) : p])
    let r = Math.random() * ajustados.reduce((t, [, p]) => t + p, 0)
    out.organizacao = ajustados.find(([, p]) => (r -= p) < 0)?.[0] ?? 'individual'
    out.automatico.push('organizacao')
  }
  return out
}
