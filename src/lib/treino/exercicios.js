// src/lib/treino/exercicios.js
// Biblioteca de exercícios do gerador de treino funcional.
// Piloto: Polo Água Limpa. Base: os treinos de exemplo do professor + variações novas.
//
// Campos:
//   nome     texto mostrado ao aluno
//   slots    "papel" do exercício no treino (usado pelo gerador para montar circuitos equilibrados)
//   r        recursos NECESSÁRIOS (todos precisam estar disponíveis): quadra, arquibancada, escada,
//            colchonete, bastao, corda, parede
//   n        níveis: 'i' intermediário, 'a' avançado, 'ia' ambos
//   imp      impacto: 'alto' | 'baixo'
//   d        true = exercício feito EM DUPLA (um com o outro)
//   det      como executar (uma linha)

export const RECURSOS = {
  quadra:      'Quadra',
  arquibancada:'Arquibancada (vira step)',
  escada:      'Escada',
  colchonete:  'Colchonete',
  bastao:      'Bastão de PVC',
  corda:       'Corda de pular',
  parede:      'Parede',
}

// padrão do polo Água Limpa (o professor ajusta na hora de gerar)
export const RECURSOS_AGUA_LIMPA = ['quadra', 'arquibancada', 'escada', 'colchonete', 'bastao', 'parede']

const ex = (nome, slots, o = {}) => ({
  nome, slots, r: o.r ?? [], n: o.n ?? 'ia', imp: o.imp ?? 'baixo', d: !!o.d, det: o.det ?? '',
})

