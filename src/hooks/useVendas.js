import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

const SELECT_VENDA =
  'id, numero_pedido, titulo, status, entregue, valor_total, desconto, forma_contato, forma_pagamento, pago, data_venda, data_entrega, data_validade, sem_valor, ifood, pedido_online, telefone_pedido, notinha_impressa, observacao, tipo_frete, distancia_km_ida, custo_entrega, endereco_entrega, created_at, cliente_id, clientes ( nome, telefone, cep, rua, numero, complemento ), venda_itens ( quantidade, preco_unitario, produtos ( id, nome, rendimento_lote, rendimento_unidade_medida ) )'

export function useVendas() {
  const [vendas, setVendas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchVendas = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('vendas')
      .select(SELECT_VENDA)
      .eq('status', 'confirmada')
      .order('data_venda', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) setError(error)
    else setVendas(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchVendas()
  }, [fetchVendas])

  return { vendas, loading, error, refetch: fetchVendas }
}

export function useOrcamentos(busca = '') {
  const [orcamentos, setOrcamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOrcamentos = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('vendas').select(SELECT_VENDA).eq('status', 'orcamento').order('created_at', {
      ascending: false,
    })
    if (busca.trim()) {
      query = query.ilike('titulo', `%${busca.trim()}%`)
    }
    const { data, error } = await query
    if (error) setError(error)
    else setOrcamentos(data)
    setLoading(false)
  }, [busca])

  useEffect(() => {
    fetchOrcamentos()
  }, [fetchOrcamentos])

  return { orcamentos, loading, error, refetch: fetchOrcamentos }
}

export function useEntregasPendentes() {
  const [entregas, setEntregas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEntregas = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('vendas')
      .select(SELECT_VENDA)
      .eq('status', 'confirmada')
      .eq('entregue', false)
      .not('data_entrega', 'is', null)
      .order('data_entrega', { ascending: true })

    if (error) setError(error)
    else setEntregas(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEntregas()
  }, [fetchEntregas])

  return { entregas, loading, error, refetch: fetchEntregas }
}

export function useVendasSemCliente() {
  const [vendas, setVendas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchVendas = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('vendas')
      .select(SELECT_VENDA)
      .eq('status', 'confirmada')
      .eq('pedido_online', true)
      .is('cliente_id', null)
      .order('created_at', { ascending: false })

    if (error) setError(error)
    else setVendas(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchVendas()
  }, [fetchVendas])

  return { vendas, loading, error, refetch: fetchVendas }
}

