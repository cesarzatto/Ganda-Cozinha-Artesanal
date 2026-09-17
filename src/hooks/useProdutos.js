import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAutoRefresh } from './useAutoRefresh.js'

export function useProdutos() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProdutos = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    const { data, error } = await supabase
      .from('produtos_com_custo')
      .select('*')
      .order('nome', { ascending: true })

    if (error) setError(error)
    else setProdutos(data)
    if (!silencioso) setLoading(false)
  }, [])

  useEffect(() => {
    fetchProdutos()
  }, [fetchProdutos])
  useAutoRefresh(() => fetchProdutos(true))

  return { produtos, loading, error, refetch: fetchProdutos }
}

// Usado pela loja pública (/loja) — só os campos que um cliente pode ver.
// Nunca usa a view produtos_com_custo (custo/margem são informação interna).
// Produtos Sob Encomenda não entram: pedido online é só pra quem já está
// pronto em estoque (marmitas); sob encomenda exige combinar com a cliente.
export async function getProdutosPublicos() {
  const { data, error } = await supabase
    .from('produtos')
    .select('id, nome, foto_url, categoria, preco_venda, estoque_atual')
    .eq('ativo', true)
    .eq('vendido_separadamente', true)
    .eq('sob_demanda', false)
    .gt('estoque_atual', 0)
    .order('nome', { ascending: true })
  if (error) throw error
  return data
}

export async function getProduto(id) {
  const { data, error } = await supabase
    .from('produtos_com_custo')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getFichaTecnica(produtoId) {
  const { data, error } = await supabase
    .from('ficha_tecnica')
    .select('id, quantidade, insumo_id, sub_produto_id')
    .eq('produto_id', produtoId)
  if (error) throw error
  return data
}

export async function salvarProduto({
  id,
  nome,
  categoria,
  precoVenda,
  precoManual,
  sazonal,
  epocaSazonal,
  sobDemanda,
  vendidoSeparadamente,
  fotoUrl,
  tempoProducaoMinutos,
  rendimentoLote,
  rendimentoUnidadeMedida,
  custoIndiretoUnidade,
  margemDesejada,
  estoqueMinimo,
  quantidadeInicial,
  itensFicha,
}) {
  let produtoId = id
  const payload = {
    nome,
    categoria: categoria || null,
    preco_venda: precoVenda,
    preco_manual: precoManual,
    sazonal,
    epoca_sazonal: sazonal ? epocaSazonal || null : null,
    sob_demanda: sobDemanda,
    vendido_separadamente: vendidoSeparadamente,
    foto_url: fotoUrl || null,
    tempo_producao_minutos: tempoProducaoMinutos,
    rendimento_lote: rendimentoLote,
    rendimento_unidade_medida: rendimentoUnidadeMedida || 'unidade',
    custo_indireto_unidade: custoIndiretoUnidade,
    margem_desejada: margemDesejada,
    estoque_minimo: estoqueMinimo,
  }

  if (id) {
    const { error } = await supabase.from('produtos').update(payload).eq('id', id)
    if (error) throw error
  } else {
    const { data, error } = await supabase
      .from('produtos')
      .insert({ ...payload, estoque_atual: quantidadeInicial || 0 })
      .select('id')
      .single()
    if (error) throw error
    produtoId = data.id
  }

  const { error: delError } = await supabase.from('ficha_tecnica').delete().eq('produto_id', produtoId)
  if (delError) throw delError

  if (itensFicha.length > 0) {
    const rows = itensFicha
      .filter((item) => item.refId && Number(item.quantidade) > 0)
      .map((item) => ({
        produto_id: produtoId,
        insumo_id: item.tipo === 'insumo' ? item.refId : null,
        sub_produto_id: item.tipo === 'sub_produto' ? item.refId : null,
        quantidade: item.quantidade,
      }))
    if (rows.length > 0) {
      const { error: insError } = await supabase.from('ficha_tecnica').insert(rows)
      if (insError) throw insError
    }
  }

  return produtoId
}

export async function excluirProduto(id) {
  const { error } = await supabase.from('produtos').delete().eq('id', id)
  if (error) throw error
}

export async function registrarMovimentacaoProduto({ produtoId, tipo, quantidade, motivo }) {
  const { error } = await supabase.rpc('registrar_movimentacao_produto', {
    p_produto_id: produtoId,
    p_tipo: tipo,
    p_quantidade: quantidade,
    p_motivo: motivo || null,
  })
  if (error) throw error
}
