const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCurrency(value) {
  const number = Number(value)
  return currencyFormatter.format(Number.isFinite(number) ? number : 0)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export function formatMonthLabel(date = new Date()) {
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatPercent(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0%'
  return `${number.toFixed(0)}%`
}

export function formatQuantidade(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  return number % 1 === 0 ? String(number) : number.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
}

// Produtos com rendimento em "unidade" mostram "3x Trufa"; produtos medidos
// (kg/g/L/ml, geralmente sob encomenda) mostram "2,5 kg de Maionese".
export function formatQuantidadeProduto(quantidade, unidadeMedida) {
  if (!unidadeMedida || unidadeMedida === 'unidade') {
    return `${formatQuantidade(quantidade)}x`
  }
  return `${formatQuantidade(quantidade)} ${unidadeMedida}`
}
