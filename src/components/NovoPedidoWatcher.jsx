import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient.js'

const INTERVALO_MS = 60000

// Toca uma sequência de beeps alta e insistente (de propósito "chata") —
// sintetizada via Web Audio, sem precisar de nenhum arquivo de áudio.
function tocarAlerta() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    if (ctx.state === 'suspended') ctx.resume()

    const agora = ctx.currentTime
    const BEEPS = 6
    for (let i = 0; i < BEEPS; i++) {
      const inicio = agora + i * 0.35
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = i % 2 === 0 ? 988 : 784
      gain.gain.setValueAtTime(0.0001, inicio)
      gain.gain.exponentialRampToValueAtTime(0.35, inicio + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.28)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(inicio)
      osc.stop(inicio + 0.3)
    }
    setTimeout(() => ctx.close(), (BEEPS * 0.35 + 0.5) * 1000)
  } catch {
    // navegador sem suporte a Web Audio: ignora silenciosamente
  }
}

// Fica de olho em pedidos novos vindos da loja online (com ou sem cliente
// cadastrado) e toca um alerta sonoro quando aparece um que ainda não
// tínhamos visto nessa sessão. Montado uma vez, em qualquer tela do app.
export default function NovoPedidoWatcher() {
  const maiorNumeroVistoRef = useRef(null)
  const primeiraChecagemRef = useRef(true)

  useEffect(() => {
    let ativo = true

    async function checar() {
      const { data, error } = await supabase
        .from('vendas')
        .select('numero_pedido')
        .eq('pedido_online', true)
        .order('numero_pedido', { ascending: false })
        .limit(1)
      if (!ativo || error) return

      const maior = data?.[0]?.numero_pedido ?? 0

      if (primeiraChecagemRef.current) {
        maiorNumeroVistoRef.current = maior
        primeiraChecagemRef.current = false
        return
      }

      if (maior > (maiorNumeroVistoRef.current ?? 0)) {
        tocarAlerta()
        maiorNumeroVistoRef.current = maior
      }
    }

    checar()
    const id = setInterval(checar, INTERVALO_MS)
    return () => {
      ativo = false
      clearInterval(id)
    }
  }, [])

  return null
}
