import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useVendasSemCliente } from '../hooks/useVendas.js'

export default function PedidoSemClienteAlertBanner() {
  const navigate = useNavigate()
  const { vendas } = useVendasSemCliente()

  if (vendas.length === 0) return null

  const primeiro = vendas[0]

  return (
    <button
      onClick={() => navigate(vendas.length === 1 ? `/vendas/${primeiro.id}` : '/pedidos')}
      className="w-full flex items-center gap-2 rounded-2xl p-3.5 text-left text-sm font-semibold mb-4 bg-[var(--color-alert)] text-white shadow-[0_2px_10px_rgba(143,26,32,0.35)] active:opacity-90"
    >
      <AlertTriangle size={20} className="shrink-0" />
      <span>
        {vendas.length === 1
          ? `Pedido da loja online sem cliente cadastrado: ${primeiro.titulo || 'Sem nome'}`
          : `${vendas.length} pedidos da loja online sem cliente cadastrado`}
      </span>
    </button>
  )
}
