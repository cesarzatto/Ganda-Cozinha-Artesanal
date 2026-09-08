import { AlertTriangle } from 'lucide-react'
import { formatQuantidade } from '../lib/format.js'

export default function StockBadge({ quantidade, unidade, minimo }) {
  const baixo = Number(quantidade) <= Number(minimo)

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
        baixo
          ? 'bg-[var(--color-alert)]/10 text-[var(--color-alert)]'
          : 'bg-[var(--color-beige)] text-[var(--color-brown-dark)]'
      }`}
    >
      {baixo && <AlertTriangle size={14} />}
      {formatQuantidade(quantidade)} {unidade}
    </span>
  )
}