// ─── Exercícios principais ──────────────────────────────────────────────────
export const PRINCIPAIS = [
  // Pernas — bilateral
  ex('Agachamento livre', ['pernas_bi'], { det: 'Pés na largura dos ombros, desce até as coxas ficarem paralelas ao chão.' }),
  ex('Agachamento sumô', ['pernas_bi'], { det: 'Pés bem abertos, pontas para fora, tronco ereto.' }),
  ex('Agachamento prisioneiro', ['pernas_bi'], { det: 'Mãos atrás da cabeça, cotovelos abertos.' }),
  ex('Agachamento pulsante', ['pernas_bi'], { det: 'Fica embaixo e faz pulsos curtos, sem subir por completo.' }),
  ex('Agachamento isométrico (cadeirinha)', ['pernas_bi', 'core'], { r: ['parede'], det: 'Costas na parede, joelhos a 90°, segura o tempo.' }),
  ex('Agachamento com salto', ['pernas_bi', 'pliometria'], { imp: 'alto', det: 'Desce e salta o mais alto possível; amortece a aterrissagem.' }),
  ex('Squat jacks (agacha abre e fecha)', ['pernas_bi', 'cardio'], { imp: 'alto', det: 'Em agachamento, salta abrindo e fechando as pernas.' }),
  ex('Agachamento com bastão overhead', ['pernas_bi'], { r: ['bastao'], det: 'Bastão esticado acima da cabeça, braços firmes, desce mantendo o peito aberto.' }),
  ex('Bom dia com bastão', ['pernas_bi'], { r: ['bastao'], det: 'Bastão nas costas, dobra o quadril levando o bumbum para trás, coluna reta.' }),
  ex('Agachamento com giro', ['pernas_bi', 'core'], { det: 'Agacha e, ao subir, gira o tronco abrindo os braços.' }),
  // Pernas — unilateral
  ex('Afundo reverso', ['pernas_uni'], { det: 'Passo grande para trás, joelho de trás quase toca o chão.' }),
  ex('Afundo alternado (avanço)', ['pernas_uni'], { det: 'Passo à frente, alterna as pernas.' }),
  ex('Afundo lateral', ['pernas_uni'], { det: 'Passo largo para o lado, senta o quadril, perna oposta esticada.' }),
  ex('Cossack squat', ['pernas_uni'], { n: 'ia', det: 'Agachamento lateral profundo, alternando os lados.' }),
  ex('Avanço + agachamento (combo)', ['pernas_uni', 'pernas_bi'], { det: '1 avanço seguido de 1 agachamento; alterna a perna do avanço.' }),
  ex('Afundo com salto', ['pernas_uni', 'pliometria'], { n: 'a', imp: 'alto', det: 'Em afundo, salta e troca as pernas no ar.' }),
  ex('Afundo caminhando', ['pernas_uni'], { r: ['quadra'], det: 'Afundos avançando pela quadra.' }),
  ex('Agachamento búlgaro', ['pernas_uni'], { r: ['arquibancada'], det: 'Pé de trás apoiado no degrau, agacha na perna da frente.' }),
  ex('Step-up na arquibancada', ['pernas_uni'], { r: ['arquibancada'], det: 'Sobe e desce do degrau, alterna a perna que comanda.' }),
  ex('Step-up com joelhada', ['pernas_uni', 'cardio'], { r: ['arquibancada'], imp: 'alto', det: 'Sobe no degrau e leva o joelho de trás à altura do quadril.' }),
  ex('Panturrilha no degrau', ['pernas_uni'], { r: ['arquibancada'], det: 'Ponta dos pés no degrau, sobe e desce o calcanhar.' }),
  ex('Ponte unilateral', ['pernas_uni', 'core'], { r: ['colchonete'], det: 'Deitado, uma perna estendida, eleva o quadril.' }),
  ex('Pistol assistido', ['pernas_uni'], { n: 'a', r: ['parede'], det: 'Agachamento numa perna só, mão na parede para equilíbrio.' }),
  ex('Agachamento unilateral (goblet com bastão)', ['pernas_uni'], { n: 'a', r: ['bastao'], det: 'Agacha numa perna segurando o bastão à frente como contrapeso.' }),

  // Pliometria / explosão
  ex('Skater jumps (patinador)', ['pliometria', 'agilidade'], { imp: 'alto', det: 'Salta de lado a lado aterrissando numa perna só.' }),
  ex('Salto na arquibancada', ['pliometria'], { r: ['arquibancada'], n: 'a', imp: 'alto', det: 'Salta com os dois pés no degrau e desce andando.' }),
  ex('Tuck jump', ['pliometria'], { n: 'a', imp: 'alto', det: 'Salta e leva os joelhos ao peito.' }),
  ex('Ski jumps', ['pliometria', 'agilidade'], { imp: 'alto', det: 'Saltos laterais com os pés juntos, como esquiador.' }),
  ex('Saltos sobre a linha da quadra', ['pliometria', 'agilidade'], { r: ['quadra'], imp: 'alto', det: 'Saltos de lado a lado e frente/trás sobre a linha.' }),
  ex('Froggers (saltos de rã)', ['pliometria', 'full'], { n: 'a', imp: 'alto', det: 'Agacha com as mãos no chão e salta os pés para fora das mãos, depois volta.' }),
  ex('Burpee', ['full', 'cardio'], { imp: 'alto', det: 'Agacha, prancha, flexão (opcional), volta e salta.' }),
  ex('Sprawl (meio burpee)', ['full', 'cardio'], { det: 'Mãos no chão, estica as pernas para trás e volta, sem salto.' }),
  ex('Burpee com salto', ['full', 'pliometria'], { n: 'a', imp: 'alto', det: 'Burpee completo terminando com salto vertical.' }),

  // Cardio / corrida
  ex('Polichinelo', ['cardio'], { imp: 'alto', det: 'Salta abrindo pernas e braços.' }),
  ex('Polisapato', ['cardio'], { imp: 'alto', det: 'Salta cruzando e abrindo as pernas, braços alternando.' }),
  ex('Joelhos altos', ['cardio'], { imp: 'alto', det: 'Corrida no lugar elevando os joelhos até o quadril.' }),
  ex('Calcanhar no glúteo', ['cardio'], { imp: 'alto', det: 'Corrida no lugar levando o calcanhar ao bumbum.' }),
  ex('Pés rápidos (fast feet)', ['cardio', 'agilidade'], { imp: 'alto', det: 'Passos muito curtos e velozes, joelhos levemente flexionados.' }),
  ex('Mountain climber', ['cardio', 'core'], { imp: 'alto', det: 'Em prancha alta, alterna joelhos ao peito rápido.' }),
  ex('Skier swings (balanço do esquiador)', ['cardio'], { det: 'Agacha jogando os braços para trás e estende braços à frente ao subir.' }),
  ex('Pular corda', ['cardio'], { r: ['corda'], imp: 'alto', det: 'Salta a corda; se não houver, agachamento isométrico.' }),
  ex('Corrida suicida (shuttle run)', ['corrida', 'cardio'], { r: ['quadra'], imp: 'alto', det: 'Corre até a linha, toca o chão e volta; vai aumentando a distância.' }),
  ex('Sprint na quadra', ['corrida', 'cardio'], { r: ['quadra'], imp: 'alto', det: 'Ida e volta na máxima velocidade.' }),
  ex('Sprints curtos (tiros)', ['corrida', 'cardio'], { r: ['quadra'], imp: 'alto', det: 'Tiros de meia quadra, volta andando.' }),
  ex('Corrida lateral com toque no chão', ['corrida', 'agilidade'], { r: ['quadra'], imp: 'alto', det: 'Desloca de lado, toca o chão a cada ponta.' }),
  ex('Deslocamento defensivo longo', ['corrida', 'agilidade'], { r: ['quadra'], det: 'Em posição de defesa, desloca lateralmente a quadra toda.' }),
  ex('Trote frente e costas', ['corrida', 'cardio'], { r: ['quadra'], det: 'Trota para frente e volta de costas.' }),

  // Core
  ex('Prancha', ['core', 'isometria'], { det: 'Antebraços no chão, corpo alinhado.' }),
  ex('Prancha com toque no ombro', ['core'], { det: 'Em prancha alta, toca o ombro oposto sem girar o quadril.' }),
  ex('Prancha alta com braço e perna trocados', ['core'], { n: 'a', det: 'Estende braço e perna opostos, alterna.' }),
  ex('Prancha lateral', ['core', 'isometria'], { det: 'De lado, apoio no antebraço, quadril alto.' }),
  ex('Prancha com abre e fecha de pernas', ['core'], { det: 'Em prancha, abre e fecha as pernas saltando.' }),
  ex('Abdominal remador', ['core'], { r: ['colchonete'], det: 'Deitado, sobe tronco e joelhos juntos abraçando as pernas.' }),
  ex('Abdominal supra', ['core'], { r: ['colchonete'], det: 'Deitado, eleva ombros do chão contraindo o abdômen.' }),
  ex('V-up', ['core'], { r: ['colchonete'], n: 'a', det: 'Eleva tronco e pernas ao mesmo tempo formando um V.' }),
  ex('Hollow hold (canoa)', ['core', 'isometria'], { r: ['colchonete'], det: 'Costas coladas no chão, braços e pernas estendidos e elevados.' }),
  ex('Superman', ['core', 'isometria'], { r: ['colchonete'], det: 'De bruços, eleva braços e pernas e segura.' }),
  ex('Canoinha invertida', ['core'], { r: ['colchonete'], det: 'De bruços, eleva o peito e as pernas balançando.' }),
  ex('Rotação russa', ['core', 'rotacao'], { r: ['colchonete'], det: 'Sentado inclinado, gira o tronco de lado a lado.' }),
  ex('Abdominal bicicleta', ['core', 'rotacao'], { r: ['colchonete'], det: 'Cotovelo ao joelho oposto, alternando.' }),
  ex('Abdominal toque no calcanhar', ['core', 'rotacao'], { r: ['colchonete'], det: 'Deitado, joelhos dobrados, toca o calcanhar de cada lado.' }),
  ex('Dead bug', ['core'], { r: ['colchonete'], det: 'Deitado, braço e perna opostos descem alternando, lombar colada.' }),
  ex('Tesoura (flutter kicks)', ['core'], { r: ['colchonete'], det: 'Pernas esticadas alternando para cima e para baixo.' }),
  ex('Elevação de pernas', ['core'], { r: ['colchonete'], n: 'a', det: 'Deitado, sobe as pernas esticadas até 90° e desce sem tocar o chão.' }),
  ex('Joelhada cruzada em pé', ['core', 'rotacao'], { imp: 'alto', det: 'Em pé, leva o joelho ao cotovelo oposto com força.' }),
  ex('Abdominal lateral em pé', ['core', 'rotacao'], { det: 'Em pé, leva o cotovelo ao joelho do mesmo lado.' }),
  ex('Abdominal bicicleta em pé', ['core', 'rotacao', 'cardio'], { det: 'Em pé, alterna cotovelo ao joelho oposto, rápido.' }),
  ex('Rotação russa em pé com bastão', ['core', 'rotacao'], { r: ['bastao'], det: 'Em pé, bastão à frente, gira o tronco de lado a lado.' }),
  ex('Abdominal com bastão overhead', ['core'], { r: ['bastao', 'colchonete'], det: 'Deitado com o bastão acima da cabeça, sobe o tronco levando o bastão aos pés.' }),
  ex('Rising (levantar do chão)', ['core', 'full'], { r: ['colchonete'], n: 'a', det: 'Deitado, levanta sem usar as mãos e volta devagar.' }),
  ex('Hollow rock', ['core'], { r: ['colchonete'], n: 'a', det: 'Em canoa, balança para frente e para trás.' }),

  // Superiores
  ex('Flexão de braço', ['empurrar'], { det: 'Prancha alta, desce o peito e empurra.' }),
  ex('Flexão na arquibancada (inclinada)', ['empurrar'], { r: ['arquibancada'], det: 'Mãos no degrau, corpo inclinado, flexiona os cotovelos.' }),
  ex('Flexão diamante', ['empurrar'], { n: 'a', det: 'Mãos juntas formando um diamante, foco em tríceps.' }),
  ex('Mergulho de tríceps', ['empurrar'], { r: ['arquibancada'], det: 'Mãos no degrau atrás do corpo, flexiona e estende os cotovelos.' }),
  ex('Pike push-up', ['empurrar'], { n: 'a', det: 'Em V invertido, desce a cabeça entre as mãos e empurra.' }),
  ex('Prancha para flexão (sobe e desce)', ['empurrar', 'core'], { det: 'Alterna antebraços e mãos entre prancha baixa e alta.' }),
  ex('Bear crawl', ['full', 'core'], { r: ['quadra'], det: 'Engatinha com joelhos fora do chão pela quadra.' }),
  ex('Caranguejo (crab walk)', ['full', 'empurrar'], { r: ['quadra'], det: 'De barriga para cima, desloca-se com mãos e pés.' }),
  ex('Man maker simplificado', ['full'], { n: 'a', imp: 'alto', det: 'Burpee + flexão + remada alternada (sem peso) + salto.' }),

  // Em dupla
  ex('Afundo reverso sincronizado', ['pernas_uni', 'dupla'], { d: true, det: 'Frente a frente, fazem o afundo ao mesmo tempo no mesmo ritmo.' }),
  ex('Cadeira humana (costas com costas)', ['pernas_bi', 'dupla'], { d: true, det: 'Costas coladas, agacham juntos e seguram a posição.' }),
  ex('Roda gigante (agachamento e giro com bastão)', ['pernas_bi', 'dupla', 'core'], { d: true, r: ['bastao'], det: 'Seguram o bastão juntos; agacham e giram sincronizados.' }),
  ex('Step-up "I go, you go"', ['pernas_uni', 'dupla'], { d: true, r: ['arquibancada'], det: 'Enquanto um sobe e desce, o outro faz agachamento isométrico.' }),
  ex('Passe de bastão em rotação russa', ['core', 'rotacao', 'dupla'], { d: true, r: ['bastao'], det: 'Em pé, passam o bastão girando o tronco.' }),
  ex('Prancha com toque de mão (high-five)', ['core', 'dupla'], { d: true, det: 'Frente a frente em prancha, tocam a mão alternando.' }),
  ex('Agachamento com bastão entre os dois', ['pernas_bi', 'dupla'], { d: true, r: ['bastao'], det: 'Bastão na horizontal entre os dois, agacham juntos.' }),
  ex('Abdominal em dupla (pés apoiados)', ['core', 'dupla'], { d: true, r: ['colchonete'], det: 'Um segura os pés do outro enquanto faz o abdominal; trocam.' }),

  // Escadaria (usa a escada do polo)
  ex('Subida correndo na escada', ['escadaria', 'cardio'], { r: ['escada'], imp: 'alto', det: 'Sobe correndo, desce andando com cuidado.' }),
  ex('Subida de 2 em 2 degraus', ['escadaria', 'pernas_uni'], { r: ['escada'], det: 'Sobe pulando um degrau a cada passada, desce andando.' }),
  ex('Subida com agachamento em cada degrau', ['escadaria', 'pernas_bi'], { r: ['escada'], det: 'Sobe e faz 1 agachamento em cada degrau; desce andando.' }),
  ex('Subida com afundo em cada degrau', ['escadaria', 'pernas_uni'], { r: ['escada'], n: 'a', det: 'Um afundo alternado a cada degrau.' }),
  ex('Saltos de dois pés degrau a degrau', ['escadaria', 'pliometria'], { r: ['escada'], n: 'a', imp: 'alto', det: 'Salta com os dois pés para o próximo degrau; desce andando.' }),
  ex('Subida lateral (passo a passo)', ['escadaria', 'agilidade'], { r: ['escada'], det: 'Sobe de lado cruzando os pés, depois repete para o outro lado.' }),
  ex('Subida com joelhada', ['escadaria', 'cardio'], { r: ['escada'], imp: 'alto', det: 'Sobe levando o joelho alto a cada passada.' }),
  ex('Descida em agachamento lateral', ['escadaria', 'pernas_bi'], { r: ['escada'], det: 'Desce de lado, agachando a cada degrau com controle.' }),
  ex('Flexão inclinada no degrau', ['escadaria', 'empurrar'], { r: ['escada'], det: 'Mãos no degrau, corpo inclinado.' }),
  ex('Subida de bear crawl nos degraus', ['escadaria', 'full'], { r: ['escada'], n: 'a', det: 'Mãos e pés nos degraus, sobe engatinhando.' }),
  ex('Panturrilha no degrau da escada', ['escadaria', 'pernas_uni'], { r: ['escada'], det: 'Ponta dos pés na borda do degrau, sobe e desce o calcanhar.' }),
]

