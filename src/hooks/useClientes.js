import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

export function useClientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('clientes').select('*').order('nome', { ascending: true })
    if (error) setError(error)
    else setClientes(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  return { clientes, loading, error, refetch: fetchClientes }
}

export async function getCliente(id) {
  const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function salvarCliente({
  id,
  tipo,
  nome,
  razaoSocial,
  dataNascimento,
  origem,
  indicadoPor,
  documento,
  cep,
  rua,
  numero,
  complemento,
  telefone,
  email,
  instagram,
}) {
  const payload = {
    tipo,
    nome,
    razao_social: razaoSocial || null,
    data_nascimento: dataNascimento || null,
    origem,
    indicado_por: origem === 'indicacao' ? indicadoPor || null : null,
    documento: documento || null,
    cep: cep || null,
    rua: rua || null,
    numero: numero || null,
    complemento: complemento || null,
    telefone,
    email: email || null,
    instagram: instagram || null,
  }

  if (id) {
    const { error } = await supabase.from('clientes').update(payload).eq('id', id)
    if (error) throw error
    return id
  }

  const { data, error } = await supabase.from('clientes').insert(payload).select('id').single()
  if (error) throw error
  return data.id
}

export async function excluirCliente(id) {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw error
}
