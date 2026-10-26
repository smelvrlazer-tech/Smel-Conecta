// src/lib/treino/modelos.js
// Treinos prontos do professor (34 dias), classificados pelo quanto vieram completos:
//   tipo 'completo' — veio com mobilidade + aquecimento + treino principal (usado como está)
//   tipo 'quase'    — faltava um pedaço (ex.: mobilidade); o sistema completa automaticamente
//   tipo 'wod'      — só a parte principal; mobilidade, aquecimento e alongamento são gerados
//   tipo 'ajustado' — veio sem regras de tempo/rounds: o sistema completou com valores sugeridos (conferir)
//
// recursos: o que o treino precisa para rodar como foi escrito (a "trocas" cobre o que pode ser substituído)

const tab = (n, a, b, serie = '8 séries de 20s faz / 10s descansa (4 min)') => ({ nome: `Tabata ${n}: ${a} / ${b}`, det: serie })
const WOD = (titulo, regra, itens, extra = {}) => ({ titulo, regra, itens, ...extra })

const TROCA_DU = { de: 'Double Unders (DU)', para: 'Polichinelo (2 por Double Under)', precisa: 'corda' }
const TROCA_THRUSTER = { de: 'Thruster (mochila com pesos)', para: 'Thruster com bastão (agacha e empurra o bastão acima da cabeça)', precisa: 'mochila' }