// ─── Mobilidade (primeira parte da aula) ────────────────────────────────────
export const MOBILIDADE = [
  ex('Rotação de tronco', ['mob'], { det: 'Em pé, gira o tronco de um lado a outro, braços soltos.' }),
  ex('Toque no pé + overhead', ['mob'], { det: 'Leva a mão ao pé oposto e depois estica o braço para cima.' }),
  ex('Cócoras profundas (deep squat)', ['mob'], { det: 'Agachamento profundo, cotovelos empurram os joelhos para fora.' }),
  ex('Giro de ombros', ['mob'], { det: 'Círculos amplos com os ombros, para frente e para trás.' }),
  ex('Pêndulo de perna', ['mob'], { det: 'Balança a perna para frente e para trás, apoiado numa perna só.' }),
  ex('Chute Frankenstein', ['mob'], { det: 'Caminha chutando a perna esticada até tocar a mão oposta.' }),
  ex('Bom dia com rotação', ['mob'], { det: 'Dobra o quadril e gira o tronco abrindo um braço.' }),
  ex('Puxada de joelho', ['mob'], { det: 'Caminha abraçando o joelho ao peito a cada passo.' }),
  ex('Abraço de urso', ['mob'], { det: 'Abre os braços e abraça os ombros alternando por cima.' }),
  ex('Rotação de quadril', ['mob'], { det: 'Círculos grandes com o joelho, abrindo o quadril.' }),
  ex('Panturrilha no degrau (mobilidade)', ['mob'], { r: ['arquibancada'], det: 'Ponta dos pés no degrau, desce o calcanhar alongando.' }),
  ex('Bom dia em Y', ['mob'], { det: 'Dobra o quadril com os braços formando um Y.' }),
  ex('Giro de tronco com alcance', ['mob'], { det: 'Gira e estica o braço o mais longe possível.' }),
  ex('Afundo lateral (mobilidade)', ['mob'], { det: 'Afundo lateral devagar, abrindo o quadril.' }),
  ex('Mundo (world greatest stretch)', ['mob'], { det: 'Afundo + mão no chão + rotação do tronco abrindo o braço.' }),
  ex('Inchworm', ['mob'], { det: 'Caminha com as mãos até a prancha e volta com os pés.' }),
  ex('Círculos de tornozelo', ['mob'], { det: 'Gira o tornozelo nos dois sentidos.' }),
  ex('Gato-camelo', ['mob'], { r: ['colchonete'], det: 'De quatro, arredonda e estende a coluna.' }),
  ex('Cachorro olhando para baixo', ['mob'], { r: ['colchonete'], det: 'Corpo em V invertido, calcanhares buscam o chão.' }),
  ex('Passagem de bastão', ['mob'], { r: ['bastao'], det: 'Passa o bastão esticado por cima da cabeça até as costas e volta.' }),
  ex('Helicóptero com bastão', ['mob'], { r: ['bastao'], det: 'Gira o bastão acima da cabeça com os braços esticados.' }),
  ex('Bom dia com bastão (mobilidade)', ['mob'], { r: ['bastao'], det: 'Bastão nas costas, dobra o quadril com a coluna reta.' }),
  ex('Agachamento overhead com bastão (mobilidade)', ['mob'], { r: ['bastao'], det: 'Bastão acima da cabeça, agachamento lento.' }),
  ex('Abertura de peito na parede', ['mob'], { r: ['parede'], det: 'Braço apoiado na parede, gira o corpo para o lado oposto.' }),
]

