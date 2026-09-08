import { useEffect, useMemo, useState } from 'react'
import { calcularInsumosNecessarios } from '../lib/insumosNecessarios.js'

// itens: [{ produtoId, quantidade }]
export function useInsumosNecessarios(itens, produtos, insumos) {
  const produtosPorId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos])
  const insumosPorId = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos])

  const chave = useMemo(
    () =>
      itens
        .filter((i) => i.produtoId && Number(i.quantidade) > 0)
        .map((i) => `${i.produtoId}:${i.quantidade}`)
        .join('|'),
    [itens],
  )

  const [linhas, setLinhas] = useState([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!chave) {
      setLinhas([])
      return
    }
    let ativo = true
    setCarregando(true)
    calcularInsumosNecessarios(itens, produtosPorId)
      .then((totais) => {
        if (!ativo) return
        const resultado = Array.from(totais.entries())
          .filter(([, quantidade]) => quantidade > 0)
          .map(([insumoId, quantidade]) => {
            const insumo = insumosPorId.get(insumoId)
            return {
              insumoId,
              nome: insumo?.nome || 'Insumo removido',
              unidadeMedida: insumo?.unidade_medida || '',
              quantidade,
            }
          })
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        setLinhas(resultado)
      })
      .catch(() => {
        if (ativo) setLinhas([])
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
    // "chave" já resume o conteúdo relevante de "itens"; produtosPorId/insumosPorId
    // mudam de referência a cada fetch dos hooks de listagem, não a cada digitação.
  }, [chave, produtosPorId, insumosPorId])

  return { linhas, carregando }
}
