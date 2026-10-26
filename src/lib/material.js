// src/lib/material.js
// Constantes e helpers do inventário de material por polo.

export const CATEGORIAS = [
  'Bolas', 'Cones e marcadores', 'Coletes', 'Redes e traves', 'Colchonetes e tatames',
  'Equipamentos de pilates', 'Equipamentos de ginástica', 'Material de dança e ritmo',
  'Som e microfones', 'Mobiliário', 'Primeiros socorros', 'Uniformes',
  'Eletrônicos', 'Outros',
]

export const ESTADOS = {
  bom:        { label: 'Bom',        cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  reparo:     { label: 'Reparo',     cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  danificado: { label: 'Danificado', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  baixado:    { label: 'Baixado',    cls: 'bg-slate-200 text-slate-600 dark:bg-navy-600 dark:text-slate-300' },
}

export const TIPOS = {
  consumo:    'Por quantidade',
  patrimonio: 'Patrimônio (1 item)',
}

export const precisaAtencao = (i) => i.estado === 'reparo' || i.estado === 'danificado'

export function resumoMaterial(itens) {
  const ativos = itens.filter(i => i.estado !== 'baixado')
  const total = ativos.reduce((t, i) => t + i.quantidade, 0)
  const atencao = ativos.filter(precisaAtencao).reduce((t, i) => t + i.quantidade, 0)
  const tipos = new Set(ativos.map(i => i.nome.trim().toLowerCase())).size
  return { total, atencao, bons: total - atencao, tipos }
}

// Reduz a foto antes de enviar (celular gera arquivos de vários MB; o plano
// gratuito do armazenamento é de 1 GB). Máx. 1280 px no maior lado, JPEG 70%.
export function comprimirImagem(file, maxLado = 1280, qualidade = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * escala)
      canvas.height = Math.round(img.height * escala)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Falha ao reduzir a foto'))), 'image/jpeg', qualidade)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')) }
    img.src = url
  })
}

export function fmtDataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export const TIPO_MOV = {
  cadastro: 'Cadastrado',
  ajuste: 'Ajustado',
  estado: 'Mudou de estado',
  transferencia: 'Realocado',
}
