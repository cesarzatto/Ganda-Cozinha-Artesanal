import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Printer, CheckCircle2 } from 'lucide-react'

// Largura do papel da impressora térmica → área realmente imprimível (mm).
// A área útil é menor que o papel: as impressoras não imprimem até a borda.
const PAPEIS = [
  { value: '58', label: '58 mm', util: 44 },
  { value: '80', label: '80 mm', util: 68 },
]

function lerPapelSalvo() {
  try {
    const salvo = localStorage.getItem('notinha_papel')
    return PAPEIS.some((p) => p.value === salvo) ? salvo : '80'
  } catch {
    return '80'
  }
}

// Moldura da notinha (barra de impressão, seletor de papel e estilos de
// impressão). O conteúdo de cada tipo de pedido entra como children.
export default function NotinhaShell({ jaEstavaImpressa, onImprimir, children }) {
  const navigate = useNavigate()
  const [papel, setPapel] = useState(lerPapelSalvo)
  const util = PAPEIS.find((p) => p.value === papel).util

  function escolherPapel(valor) {
    setPapel(valor)
    try {
      localStorage.setItem('notinha_papel', valor)
    } catch {
      // sem armazenamento disponível: só não lembra a escolha
    }
  }

  return (
    <div className="min-h-full bg-[var(--color-bg)] print:bg-white">
      <style>
        {`.nota { width: ${papel}mm } @media print { @page { size: ${papel}mm auto; margin: 2mm 0; } .nota { width: ${util}mm } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}
      </style>

      <div className="print:hidden sticky top-0 z-10 bg-[var(--color-brown-dark)] text-white px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={onImprimir}
          className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 font-semibold active:bg-white/20"
        >
          <Printer size={18} /> Imprimir notinha
        </button>
      </div>

      <div className="print:hidden max-w-[80mm] mx-auto mt-3 px-3 flex items-center gap-2 text-xs font-semibold text-[var(--color-brown-dark)]">
        <span>Papel da impressora:</span>
        {PAPEIS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => escolherPapel(value)}
            className={`rounded-xl px-3 py-1.5 border-2 ${
              papel === value
                ? 'border-[var(--color-brown-dark)] bg-[var(--color-beige)]/60'
                : 'border-[var(--color-beige)] bg-white text-[var(--color-brown-mid)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {jaEstavaImpressa && (
        <div className="print:hidden max-w-[80mm] mx-auto mt-3 flex items-center gap-2 rounded-2xl bg-[var(--color-beige)] text-[var(--color-brown-dark)] px-3 py-2 text-xs font-semibold">
          <CheckCircle2 size={16} className="shrink-0" />
          Essa notinha já foi impressa antes. Imprimir de novo é só reimpressão.
        </div>
      )}

      <div className="nota mx-auto bg-white p-2 print:px-[3px] print:pt-3 print:pb-4 font-mono text-[13px] font-semibold leading-snug text-black break-words">
        {children}
      </div>
    </div>
  )
}

export function agoraFormatado() {
  return new Date().toLocaleString('pt-BR')
}
