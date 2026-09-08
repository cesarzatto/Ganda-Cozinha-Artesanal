import { X } from 'lucide-react'
import ClienteForm from './ClienteForm.jsx'

export default function ClienteQuickCreateModal({ open, valoresIniciais, onCriado, onFechar }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-display text-xl font-semibold">Novo cliente</h2>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="w-9 h-9 rounded-full bg-[var(--color-beige)]/60 flex items-center justify-center active:bg-[var(--color-beige)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto">
          <ClienteForm valoresIniciais={valoresIniciais} onSalvo={onCriado} onCancelar={onFechar} />
        </div>
      </div>
    </div>
  )
}
