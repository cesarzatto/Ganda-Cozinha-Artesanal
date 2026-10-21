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
