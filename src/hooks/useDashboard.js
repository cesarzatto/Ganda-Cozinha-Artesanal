import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAutoRefresh } from './useAutoRefresh.js'

function monthRange(offset = 0) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1)
  const toISO = (d) => d.toISOString().slice(0, 10)
  return { start: toISO(start), end: toISO(end) }
}

async function fetchProdutosCustoMap() {
  const { data, error } = await supabase.from('produtos_com_custo').select('id, nome, custo_total')
  if (error) throw error
  const map = new Map()
  for (const produto of data) map.set(produto.id, produto)
  return map
}

async function fetchMonthSummary(start, end, custoMap) {
  const { data, error } = await supabase
    .from('vendas')
    .select('id, valor_total, venda_itens ( produto_id, quantidade )')
    .gte('data_venda', start)
    .lt('data_venda', end)
  if (error) throw error

  let totalVendido = 0
  let lucroEstimado = 0
  const porProduto = new Map()

  for (const venda of data) {
    totalVendido += Number(venda.valor_total)

    let custoPedido = 0
    for (const item of venda.venda_itens) {
      const produto = custoMap.get(item.produto_id)
      const custoUnitario = Number(produto?.custo_total || 0)
      custoPedido += custoUnitario * item.quantidade

      const nome = produto?.nome || 'Produto removido'
      porProduto.set(nome, (porProduto.get(nome) || 0) + item.quantidade)
    }
    lucroEstimado += Number(venda.valor_total) - custoPedido
  }

  let produtoMaisVendido = null
  let maiorQtd = 0
  for (const [nome, qtd] of porProduto) {
    if (qtd > maiorQtd) {
      maiorQtd = qtd
      produtoMaisVendido = nome
    }
  }

  return { totalVendido, lucroEstimado, produtoMaisVendido, qtdVendas: data.length }
}

export function useDashboard() {
  const [resumo, setResumo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchResumo = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      const custoMap = await fetchProdutosCustoMap()
      const atual = monthRange(0)
      const anterior = monthRange(-1)
      const [mesAtual, mesAnterior] = await Promise.all([
        fetchMonthSummary(atual.start, atual.end, custoMap),
        fetchMonthSummary(anterior.start, anterior.end, custoMap),
      ])
      setResumo({ mesAtual, mesAnterior })
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      if (!silencioso) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchResumo()
  }, [fetchResumo])
  useAutoRefresh(() => fetchResumo(true))

  return { resumo, loading, error, refetch: fetchResumo }
}
