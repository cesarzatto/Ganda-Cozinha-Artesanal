import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAutoRefresh } from './useAutoRefresh.js'

const SELECT_ENCOMENDA = '*, clientes ( nome, telefone, cep, rua, numero, complemento )'

export function useEncomendas() {
  const [encomendas, setEncomendas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEncomendas = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    const { data, error } = await supabase
      .from('encomendas')
      .select(SELECT_ENCOMENDA)
      .order('created_at', { ascending: false })

    if (error) setError(error)
    else setEncomendas(data)
    if (!silencioso) setLoading(false)
  }, [])

  useEffect(() => {
    fetchEncomendas()
  }, [fetchEncomendas])
  useAutoRefresh(() => fetchEncomendas(true))

  return { encomendas, loading, error, refetch: fetchEncomendas }
}

export async function getEncomenda(id) {
  const { data, error } = await supabase.from('encomendas').select(SELECT_ENCOMENDA).eq('id', id).single()
  if (error) throw error
  return data
}

export function totalDosItens(itens) {
  return itens.reduce((soma, item) => soma + Number(item.quantidade) * Number(item.valor_unitario), 0)
}

export async function salvarEncomenda({
  id,
  clienteId,
  clienteNome,
  enderecoEntrega,
  dataEncomenda,
  dataEntrega,
  itens,
  formaPagamento,
  pago,
  entregue,
  observacao,
}) {
  const registro = {
    cliente_id: clienteId,
    cliente_nome: clienteNome,
    endereco_entrega: enderecoEntrega || null,
    data_encomenda: dataEncomenda,
    data_entrega: dataEntrega || null,
    itens,
    valor_total: totalDosItens(itens),
    forma_pagamento: formaPagamento || null,
    pago,
    entregue,
    observacao: observacao || null,
  }

  if (id) {
    const { error } = await supabase.from('encomendas').update(registro).eq('id', id)
    if (error) throw error
    return id
  }

  const { data, error } = await supabase.from('encomendas').insert(registro).select('id').single()
  if (error) throw error
  return data.id
}

// Vira pedido (venda): baixa do estoque o que existe e deixa o resto "a produzir".
export async function virarPedido(id) {
  const { data, error } = await supabase.rpc('converter_encomenda_em_venda', { p_encomenda_id: id })
  if (error) throw error
  return data
}

export async function marcarEncomendaNotinhaImpressa(id, impressa) {
  const { error } = await supabase.from('encomendas').update({ notinha_impressa: impressa }).eq('id', id)
  if (error) throw error
}

export async function excluirEncomenda(id) {
  const { error } = await supabase.from('encomendas').delete().eq('id', id)
  if (error) throw error
}
