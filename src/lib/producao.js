// O que ainda precisa ser produzido num pedido: marmitas do cardápio que
// faltaram no estoque (qtd_produzir) + itens personalizados da encomenda.
export function listarProducao(venda) {
  const catalogo = (venda.venda_itens || [])
    .filter((item) => Number(item.qtd_produzir) > 0)
    .map((item) => ({
      nome: item.produtos?.nome || 'Produto removido',
      produzir: Number(item.qtd_produzir),
      pedido: Number(item.quantidade),
      unidade: item.produtos?.rendimento_unidade_medida,
    }))

  const personalizados = (venda.itens_personalizados || []).map((item) => ({
    nome: item.descricao,
    produzir: Number(item.quantidade),
  }))

  return { catalogo, personalizados, temProducao: catalogo.length + personalizados.length > 0 }
}

function nomeDoCliente(venda) {
  if (venda.clientes?.nome) return venda.clientes.nome
  if (venda.ifood) return `iFood · ${venda.titulo || 'Sem nome'}`
  if (venda.pedido_online) return venda.titulo || 'Sem nome'
  return 'Cliente a definir'
}

// Junta o que falta produzir de todos os pedidos ainda não entregues:
// marmitas do cardápio somadas por produto (com o detalhe de cada pedido) e
// itens especiais um a um.
export function consolidarProducao(vendas) {
  const porProduto = new Map()
  const especiais = []
  const pedidos = new Set()

  for (const venda of vendas) {
    if (venda.entregue) continue
    const { catalogo, personalizados } = listarProducao(venda)
    if (catalogo.length + personalizados.length === 0) continue
    pedidos.add(venda.id)

    const origem = { numero: venda.numero_pedido, cliente: nomeDoCliente(venda), entrega: venda.data_entrega }

    for (const item of catalogo) {
      const atual = porProduto.get(item.nome) || { nome: item.nome, unidade: item.unidade, total: 0, pedidos: [] }
      atual.total += item.produzir
      atual.pedidos.push({ ...origem, quantidade: item.produzir })
      porProduto.set(item.nome, atual)
    }
    for (const item of personalizados) {
      especiais.push({ nome: item.nome, quantidade: item.produzir, ...origem })
    }
  }

  const porEntrega = (a, b) => (a.entrega || '9999').localeCompare(b.entrega || '9999') || a.numero - b.numero
  const marmitas = [...porProduto.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  for (const m of marmitas) m.pedidos.sort(porEntrega)
  especiais.sort(porEntrega)

  return { marmitas, especiais, totalPedidos: pedidos.size }
}
