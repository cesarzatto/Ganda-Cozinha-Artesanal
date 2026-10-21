// Lista de produção: tudo que está nas encomendas ainda não viradas em pedido
// (nem entregues). Marmitas do cardápio são somadas por produto e comparadas
// com o estoque; itens especiais iguais também são somados.

// Chave para agrupar itens digitados à mão: ignora maiúsculas, acentos e espaços sobrando.
function chaveDoNome(nome) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function consolidarProducao(encomendas, produtos) {
  const produtoPorId = new Map(produtos.map((p) => [p.id, p]))
  const porProduto = new Map()
  const porEspecial = new Map()
  const pendentes = new Set()

  for (const encomenda of encomendas) {
    if (encomenda.venda_id || encomenda.entregue) continue
    pendentes.add(encomenda.id)

    const origem = {
      numero: encomenda.numero,
      cliente: encomenda.clientes?.nome || encomenda.cliente_nome,
      entrega: encomenda.data_entrega,
    }

    for (const item of encomenda.itens) {
      const quantidade = Number(item.quantidade)
      if (item.tipo === 'catalogo') {
        const produto = produtoPorId.get(item.produto_id)
        const atual = porProduto.get(item.produto_id) || {
          nome: produto?.nome || item.descricao,
          unidade: produto?.rendimento_unidade_medida,
          sobDemanda: Boolean(produto?.sob_demanda),
          estoque: Math.max(Number(produto?.estoque_atual) || 0, 0),
          encomendado: 0,
          encomendas: [],
        }
        atual.encomendado += quantidade
        atual.encomendas.push({ ...origem, quantidade })
        porProduto.set(item.produto_id, atual)
      } else {
        const chave = chaveDoNome(item.descricao)
        const atual = porEspecial.get(chave) || { nome: item.descricao.trim(), total: 0, encomendas: [] }
        atual.total += quantidade
        atual.encomendas.push({ ...origem, quantidade })
        porEspecial.set(chave, atual)
      }
    }
  }

  const porEntrega = (a, b) => (a.entrega || '9999').localeCompare(b.entrega || '9999') || a.numero - b.numero
  const marmitas = [...porProduto.values()]
    .map((m) => ({
      ...m,
      fazer: m.sobDemanda ? m.encomendado : Math.max(m.encomendado - m.estoque, 0),
      encomendas: m.encomendas.sort(porEntrega),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const especiais = [...porEspecial.values()]
    .map((e) => ({ ...e, encomendas: e.encomendas.sort(porEntrega) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  return { marmitas, especiais, totalEncomendas: pendentes.size }
}
