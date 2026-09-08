import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

export function useInsumos() {
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchInsumos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('insumos').select('*').order('nome', { ascending: true })
    if (error) setError(error)
    else setInsumos(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInsumos()
  }, [fetchInsumos])

  return { insumos, loading, error, refetch: fetchInsumos }
}

export async function getInsumo(id) {
  const { data, error } = await supabase.from('insumos').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function salvarInsumo({ id, nome, unidadeMedida }) {
  const payload = {
    nome,
    unidade_medida: unidadeMedida,
  }

  if (id) {
    const { error } = await supabase.from('insumos').update(payload).eq('id', id)
    if (error) throw error
    return id
  }

  const { data, error } = await supabase.from('insumos').insert(payload).select('id').single()
  if (error) throw error
  return data.id
}

export async function excluirInsumo(id) {
  const { error } = await supabase.from('insumos').delete().eq('id', id)
  if (error) throw error
}
