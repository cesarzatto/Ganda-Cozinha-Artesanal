import { supabase } from '../lib/supabaseClient.js'

export async function buscarClientePorTelefone(telefone) {
  const { data, error } = await supabase.rpc('buscar_cliente_por_telefone', { p_telefone: telefone })
  if (error) throw error
  return data
}

export async function registrarPedidoLoja({ nome, telefone, itens, valorTotal, formaPagamento }) {
  const clienteId = await buscarClientePorTelefone(telefone)

  const { data, error } = await supabase.rpc('registrar_venda', {
    p_cliente_id: clienteId,
    p_itens: itens.map((item) => ({
      produto_id: item.produtoId,
      quantidade: item.quantidade,
      preco_unitario: item.precoUnitario,
    })),
    p_desconto: 0,
    p_valor_total: valorTotal,
    p_forma_contato: 'whatsapp',
    p_data_venda: new Date().toISOString().slice(0, 10),
    p_data_entrega: null,
    p_forma_pagamento: formaPagamento || null,
    p_observacao: null,
    p_tipo_frete: 'retirada',
    p_distancia_km_ida: null,
    p_custo_entrega: null,
    p_pago: false,
    p_endereco_entrega: null,
    p_sem_valor: false,
    p_ifood: false,
    p_titulo: nome,
    p_pedido_online: true,
    p_telefone_pedido: telefone,
  })
  if (error) throw error

  return { vendaId: data, clienteEncontrado: Boolean(clienteId) }
}
