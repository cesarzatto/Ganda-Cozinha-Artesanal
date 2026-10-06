// Consulta o CEP no ViaCEP (gratuito, sem chave). Retorna { rua, cidadeUf },
// null se o CEP não existir, e lança erro se a consulta falhar (sem internet).
export async function buscarEnderecoPorCep(cep) {
  const cepLimpo = cep.replace(/\D/g, '')
  if (cepLimpo.length !== 8) return null

  const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
  const data = await res.json()
  if (data.erro) return null

  return {
    rua: [data.logradouro, data.bairro].filter(Boolean).join(' - '),
    cidadeUf: data.localidade && data.uf ? `${data.localidade}/${data.uf}` : '',
  }
}
