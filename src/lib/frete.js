import { Store, Bike, Building2 } from 'lucide-react'

// TODO: definir o endereço de partida real da Ganda Cozinha Artesanal
export const ENDERECO_ORIGEM = 'Rua Coronel Octavio Azeredo, 60, 02311-110, São Paulo, SP'

export const TIPOS_FRETE = [
  { value: 'retirada', label: 'Retirada', icon: Store },
  { value: 'motoboy', label: 'Motoboy', icon: Bike },
  { value: 'estabelecimento', label: 'Estabelecimento', icon: Building2 },
]

export function enderecoCompletoCliente(cliente) {
  if (!cliente) return ''
  const linha1 = [cliente.rua, cliente.numero].filter(Boolean).join(', ')
  const partes = [linha1, cliente.complemento, cliente.cep].filter(Boolean)
  return partes.join(' - ')
}

// Fallback pra pedidos antigos, que guardaram o endereço numa linha só:
// tenta separar "Rua X, 70 - apto 2 - 01310-100" em rua / número /
// complemento / CEP. Se não achar um número depois da primeira vírgula,
// devolve tudo na rua pra pessoa ajustar na mão.
export function separarEndereco(texto) {
  const original = (texto || '').trim()
  if (!original) return { cep: '', rua: '', numero: '', complemento: '' }

  let resto = original
  let cep = ''
  const achouCep = resto.match(/[\s,-]*\b(\d{5}-?\d{3})\s*$/)
  if (achouCep) {
    cep = achouCep[1]
    resto = resto.slice(0, achouCep.index).trim()
  }

  const partes = resto.match(/^(.*?)\s*,\s*(\d+[A-Za-z]?)\s*(?:[-,]\s*(.*))?$/)
  if (!partes) return { cep, rua: resto, numero: '', complemento: '' }
  return { cep, rua: partes[1].trim(), numero: partes[2], complemento: (partes[3] || '').trim() }
}

export function linkGoogleMaps(origem, destino) {
  const params = new URLSearchParams({
    api: '1',
    origin: origem,
    destination: destino,
    travelmode: 'driving',
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function calcularCustoEntrega(distanciaKmIda, config) {
  const distancia = Number(distanciaKmIda) || 0
  if (distancia <= 0) return 0

  const consumo = Number(config.consumo_medio_km_l) || 0
  const precoCombustivel = Number(config.preco_combustivel_litro) || 0
  const desgaste = Number(config.desgaste_por_km) || 0
  const velocidade = Number(config.velocidade_media_kmh) || 0
  const valorHora = Number(config.valor_hora_trabalho) || 0

  const custoCombustivelPorKm = consumo > 0 ? precoCombustivel / consumo : 0
  const custoTempoPorKm = velocidade > 0 ? (60 / velocidade / 60) * valorHora : 0
  const custoPorKm = custoCombustivelPorKm + desgaste + custoTempoPorKm

  return distancia * 2 * custoPorKm
}
