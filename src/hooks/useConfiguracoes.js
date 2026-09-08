import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

const PADRAO = {
  valor_hora_trabalho: 30,
  margem_padrao: 40,
  consumo_medio_km_l: 10,
  preco_combustivel_litro: 6.15,
  desgaste_por_km: 0.4,
  velocidade_media_kmh: 18,
}

export function useConfiguracoes() {
  const [config, setConfig] = useState(PADRAO)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('configuracoes').select('*').eq('id', 1).single()
    if (error) setError(error)
    else setConfig(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  return { config, loading, error, refetch: fetchConfig }
}

export async function salvarConfiguracoes({
  valorHoraTrabalho,
  margemPadrao,
  consumoMedioKmL,
  precoCombustivelLitro,
  desgastePorKm,
  velocidadeMediaKmh,
}) {
  const { error } = await supabase
    .from('configuracoes')
    .update({
      valor_hora_trabalho: valorHoraTrabalho,
      margem_padrao: margemPadrao,
      consumo_medio_km_l: consumoMedioKmL,
      preco_combustivel_litro: precoCombustivelLitro,
      desgaste_por_km: desgastePorKm,
      velocidade_media_kmh: velocidadeMediaKmh,
    })
    .eq('id', 1)
  if (error) throw error
}
