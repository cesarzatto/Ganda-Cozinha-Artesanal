import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

export function useCategorias() {
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCategorias = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('categorias').select('*').order('nome', { ascending: true })
    if (error) setError(error)
    else setCategorias(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCategorias()
  }, [fetchCategorias])

  return { categorias, loading, error, refetch: fetchCategorias }
}

export async function criarCategoria(nome) {
  const { data, error } = await supabase.from('categorias').insert({ nome }).select('id, nome').single()
  if (error) throw error
  return data
}

export async function excluirCategoria(id) {
  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) throw error
}
