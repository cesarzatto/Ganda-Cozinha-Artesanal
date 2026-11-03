const PALAVRAS_SOLTAS = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'sem', 'e', 'ao', 'a', 'o', 'em', 'na', 'no', 'para'])

export function normalizar(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function palavras(texto) {
  return normalizar(texto)
    .split(' ')
    .filter((w) => w.length >= 3 && !PALAVRAS_SOLTAS.has(w))
}

// Um texto digitado à mão parece uma marmita do cardápio? Nome igual ao
// produto (ignorando acento/maiúscula) é "exato"; senão vale quando todas as
// palavras digitadas aparecem no nome de um produto (pelo menos duas).
// Serve para avisar antes de virar pedido, pois item digitado não baixa estoque.
export function acharProdutoDoCardapio(descricao, produtos) {
  const digitado = normalizar(descricao)
  if (digitado.length < 4) return null

  const exato = produtos.find((p) => normalizar(p.nome) === digitado)
  if (exato) return { produto: exato, exato: true }

  const palavrasDigitadas = palavras(descricao)
  if (palavrasDigitadas.length < 2) return null

  let melhor = null
  let menorSobra = Infinity
  for (const produto of produtos) {
    const doProduto = new Set(palavras(produto.nome))
    if (!palavrasDigitadas.every((w) => doProduto.has(w))) continue
    const sobra = doProduto.size - palavrasDigitadas.length
    if (sobra < menorSobra) {
      melhor = produto
      menorSobra = sobra
    }
  }
  return melhor ? { produto: melhor, exato: false } : null
}
