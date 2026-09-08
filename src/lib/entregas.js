export function diasParaEntrega(dataEntrega) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const entrega = new Date(`${dataEntrega}T00:00:00`)
  return Math.round((entrega - hoje) / 86400000)
}

export function urgenciaEntrega(dataEntrega) {
  const dias = diasParaEntrega(dataEntrega)

  if (dias < 0) {
    return { nivel: 'atrasado', dias, texto: `Atrasada há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? '' : 's'}` }
  }
  if (dias === 0) {
    return { nivel: 'hoje', dias, texto: 'Entrega é hoje!' }
  }
  if (dias <= 3) {
    return { nivel: 'urgente', dias, texto: `Faltam ${dias} dia${dias === 1 ? '' : 's'}` }
  }
  if (dias <= 5) {
    return { nivel: 'atencao', dias, texto: `Faltam ${dias} dias` }
  }
  return { nivel: 'normal', dias, texto: `Faltam ${dias} dias` }
}