// ─── Aquecimento ────────────────────────────────────────────────────────────
export const AQUECIMENTO = [
  ex('Agachamento livre rápido', ['aq'], { det: '' }), ex('Polichinelo', ['aq'], { imp: 'alto' }),
  ex('Joelhos altos', ['aq'], { imp: 'alto' }), ex('Calcanhar no glúteo', ['aq'], { imp: 'alto' }),
  ex('Pés rápidos', ['aq'], { imp: 'alto' }), ex('Prancha com toque no ombro', ['aq']),
  ex('Abdominal lateral em pé', ['aq']), ex('Tesoura em pé (abre e fecha pernas)', ['aq']),
  ex('Deslocamento lateral', ['aq'], { r: ['quadra'] }), ex('Trote frente e costas', ['aq'], { r: ['quadra'] }),
  ex('Ski jumps', ['aq'], { imp: 'alto' }), ex('Agachamento com socos', ['aq']),
  ex('Agachamento pulsante', ['aq']), ex('Squat jacks', ['aq'], { imp: 'alto' }),
  ex('Polisapato', ['aq'], { imp: 'alto' }), ex('Corrida de meia quadra', ['aq'], { r: ['quadra'] }),
  ex('Mountain climber leve', ['aq']), ex('Cadeirinha na parede', ['aq'], { r: ['parede'] }),
  ex('Abdominal supra', ['aq'], { r: ['colchonete'] }),
]
// jogos de aquecimento
export const JOGOS = [
  { nome: 'Siga o mestre', det: 'Todos seguem o professor: trote, desloca, congela na cadeirinha.', r: [] },
  { nome: 'Pega o bastão', det: 'Duplas em círculo; ao sinal, soltam o bastão e pegam o do colega antes de cair.', r: ['bastao'] },
  { nome: 'Bússola', det: 'O professor grita um ponto cardeal; todos correm até aquele lado da quadra e fazem 5 agachamentos.', r: ['quadra'] },
  { nome: 'Desafio overhead "Iso e reps"', det: 'Bastão acima da cabeça: 20s de isometria, depois 10 agachamentos.', r: ['bastao'] },
]

// ─── Volta à calma / alongamento ────────────────────────────────────────────
export const ALONGAMENTO = [
  ex('Alongamento de quadríceps', ['alo']), ex('Alongamento de posterior de coxa', ['alo']),
  ex('Alongamento de glúteo (figura 4)', ['alo'], { r: ['colchonete'] }), ex('Postura da criança', ['alo'], { r: ['colchonete'] }),
  ex('Alongamento de peitoral', ['alo']), ex('Alongamento de ombro', ['alo']),
  ex('Alongamento de tríceps', ['alo']), ex('Alongamento de panturrilha', ['alo']),
  ex('Alongamento de adutores', ['alo']), ex('Rotação de tronco deitado', ['alo'], { r: ['colchonete'] }),
  ex('Alongamento de lombar (joelhos ao peito)', ['alo'], { r: ['colchonete'] }),
  ex('Alongamento de flexor de quadril', ['alo']),
]
