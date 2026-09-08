import { useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import Button from './Button.jsx'
import { formatQuantidade } from '../lib/format.js'

export default function MovimentacaoModal({ item, onConfirm, onCancel, salvando, pedirValor }) {
  const [tipo, setTipo] = useState('entrada')
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState('')
  const [valorPago, setValorPago] = useState('')

  if (!item) return null

  function handleSubmit(e) {
    e.preventDefault()
    const qtd = Number(quantidade)
    if (!qtd || qtd <= 0) return
    onConfirm({
      tipo,
      quantidade: qtd,
      motivo: motivo.trim() || (tipo === 'entrada' ? 'Compra' : 'Uso em produção'),
      valorTotal: pedirValor && tipo === 'entrada' ? Number(valorPago) || null : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl flex flex-col gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">{item.nome}</h2>
          <p className="text-sm text-[var(--color-brown-mid)]">
            Estoque atual: {formatQuantidade(item.quantidadeAtual)} {item.unidadeLabel}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipo('entrada')}
            className={`min-h-[52px] rounded-2xl font-semibold flex items-center justify-center gap-2 border-2 ${
              tipo === 'entrada'
                ? 'bg-[var(--color-success)]/10 border-[var(--color-success)] text-[var(--color-success)]'
                : 'border-[var(--color-beige)] text-[var(--color-brown-mid)]'
            }`}
          >
            <ArrowDownCircle size={20} /> Entrada
          </button>
          <button
            type="button"
            onClick={() => setTipo('saida')}
            className={`min-h-[52px] rounded-2xl font-semibold flex items-center justify-center gap-2 border-2 ${
              tipo === 'saida'
                ? 'bg-[var(--color-alert)]/10 border-[var(--color-alert)] text-[var(--color-alert)]'
                : 'border-[var(--color-beige)] text-[var(--color-brown-mid)]'
            }`}
          >
            <ArrowUpCircle size={20} /> Saída
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Quantidade ({item.unidadeLabel})</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.001"
            min="0"
            autoFocus
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className="min-h-[52px] rounded-2xl border-2 border-[var(--color-beige)] px-4 text-lg outline-none focus:border-[var(--color-rose)]"
          />
        </label>

        {pedirValor && tipo === 'entrada' && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Quanto pagou? (opcional)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={valorPago}
              onChange={(e) => setValorPago(e.target.value)}
              placeholder="R$ 0,00"
              className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
            />
            <span className="text-xs text-[var(--color-brown-mid)]">
              Se preencher, essa compra entra certinha no Financeiro como saída.
            </span>
          </label>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Motivo (opcional)</span>
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={tipo === 'entrada' ? 'Ex: Compra no mercado' : 'Ex: Uso em produção'}
            className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
          />
        </label>

        <div className="flex flex-col gap-3 pt-2">
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Registrando...' : 'Registrar'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
