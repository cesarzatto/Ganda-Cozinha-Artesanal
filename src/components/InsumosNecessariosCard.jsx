import { ClipboardList } from 'lucide-react'
import Card from './Card.jsx'
import { formatQuantidade } from '../lib/format.js'

export default function InsumosNecessariosCard({ linhas, carregando }) {
  if (!carregando && linhas.length === 0) return null

  return (
    <Card className="flex flex-col gap-3">
      <span className="text-sm font-semibold flex items-center gap-1.5">
        <ClipboardList size={16} className="text-[var(--color-rose)]" />
        Insumos necessários para este pedido
      </span>

      {carregando ? (
        <p className="text-sm text-[var(--color-brown-mid)]">Calculando...</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {linhas.map((linha) => (
            <div key={linha.insumoId} className="flex justify-between text-sm">
              <span className="text-[var(--color-brown-mid)]">{linha.nome}</span>
              <span className="font-semibold">
                {formatQuantidade(linha.quantidade)} {linha.unidadeMedida}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
