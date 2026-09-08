import { supabase } from './supabaseClient.js'

async function buscarFichaTecnica(produtoIds) {
  if (produtoIds.length === 0) return []
  const { data, error } = await supabase
    .from('ficha_tecnica')
    .select('produto_id, insumo_id, sub_produto_id, quantidade')
    .in('produto_id', produtoIds)
  if (error) throw error
  return data
}

// Um produto "medido" (rendimento_unidade_medida diferente de "unidade") tem a
// ficha técnica preenchida com as quantidades da receita INTEIRA (o lote), não
// de uma unidade só — então a quantidade pedida precisa ser dividida pelo
// rendimento do lote antes de multiplicar pela ficha técnica. Espelha
// custo_total_produto() no banco (ver supabase/schema.sql).
function fatorEscala(produto, quantidade) {
  const medido = (produto?.rendimento_unidade_medida || 'unidade') !== 'unidade'
  if (!medido) return quantidade
  const rendimentoLote = Math.max(Number(produto?.rendimento_lote) || 1, 0.001)
  return quantidade / rendimentoLote
}

// itens: [{ produtoId, quantidade }]
// produtosPorId: Map produtoId -> { rendimento_lote, rendimento_unidade_medida }
// Retorna um Map insumoId -> quantidade total necessária, resolvendo
// recursivamente sub-produtos usados como ingrediente de outros produtos.
export async function calcularInsumosNecessarios(itens, produtosPorId) {
  const totais = new Map()
  const fichaPorProduto = new Map()

  let filaAtual = itens
    .filter((item) => item.produtoId && Number(item.quantidade) > 0)
    .map((item) => ({ produtoId: item.produtoId, quantidade: Number(item.quantidade) }))
  let profundidade = 0

  while (filaAtual.length > 0 && profundidade <= 5) {
    const faltando = [...new Set(filaAtual.map((i) => i.produtoId))].filter((id) => !fichaPorProduto.has(id))
    if (faltando.length > 0) {
      const linhas = await buscarFichaTecnica(faltando)
      faltando.forEach((id) => fichaPorProduto.set(id, []))
      linhas.forEach((linha) => fichaPorProduto.get(linha.produto_id).push(linha))
    }

    const proximaFila = []
    for (const { produtoId, quantidade } of filaAtual) {
      const fator = fatorEscala(produtosPorId.get(produtoId), quantidade)
      const ficha = fichaPorProduto.get(produtoId) || []
      for (const linha of ficha) {
        const qtdLinha = Number(linha.quantidade) * fator
        if (linha.insumo_id) {
          totais.set(linha.insumo_id, (totais.get(linha.insumo_id) || 0) + qtdLinha)
        } else if (linha.sub_produto_id) {
          proximaFila.push({ produtoId: linha.sub_produto_id, quantidade: qtdLinha })
        }
      }
    }
    filaAtual = proximaFila
    profundidade += 1
  }

  return totais
}
