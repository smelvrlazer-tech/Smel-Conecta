// src/lib/cpf.js
import { supabase } from './supabase'

// Compara nomes ignorando maiúscula, acento e espaço sobrando.
const normNome = (s) => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

// Procura aluno com o MESMO NOME COMPLETO e a MESMA DATA DE NASCIMENTO no
// sistema inteiro. Sem data de nascimento não dá pra afirmar que é a mesma
// pessoa, então nesse caso não bloqueia.
export async function buscarAlunoPorNomeNascimento(nome, dataNasc) {
  if (!nome?.trim() || !dataNasc) return null
  const { data } = await supabase.from('alunos').select('id,nome,cpf,turma_id,data_nasc')
    .eq('data_nasc', dataNasc).limit(200)
  const alvo = normNome(nome)
  return (data ?? []).find(a => normNome(a.nome) === alvo) ?? null
}

// Regra do CPF no cadastro NOVO: só menor de 18 anos pode ficar sem CPF.
// Sem data de nascimento não dá pra saber a idade, então exige o CPF.
// Devolve a mensagem de erro, ou null se estiver ok.
export function erroCpfCadastro({ cpf, data_nasc }) {
  const digitos = (cpf ?? '').replace(/\D/g, '')
  if (digitos && digitos.length !== 11) return 'CPF deve ter 11 números'
  if (digitos) return null
  if (!data_nasc) return 'Informe o CPF (ou a data de nascimento, se for menor de 18 anos)'
  const nasc = new Date(data_nasc + 'T12:00:00')
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const fezAniversario = hoje.getMonth() > nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() >= nasc.getDate())
  if (!fezAniversario) idade -= 1
  return idade >= 18 ? 'CPF é obrigatório para maiores de 18 anos' : null
}

// Procura aluno repetido (mesmo CPF OU mesmo nome completo + data de nascimento)
// no sistema INTEIRO, inclusive em outros polos. A regra de segurança esconde
// dos professores os alunos de outros polos, então a busca passa por uma função
// do banco (buscar_aluno_duplicado, em supabase/limpar-alunos-duplicados.sql)
// que devolve só o aluno repetido, sem abrir a lista. Se a função ainda não foi
// instalada, usa a busca direta (que só enxerga o próprio polo).
// Retorna { aluno, motivo: 'cpf' | 'nome' } ou null.
export async function buscarAlunoDuplicado({ cpfNorm, nome, dataNasc }) {
  const { data, error } = await supabase.rpc('buscar_aluno_duplicado', {
    p_cpf: cpfNorm || null, p_nome: nome ?? null, p_data_nasc: dataNasc || null,
  })
  if (!error && Array.isArray(data)) {
    const porCpf = cpfNorm && cpfNorm.length >= 11
      ? data.find(a => a.cpf && a.cpf.replace(/\D/g, '') === cpfNorm) : null
    if (porCpf) return { aluno: porCpf, motivo: 'cpf' }
    const porNome = data.find(a => normNome(a.nome) === normNome(nome))
    return porNome ? { aluno: porNome, motivo: 'nome' } : null
  }
  const porCpf = await buscarAlunoPorCpf(cpfNorm)
  if (porCpf) return { aluno: porCpf, motivo: 'cpf' }
  const porNome = await buscarAlunoPorNomeNascimento(nome, dataNasc)
  return porNome ? { aluno: porNome, motivo: 'nome' } : null
}

// Procura aluno pelo CPF no sistema inteiro (cross-polo) com UMA consulta
// filtrada — antes baixava a tabela de alunos inteira (lenta no celular e
// cortada em 1000 linhas pelo servidor, então nem achava todos os CPFs).
export async function buscarAlunoPorCpf(cpfNorm) {
  if (!cpfNorm || cpfNorm.length < 11) return null
  const mascarado = cpfNorm.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  const { data } = await supabase.from('alunos').select('id,nome,cpf,turma_id')
    .or(`cpf.eq.${cpfNorm},cpf.eq.${mascarado}`).limit(5)
  return (data ?? []).find(a => a.cpf && a.cpf.replace(/\D/g, '') === cpfNorm) ?? null
}
