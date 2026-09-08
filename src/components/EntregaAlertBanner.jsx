import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useEntregasPendentes } from '../hooks/useVendas.js'
import { urgenciaEntrega } from '../lib/entregas.js'

export default function EntregaAlertBanner() {
  const navigate = useNavigate()
  const { entregas } = useEntregasPendentes()

  const urgentes = entregas
    .map((e) => ({ venda: e, urgencia: urgenciaEntrega(e.data_entrega) }))
    .filter((e) => e.urgencia.dias <= 5)

  if (urgentes.length === 0) return null

  const maisUrgente = urgentes[0]
  const cor = maisUrgente.urgencia.nivel === 'atencao' ? 'amarelo' : 'vermelho'

  return (
    <button
      onClick={() => navigate('/pedidos?aba=entregas')}
      className={`w-full flex items-center gap-2 rounded-2xl p-3 text-left text-sm font-semibold mb-4 ${
        cor === 'vermelho'
          ? 'bg-[var(--color-alert)]/10 text-[var(--color-alert)]'
          : 'bg-[var(--color-beige)] text-[var(--color-brown-dark)]'
      }`}
    >
      <AlertTriangle size={18} className="shrink-0" />
      <span>
        {urgentes.length === 1
          ? `1 entrega precisa de atenção: ${maisUrgente.venda.clientes?.nome || maisUrgente.venda.titulo || 'pedido'} — ${maisUrgente.urgencia.texto.toLowerCase()}`
          : `${urgentes.length} entregas precisam de atenção nos próximos dias`}
      </span>
    </button>
  )
}