export async function getUltimaDistanciaEntrega(clienteId, endereco) {
  if (!clienteId || !endereco) return null
  const { data, error } = await supabase
    .from('vendas')
    .select('distancia_km_ida')
    .eq('cliente_id', clienteId)
    .eq('tipo_frete', 'estabelecimento')
    .eq('endereco_entrega', endereco)
    .not('distancia_km_ida', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.distancia_km_ida ?? null
}

export async function getVenda(id) {
  const { data, error } = await supabase.from('vendas').select(SELECT_VENDA).eq('id', id).single()
  if (error) throw error
  return data
}

function mapItens(itens) {
  return itens.map((item) => ({
    produto_id: item.produtoId,
    quantidade: item.quantidade,
    preco_unitario: item.precoUnitario,
  }))
}

export async function registrarVenda({
  clienteId,
  itens,
  desconto,
  valorTotal,
  dataVenda,
  dataEntrega,
  formaPagamento,
  observacao,
  tipoFrete,
  distanciaKmIda,
  custoEntrega,
  pago,
  enderecoEntrega,
  semValor,
  ifood,
  titulo,
}) {
  const { data, error } = await supabase.rpc('registrar_venda', {
    p_cliente_id: clienteId,
    p_itens: mapItens(itens),
    p_desconto: desconto || 0,
    p_valor_total: valorTotal,
    p_forma_contato: null,
    p_data_venda: dataVenda,
    p_data_entrega: dataEntrega || null,
    p_forma_pagamento: formaPagamento || null,
    p_observacao: observacao || null,
    p_tipo_frete: tipoFrete || 'retirada',
    p_distancia_km_ida: distanciaKmIda || null,
    p_custo_entrega: custoEntrega || null,
    p_pago: pago ?? true,
    p_endereco_entrega: enderecoEntrega || null,
    p_sem_valor: semValor ?? false,
    p_ifood: ifood ?? false,
    p_titulo: titulo || null,
  })
  if (error) throw error
  return data
}

export async function atualizarEntregaVenda({
  vendaId,
  dataEntrega,
  formaPagamento,
  observacao,
  tipoFrete,
  distanciaKmIda,
  custoEntrega,
  pago,
  enderecoEntrega,
}) {
  const { error } = await supabase.rpc('atualizar_entrega_venda', {
    p_venda_id: vendaId,
    p_data_entrega: dataEntrega || null,
    p_forma_pagamento: formaPagamento || null,
    p_observacao: observacao || null,
    p_tipo_frete: tipoFrete || 'retirada',
    p_distancia_km_ida: distanciaKmIda || null,
    p_custo_entrega: custoEntrega || null,
    p_pago: pago ?? true,
    p_endereco_entrega: enderecoEntrega || null,
  })
  if (error) throw error
}

export async function marcarEntregaVenda(vendaId, entregue) {
  const { error } = await supabase.from('vendas').update({ entregue }).eq('id', vendaId)
  if (error) throw error
}

export async function marcarNotinhaImpressa(vendaId, notinhaImpressa) {
  const { error } = await supabase.from('vendas').update({ notinha_impressa: notinhaImpressa }).eq('id', vendaId)
  if (error) throw error
}

export async function cancelarVenda(vendaId) {
  const { error } = await supabase.rpc('cancelar_venda', { p_venda_id: vendaId })
  if (error) throw error
}

export async function vincularClienteAoPedido(vendaId, clienteId) {
  const { error } = await supabase.from('vendas').update({ cliente_id: clienteId }).eq('id', vendaId)
  if (error) throw error
}

export async function criarOrcamento({
  titulo,
  clienteId,
  itens,
  desconto,
  valorTotal,
  formaContato,
  dataVenda,
  dataEntrega,
  formaPagamento,
  observacao,
  tipoFrete,
  distanciaKmIda,
  custoEntrega,
  pago,
  enderecoEntrega,
  dataValidade,
}) {
  const { data, error } = await supabase.rpc('criar_orcamento', {
    p_titulo: titulo,
    p_cliente_id: clienteId || null,
    p_itens: mapItens(itens),
    p_desconto: desconto || 0,
    p_valor_total: valorTotal,
    p_forma_contato: formaContato || null,
    p_data_venda: dataVenda,
    p_data_entrega: dataEntrega || null,
    p_forma_pagamento: formaPagamento || null,
    p_observacao: observacao || null,
    p_tipo_frete: tipoFrete || 'retirada',
    p_distancia_km_ida: distanciaKmIda || null,
    p_custo_entrega: custoEntrega || null,
    p_pago: pago ?? false,
    p_endereco_entrega: enderecoEntrega || null,
    p_data_validade: dataValidade || null,
  })
  if (error) throw error
  return data
}

export async function atualizarOrcamento({
  id,
  titulo,
  clienteId,
  itens,
  desconto,
  valorTotal,
  formaContato,
  dataVenda,
  dataEntrega,
  formaPagamento,
  observacao,
  tipoFrete,
  distanciaKmIda,
  custoEntrega,
  pago,
  enderecoEntrega,
  dataValidade,
}) {
  const { error } = await supabase.rpc('atualizar_orcamento', {
    p_venda_id: id,
    p_titulo: titulo,
    p_cliente_id: clienteId || null,
    p_itens: mapItens(itens),
    p_desconto: desconto || 0,
    p_valor_total: valorTotal,
    p_forma_contato: formaContato || null,
    p_data_venda: dataVenda,
    p_data_entrega: dataEntrega || null,
    p_forma_pagamento: formaPagamento || null,
    p_observacao: observacao || null,
    p_tipo_frete: tipoFrete || 'retirada',
    p_distancia_km_ida: distanciaKmIda || null,
    p_custo_entrega: custoEntrega || null,
    p_pago: pago ?? false,
    p_endereco_entrega: enderecoEntrega || null,
    p_data_validade: dataValidade || null,
  })
  if (error) throw error
}

export async function excluirOrcamento(id) {
  const { error } = await supabase.from('vendas').delete().eq('id', id)
  if (error) throw error
}

export async function converterOrcamentoEmVenda({ id, clienteId, formaContato }) {
  const { error } = await supabase.rpc('converter_orcamento_em_venda', {
    p_venda_id: id,
    p_cliente_id: clienteId || null,
    p_forma_contato: formaContato || null,
  })
  if (error) throw error
}
