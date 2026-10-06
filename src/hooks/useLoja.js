import { supabase } from '../lib/supabaseClient.js'
import { getCliente } from './useClientes.js'

export async function buscarClientePorTelefone(telefone) {
  const { data, error } = await supabase.rpc('buscar_cliente_por_telefone', { p_telefone: telefone })
  if (error) throw error
  return data
}

// Usado no checkout público pra saber se já existe endereço cadastrado
// naquele telefone, pra oferecer "usar esse endereço?" antes de pedir pra
// digitar de novo. Retorna null quando o telefone não bate com ninguém.
export async function buscarClienteParaCheckout(telefone) {
  const clienteId = await buscarClientePorTelefone(telefone)
  if (!clienteId) return null
  return getCliente(clienteId)
}

export async function registrarPedidoLoja({
  nome,
  telefone,
  itens,
  valorTotal,
  formaPagamento,
  endereco,
  enderecoEstruturado,
  salvarEnderecoPrincipal,
  desconto,
  observacao,
}) {
  const clienteId = await buscarClientePorTelefone(telefone)

  const { data, error } = await supabase.rpc('registrar_venda', {
    p_cliente_id: clienteId,
    p_itens: itens.map((item) => ({
      produto_id: item.produtoId,
      quantidade: item.quantidade,
      preco_unitario: item.precoUnitario,
    })),
    p_desconto: desconto || 0,
    p_valor_total: valorTotal,
    p_forma_contato: 'whatsapp',
    p_data_venda: new Date().toISOString().slice(0, 10),
    p_data_entrega: null,
    p_forma_pagamento: formaPagamento || null,
    p_observacao: observacao || null,
    p_tipo_frete: 'retirada',
    p_distancia_km_ida: null,
    p_custo_entrega: null,
    p_pago: false,
    p_endereco_entrega: endereco || null,
    p_sem_valor: false,
    p_ifood: false,
    p_titulo: nome,
    p_pedido_online: true,
    p_telefone_pedido: telefone,
    p_salvar_endereco_principal: Boolean(salvarEnderecoPrincipal),
  })
  if (error) throw error

  // Guarda o endereço separado em campos pra já cair certinho no cadastro
  // do cliente depois. Se falhar (ex: migração ainda não aplicada), o
  // pedido já foi registrado — não pode virar erro pro cliente.
  if (enderecoEstruturado) {
    await supabase
      .from('vendas')
      .update({
        endereco_cep: enderecoEstruturado.cep || null,
        endereco_rua: enderecoEstruturado.rua || null,
        endereco_numero: enderecoEstruturado.numero || null,
        endereco_complemento: enderecoEstruturado.complemento || null,
      })
      .eq('id', data)
      .then(() => {}, () => {})
  }

  return { vendaId: data, clienteEncontrado: Boolean(clienteId) }
}
