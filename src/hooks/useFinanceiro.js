import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

export function useFinanceiro() {
  const [entradas, setEntradas] = useState([])
  const [saidasInsumos, setSaidasInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDados = useCallback(async () => {
    setLoading(true)
    try {
      const [vendasRes, movInsumosRes] = await Promise.all([
        supabase
          .from('vendas')
          .select('id, valor_total, data_venda, numero_pedido, clientes ( nome )')
          .eq('status', 'confirmada')
          .eq('sem_valor', false),
        supabase
          .from('movimentacoes_insumos')
          .select('id, quantidade, motivo, valor_total, created_at, insumos ( nome, custo_unitario )')
          .eq('tipo', 'entrada'),
      ])
      if (vendasRes.error) throw vendasRes.error
      if (movInsumosRes.error) throw movInsumosRes.error
      setEntradas(vendasRes.data)
      setSaidasInsumos(movInsumosRes.data)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDados()
  }, [fetchDados])

  return { entradas, saidasInsumos, loading, error, refetch: fetchDados }
}
