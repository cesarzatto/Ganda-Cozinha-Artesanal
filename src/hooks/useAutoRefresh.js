import { useEffect } from 'react'

const INTERVALO_PADRAO_MS = 60000

// Reexecuta `callback` a cada `intervaloMs` (1 min por padrão) enquanto o
// componente estiver montado — usado pra manter listas/painéis atualizados
// sozinhos, sem precisar puxar pra atualizar manualmente.
export function useAutoRefresh(callback, intervaloMs = INTERVALO_PADRAO_MS) {
  useEffect(() => {
    const id = setInterval(callback, intervaloMs)
    return () => clearInterval(id)
  }, [callback, intervaloMs])
}
