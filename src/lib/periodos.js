export const FILTROS_PERIODO = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7dias', label: '7 dias' },
  { value: 'mes', label: 'Este mês' },
  { value: 'tudo', label: 'Tudo' },
]

export function dentroDoPeriodo(dataStr, filtro) {
  if (filtro === 'tudo') return true
  const hoje = new Date()
  const data = new Date(`${dataStr}T00:00:00`)

  if (filtro === 'hoje') {
    return data.toDateString() === hoje.toDateString()
  }
  if (filtro === '7dias') {
    const seteDiasAtras = new Date(hoje)
    seteDiasAtras.setDate(hoje.getDate() - 6)
    seteDiasAtras.setHours(0, 0, 0, 0)
    return data >= seteDiasAtras
  }
  if (filtro === 'mes') {
    return data.getFullYear() === hoje.getFullYear() && data.getMonth() === hoje.getMonth()
  }
  return true
}