export const MODELOS = [
  // ───────────── COMPLETOS (mobilidade + aquecimento + principal) ─────────────
  {
    id: 'd1', dia: 1, nome: 'The Arena', foco: 'Pernas e core', tipo: 'completo', formato: 'circuito', recursos: ['quadra', 'arquibancada'],
    mobilidade: ['Rotação de tronco', 'Toque no pé + overhead', 'Cócoras (deep squat)', 'Giro de ombros'], mobilidadeRegra: '4 movimentos · 10 min',
    aquecimento: [tab(1, 'Air squat', 'Polichinelo'), tab(2, 'Prancha com toque no ombro', 'Joelhos altos')], aquecimentoRegra: '2 tabatas · 8 min',
    principal: WOD('Treino · Circuito', '5 rounds · 40s faz / 20s troca', ['Corrida suicida (shuttle run)', 'Box jump ou step-up na arquibancada', 'Mergulho de tríceps', 'Jump squats', 'Skater jumps'], { minutos: 25 }),
  },
  {
    id: 'd2', dia: 2, nome: 'Elevate', foco: 'Cardio e pernas', tipo: 'completo', formato: 'circuito', recursos: ['quadra', 'arquibancada'],
    mobilidade: ['Cócoras', 'Pêndulo de perna', 'Chute Frankenstein', 'Giro de tronco'], mobilidadeRegra: '4 movimentos · 10 min',
    aquecimento: [tab(1, 'Joelhos altos', 'Air squat rápido'), tab(2, 'Abdominal lateral em pé', 'Tesoura')], aquecimentoRegra: '2 tabatas · 8 min',
    principal: WOD('Treino · Circuito', '5 rounds · 40s faz / 20s troca', ['Sprint na quadra', 'Agachamento búlgaro', 'Step-up na arquibancada', 'Joelhada explosiva (knee drive)', 'Squat jacks (agacha abre e fecha)'], { minutos: 25 }),
  },
  {
    id: 'd3', dia: 3, nome: 'Court Agility', foco: 'Agilidade', tipo: 'completo', formato: 'circuito', recursos: ['quadra'],
    mobilidade: ['Bom dia com rotação', 'Cossack squat', 'Puxada de joelho', 'Abraço de urso'], mobilidadeRegra: '4 movimentos · 10 min',
    aquecimento: [tab(1, 'Deslocamento lateral', 'Calcanhar no glúteo'), tab(2, 'Agachamento isométrico com socos', 'Ski jumps')], aquecimentoRegra: '2 tabatas · 8 min',
    principal: WOD('Treino · Circuito', '5 rounds · 40s faz / 20s troca', ['Patinador (skater jumps)', 'Agachamento prisioneiro', 'Pés rápidos (fast feet)', 'Agachamento sumô', 'Deslocamento defensivo longo'], { minutos: 25 }),
  },
  {
    id: 'd4', dia: 4, nome: 'Leg Day & Core', foco: 'Pernas e core', tipo: 'completo', formato: 'circuito', recursos: ['quadra', 'arquibancada'],
    mobilidade: ['Rotação de quadril', 'Panturrilha no degrau', 'Bom dia em "Y"', 'Rotação de ombros'], mobilidadeRegra: '4 movimentos · 10 min',
    aquecimento: [tab(1, 'Trote frente e costas', 'Agachamento pulsante'), tab(2, 'Squat jacks', 'Pés rápidos')], aquecimentoRegra: '2 tabatas · 8 min',
    principal: WOD('Treino · Circuito', '5 rounds · 40s faz / 20s troca', ['Sprints curtos (tiros na quadra)', 'Step-up na arquibancada', 'Agachamento búlgaro na arquibancada', 'Pular corda (ou agachamento isométrico)', 'Abdominal em pé (joelhada cruzada explosiva)'], { minutos: 25 }),
  },
  {
    id: 'd5', dia: 5, nome: 'Duplas "Sinergia"', foco: 'Duplas com bastão', tipo: 'completo', formato: 'circuito', recursos: ['bastao', 'arquibancada'], dupla: true,
    mobilidade: ['Passagem de bastão', 'Helicóptero', 'Bom dia com bastão', 'Agachamento overhead'], mobilidadeRegra: '4 movimentos · 10 min',
    aquecimento: [{ nome: 'Jogo "Pega o bastão"', det: 'Duplas em círculo; ao sinal, soltam o bastão e pegam o do colega antes de cair.' }, { nome: 'Desafio overhead "Iso e reps"', det: 'Bastão acima da cabeça: 20s de isometria, depois 10 agachamentos.' }], aquecimentoRegra: 'Jogo + desafio · 8 min',
    principal: WOD('Treino · Duplas', '5 rounds · 40s faz / 20s troca', ['Afundo reverso sincronizado', 'Cadeira humana (costas com costas)', 'Roda gigante (agachamento e giro sincronizado)', 'Subida step-up "I go, you go"', 'Rotação russa em pé (passando o bastão)'], { minutos: 25, obs: 'Em duplas: enquanto um faz, o outro descansa.' }),
  },
  {
    id: 'd6', dia: 6, nome: 'Max Effort', foco: 'Esforço máximo', tipo: 'completo', formato: 'circuito', recursos: ['quadra', 'arquibancada'],
    mobilidade: ['Giro de tronco com alcance', 'Bom dia dinâmico', 'Pêndulo frontal de perna', 'Rotação de ombros'], mobilidadeRegra: '4 movimentos · 10 min',
    aquecimento: [{ nome: 'Jogo "Bússola" (4 min)', det: 'O professor grita um ponto cardeal; todos correm até aquele lado da quadra e fazem 5 agachamentos.' }, { nome: 'AMRAP 4 min', det: '10 agachamentos sumô + 10 moinhos de vento, o máximo de rounds.' }], aquecimentoRegra: 'Jogo + AMRAP · 8 min',
    principal: WOD('Treino · Sem descanso', '5 rounds · 60s direto em cada exercício, sem descanso', ['Sprints contínuos na quadra', 'Step-up na arquibancada', 'Agachamento com salto', 'Abdominal bicicleta em pé', 'Skier swings (balanço do esquiador)'], { minutos: 25 }),
  },
  {
    id: 'd8', dia: 8, nome: 'Circuito Combo', foco: 'Corpo todo', tipo: 'completo', formato: 'circuito', recursos: [],
    mobilidade: ['Giro de tronco', 'Afundo lateral', 'Puxada de joelho', 'Rotação de ombros'], mobilidadeRegra: '4 movimentos · 10 min',
    aquecimento: [{ nome: 'Siga o mestre', det: 'Trota e congela na cadeirinha ao sinal.' }, tab(1, 'Pés rápidos', 'Polichinelo')], aquecimentoRegra: 'Jogo + tabata · 8 min',
    principal: WOD('Treino · Circuito', '5 rounds · 45s faz / 15s troca', ['Polisapato', 'Combo: 1 avanço + 1 agachamento', 'Sprawl (meio burpee)', 'Froggers (saltos de rã)', 'Prancha alta com toque nos ombros'], { minutos: 25 }),
  },

  // ───────────── QUASE COMPLETO (faltava mobilidade) ─────────────
  {
    id: 'd7', dia: 7, nome: 'Duplas "For Time"', foco: 'Duplas — para o tempo', tipo: 'quase', formato: 'fortime', recursos: ['quadra'], dupla: true,
    aquecimento: [{ nome: '"I go, you go"', det: '10 polichinelos + cadeirinha na parede, um de cada vez.' }, { nome: 'Ensaio', det: '1 sprint, 4 agachamentos, 2 burpees.' }], aquecimentoRegra: '8 min',
    principal: WOD('Treino · For time em duplas', '4 rounds o mais rápido possível · todo minuto ímpar: 30s de prancha juntas',
      ['2 sprints (ida e volta, correm juntas)', '40 polichinelos (dividem as reps)', '2 sprints (juntas)', '30 agachamentos (dividem as reps)', '2 sprints (juntas)', '20 burpees (dividem as reps)', '2 sprints (juntas)', '10 afundos (dividem as reps)'], { minutos: 25 }),
  },

  // ───────────── AJUSTADOS (vieram sem tempos/regras: o sistema completou) ─────────────
  {
    id: 'd9', dia: 9, nome: 'Circuito Rápido 1', foco: 'Core e agilidade', tipo: 'ajustado', formato: 'circuito', recursos: ['quadra', 'colchonete'],
    aquecimento: ['Pés rápidos', 'Polisapato', 'Corrida de meia quadra', 'Agachamento livre', 'Prancha', 'Abdominal supra'], aquecimentoRegra: '30s cada · 2 voltas',
    principal: WOD('Treino · Circuito', '4 rounds · 40s faz / 20s troca (regra sugerida)', ['Abdominal remador', 'Corrida lateral com toque no chão', 'Abdominal toque no calcanhar', 'Avanço com agachamento', 'Prancha com toque no ombro'], { minutos: 20 }),
  },
  {
    id: 'd10', dia: 10, nome: 'Circuito Rápido 2', foco: 'Corpo todo', tipo: 'ajustado', formato: 'circuito', recursos: ['quadra', 'colchonete'],
    aquecimento: [tab(1, 'Trote frente e costas', 'Agachamento pulsante', '6 séries de 20s faz / 10s descansa (3 min)'), tab(2, 'Agachamento abre e fecha', 'Pés rápidos', '6 séries de 20s faz / 10s descansa (3 min)')], aquecimentoRegra: '2 tabatas curtas',
    principal: WOD('Treino · Circuito', '4 rounds · 40s faz / 20s troca (regra sugerida)', ['Corrida', 'Prancha', 'Flexão', 'Abdominal remador', 'Rotação russa'], { minutos: 20 }),
  },
  {
    id: 'd11', dia: 11, nome: 'Circuito Rápido 3', foco: 'Corpo todo', tipo: 'ajustado', formato: 'livre', recursos: ['colchonete'],
    principal: WOD('Treino · Sequência contínua', '3 rounds · 12 a 15 reps (ou 40s) · 30s de pausa entre os rounds (regra sugerida)',
      ['Cadeirinha + polisapato', 'Agachamento abre e fecha + joelhos altos', 'Avanço + agachamento', 'Prancha com extensão de braço e perna trocados', 'Agachamento + elevação de joelho unilateral', 'Abdominal supra', 'Burpee'], { minutos: 22 }),
  },
  {
    id: 'd12', dia: 12, nome: 'Circuito Rápido 4', foco: 'Pernas e cardio', tipo: 'ajustado', formato: 'estacoes', recursos: [],
    principal: WOD('Treino · 5 estações', '2 voltas · 90s em cada estação + 20s de troca (regra sugerida)',
      ['Estação 1: Agachamento + elevação de joelho', 'Estação 2: Agachamento livre', 'Estação 3: Polichinelo', 'Estação 4: Agachamento sumô', 'Estação 5: Polisapato'], { minutos: 20 }),
  },

  // ───────────── SÓ A PARTE PRINCIPAL (WODs) ─────────────
  { id: 'd13', dia: 13, nome: 'For Time — Benchmark 1', foco: 'Corpo todo', tipo: 'wod', formato: 'fortime', recursos: ['colchonete'], principal: WOD('Treino · For time', 'O mais rápido possível · limite 15 min', ['20 sit-ups', '10 flexões', '15 burpees', '20 agachamentos livres'], { minutos: 15 }) },
  { id: 'd14', dia: 14, nome: '6 Rounds For Time', foco: 'Corpo todo', tipo: 'wod', formato: 'fortime', recursos: ['quadra'], principal: WOD('Treino · For time', '6 rounds o mais rápido possível', ['24 agachamentos livres', '24 flexões', '24 afundos', '400m de corrida (ou 24 burpees)'], { minutos: 25 }) },
  { id: 'd15', dia: 15, nome: 'Escada 10 a 1', foco: 'Core e explosão', tipo: 'wod', formato: 'escada', recursos: ['colchonete'], principal: WOD('Treino · Escada', '10-9-8-7-6-5-4-3-2-1 repetições · 30s de prancha entre cada round', ['Tuck jumps', 'V-ups', 'Superman'], { minutos: 18 }) },
  { id: 'd16', dia: 16, nome: 'Escada Dupla', foco: 'Cardio e core', tipo: 'wod', formato: 'escada', recursos: ['corda', 'colchonete'], trocas: [TROCA_DU], principal: WOD('Treino · Escada', '50-40-30-20-10 repetições de cada', ['Double Unders (DU)', 'Sit-ups'], { minutos: 15 }) },
  { id: 'd17', dia: 17, nome: '5 Rounds For Time', foco: 'Corpo todo', tipo: 'wod', formato: 'fortime', recursos: [], principal: WOD('Treino · For time', '5 rounds o mais rápido possível', ['10 flexões', '15 burpees', '20 agachamentos livres'], { minutos: 15 }) },
  { id: 'd18', dia: 18, nome: 'EMOM 16 minutos', foco: 'Corrida e burpees', tipo: 'wod', formato: 'emom', recursos: ['quadra'], principal: WOD('Treino · EMOM', 'A cada 2 minutos, por 16 minutos (8 rounds)', ['Corrida 200m', 'Máximo de burpees no tempo que sobrar (pode trocar por agachamentos, v-ups, afundos ou flexões)'], { minutos: 16 }) },
  { id: 'd19', dia: 19, nome: 'Desafio dos 100', foco: 'Resistência', tipo: 'wod', formato: 'fortime', recursos: ['colchonete'], principal: WOD('Treino · For time', 'O mais rápido possível (divida as séries como precisar)', ['100 afundos', '100 sit-ups', '100 agachamentos livres', '100 flexões', '100 afundos'], { minutos: 25 }) },
  { id: 'd20', dia: 20, nome: 'Escada 20 a 4', foco: 'Força', tipo: 'wod', formato: 'escada', recursos: ['parede'], principal: WOD('Treino · Escada', '20-16-12-8-4 repetições de cada', ['Flexões', 'Pistols (assistido na parede)'], { minutos: 15 }) },
  { id: 'd21', dia: 21, nome: '10 Rounds For Time', foco: 'Corpo todo', tipo: 'wod', formato: 'fortime', recursos: [], principal: WOD('Treino · For time', '10 rounds o mais rápido possível', ['10 flexões', '10 agachamentos livres', '10 burpees'], { minutos: 20 }) },
  { id: 'd22', dia: 22, nome: 'Fran adaptado', foco: 'Força e cardio', tipo: 'wod', formato: 'escada', recursos: ['bastao'], trocas: [TROCA_THRUSTER], principal: WOD('Treino · Escada', '21-15-9 repetições de cada', ['Thruster (mochila com pesos)', 'Flexões'], { minutos: 12 }) },
  { id: 'd23', dia: 23, nome: 'Core Isométrico', foco: 'Core', tipo: 'wod', formato: 'circuito', recursos: ['colchonete'], principal: WOD('Treino · Core', '5 rounds', ['20s parada de mão na parede (ou pike hold)', '40s prancha', '20s hollow hold (canoa)'], { minutos: 12 }) },
  { id: 'd24', dia: 24, nome: 'Annie adaptado', foco: 'Cardio e core', tipo: 'wod', formato: 'escada', recursos: [], principal: WOD('Treino · Escada', '100-80-60-40-20 repetições de cada', ['Polichinelo', 'Mountain climbers'], { minutos: 15 }) },
  { id: 'd25', dia: 25, nome: 'Pirâmide Mista', foco: 'Corpo todo', tipo: 'wod', formato: 'fortime', recursos: ['corda', 'colchonete'], trocas: [TROCA_DU], principal: WOD('Treino · For time', 'O mais rápido possível, na ordem', ['100 Double Unders (DU)', '80 agachamentos livres', '60 sit-ups', '40 flexões', '20 burpees', '100 Double Unders (DU)'], { minutos: 25 }) },
  { id: 'd26', dia: 26, nome: 'AMRAP 15 minutos', foco: 'Resistência', tipo: 'wod', formato: 'amrap', recursos: ['corda'], trocas: [TROCA_DU], principal: WOD('Treino · AMRAP', 'O máximo de rounds possíveis em 15 minutos', ['20 afundos', '20 Double Unders (DU)', '45s de prancha'], { minutos: 15 }) },
  { id: 'd27', dia: 27, nome: 'Tabata Time', foco: 'Cardio e core', tipo: 'wod', formato: 'tabata', recursos: ['corda', 'colchonete'], trocas: [TROCA_DU], principal: WOD('Treino · Tabata', '3 tabatas · 20s faz / 10s descansa · 1 min de pausa entre elas', ['Tabata 1: revezar sit-ups e Double Unders (DU)', 'Tabata 2: revezar polichinelo e mountain climbers', 'Tabata 3: hollow rock'], { minutos: 15 }) },
  { id: 'd28', dia: 28, nome: 'Death by Burpees & Lunges', foco: 'Resistência', tipo: 'wod', formato: 'amrap', recursos: [], principal: WOD('Treino · Progressivo', 'A cada janela de 3 minutos (2 rounds), aumenta 2 repetições até falhar', ['0:00–3:00: 10 burpees / 10 afundos com salto', '3:00–6:00: 12 burpees / 12 afundos com salto', '6:00–9:00: 14 burpees / 14 afundos com salto', 'Continue aumentando 2 reps a cada 3 minutos até falhar'], { minutos: 18 }) },
  { id: 'd29', dia: 29, nome: 'Escada Longa de Pares', foco: 'Corpo todo', tipo: 'wod', formato: 'escada', recursos: ['corda', 'colchonete'], trocas: [TROCA_DU], principal: WOD('Treino · Escada', '20-18-16-14-12-10-8-6-4-2 repetições', ['Agachamentos livres', 'Flexões', 'Sit-ups (multiplique por 3 a cada round)', 'Double Unders (DU) (multiplique por 5 a cada round)'], { minutos: 22 }) },
  { id: 'd30', dia: 30, nome: 'WOD Sam Briggs', foco: 'Resistência', tipo: 'wod', formato: 'fortime', recursos: ['corda', 'quadra'], trocas: [TROCA_DU], principal: WOD('Treino · For time', '5 rounds o mais rápido possível', ['60 Double Unders (DU)', '50 agachamentos livres', '40 afundos caminhando', '30 afundos com salto', '20 agachamentos com salto', '10 pistols (adaptado: agachamento goblet segurando um objeto pesado)'], { minutos: 25 }) },
  { id: 'd31', dia: 31, nome: 'Wallball & Step-up', foco: 'Pernas', tipo: 'wod', formato: 'fortime', recursos: ['arquibancada', 'bastao'], trocas: [{ de: 'Wallball (ou thruster)', para: 'Thruster com bastão', precisa: 'bola' }], principal: WOD('Treino · Sequência única', 'O mais rápido possível, na ordem', ['50 Wallball (ou thruster)', '50 step-ups', '50 Wallball (ou thruster)', '50 step-ups', '50 Wallball (ou thruster)'], { minutos: 25 }) },
  { id: 'd32', dia: 32, nome: 'V-up Lateral EMOM', foco: 'Core', tipo: 'wod', formato: 'emom', recursos: ['colchonete'], principal: WOD('Treino · EMOM 2 min', 'Repetir o ciclo por 12 a 16 minutos', ['Minuto 1: 20 V-ups para o lado direito', 'Minuto 2: 20 V-ups para o lado esquerdo'], { minutos: 14 }) },

  // ───────────── RASCUNHOS (completados pelo sistema) ─────────────
  {
    id: 'd33', dia: 33, nome: 'Core completo', foco: 'Core', tipo: 'ajustado', formato: 'circuito', recursos: ['colchonete'],
    principal: WOD('Treino · Core em 2 partes', 'Parte 1: 3 séries de 15 · Parte 2: 5 rounds',
      ['Parte 1 (3×15): canoinha', 'Parte 1 (3×15): superman', 'Parte 1 (3×15): canoinha invertida', 'Parte 2 (5 rounds): 20 abdominais remador', 'Parte 2: 20s de prancha lateral em cada lado', 'Parte 2: 20 apoios de frente', 'Parte 2: 20 risings', 'Parte 2: 20 V-ups'], { minutos: 22 }),
  },
  {
    id: 'd34', dia: 34, nome: 'Man Maker + Quadra', foco: 'Corpo todo', tipo: 'ajustado', formato: 'fortime', recursos: ['quadra'],
    principal: WOD('Treino · 3 partes', 'Parte 1: 10 man makers · Parte 2: 2 rounds · Parte 3: 5 rounds',
      ['Parte 1: 10 man makers (burpee + flexão + remada unilateral + thruster)', 'Parte 2 (2 rounds): 10 afundos overhead', 'Parte 2: 15 flexões', 'Parte 2: 30 skippings', 'Parte 3 (5 rounds): 3 idas e voltas na quadra', 'Parte 3: 30 agachamentos', 'Parte 3: 15 burpees'], { minutos: 25 }),
  },
]

export const TIPOS_MODELO = {
  completo: { label: 'Completo', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dica: 'Veio com mobilidade, aquecimento e treino.' },
  quase: { label: 'Quase completo', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300', dica: 'Faltava um pedaço; o sistema completou.' },
  wod: { label: 'Só o treino', cls: 'bg-slate-200 text-slate-600 dark:bg-navy-600 dark:text-slate-300', dica: 'Mobilidade, aquecimento e alongamento são gerados.' },
  ajustado: { label: 'Completado pelo sistema', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dica: 'Faltavam regras (tempo/rounds); conferir os valores sugeridos.' },
}
