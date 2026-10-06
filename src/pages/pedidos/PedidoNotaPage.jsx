import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Printer, CheckCircle2 } from 'lucide-react'
import { getVenda, marcarNotinhaImpressa } from '../../hooks/useVendas.js'
import { formatCurrency, formatDate, formatQuantidadeProduto } from '../../lib/format.js'
import { FORMAS_PAGAMENTO } from '../../lib/formasPagamento.js'

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

function agoraFormatado() {
  return new Date().toLocaleString('pt-BR')
}

function nomeCliente(venda) {
  if (venda.clientes?.nome) return venda.clientes.nome
  if (venda.ifood) return `iFood · ${venda.titulo || 'Sem nome'}`
  if (venda.pedido_online) return venda.titulo || 'Sem nome'
  return 'Cliente a definir'
}

export default function PedidoNotaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [venda, setVenda] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [jaEstavaImpressa, setJaEstavaImpressa] = useState(false)
  const [papel, setPapel] = useState(lerPapelSalvo)

  function escolherPapel(valor) {
    setPapel(valor)
    try {
      localStorage.setItem('notinha_papel', valor)
    } catch {
      // sem armazenamento disponível: só não lembra a escolha
    }
  }

  useEffect(() => {
    let ativo = true
    getVenda(id)
      .then((v) => {
        if (!ativo) return
        setVenda(v)
        setJaEstavaImpressa(Boolean(v.notinha_impressa))
      })
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [id])

  function handleImprimir() {
    marcarNotinhaImpressa(id, true).catch(() => {})
    window.print()
  }

  if (carregando) {
    return <p className="text-center text-[var(--color-brown-mid)] py-10">Carregando...</p>
  }

  if (!venda) {
    return <p className="text-center text-[var(--color-brown-mid)] py-10">Pedido não encontrado.</p>
  }

  const isOrcamento = venda.status === 'orcamento'
  const rotuloPagamento = FORMAS_PAGAMENTO.find((f) => f.value === venda.forma_pagamento)?.label
  const telefone = venda.clientes?.telefone || venda.telefone_pedido
  const util = PAPEIS.find((p) => p.value === papel).util

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
          onClick={handleImprimir}
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
        <div className="text-center mb-2">
          <p className="font-extrabold text-[16px]">GANDA COZINHA
            <br className="hidden print:inline" /> ARTESANAL</p>
          <p>{isOrcamento ? `Orçamento — ${venda.titulo}` : `Pedido #${venda.numero_pedido}`}</p>
        </div>

        <div className="border-t border-dashed border-black my-1.5" />

        <p>Cliente: {nomeCliente(venda)}</p>
        {telefone && <p>Tel: {telefone}</p>}
        {venda.endereco_entrega && <p>Entregar em: {venda.endereco_entrega}</p>}
        <p>Data: {formatDate(venda.data_venda)}</p>
        {venda.data_entrega && <p>Entrega: {formatDate(venda.data_entrega)}</p>}

        <div className="border-t border-dashed border-black my-1.5" />

        {venda.venda_itens.map((item, i) => (
          <div key={i} className="mb-1">
            <p>{item.produtos?.nome || 'Produto removido'}</p>
            <div className="flex justify-between">
              <span>
                {formatQuantidadeProduto(item.quantidade, item.produtos?.rendimento_unidade_medida)} x{' '}
                {formatCurrency(item.preco_unitario)}
              </span>
              <span>{formatCurrency(item.preco_unitario * item.quantidade)}</span>
            </div>
          </div>
        ))}

        <div className="border-t border-dashed border-black my-1.5" />

        {Number(venda.desconto) > 0 && (
          <div className="flex justify-between">
            <span>Desconto</span>
            <span>-{formatCurrency(venda.desconto)}</span>
          </div>
        )}
        {Number(venda.custo_entrega) > 0 && (
          <div className="flex justify-between">
            <span>Frete</span>
            <span>+{formatCurrency(venda.custo_entrega)}</span>
          </div>
        )}
        <div className="flex justify-between font-extrabold text-[18px] mt-1">
          <span>TOTAL</span>
          <span>{formatCurrency(venda.valor_total)}</span>
        </div>

        <div className="border-t border-dashed border-black my-1.5" />

        <p>Pagamento: {rotuloPagamento || 'A combinar'}</p>
        <p>{venda.pago ? 'PAGO' : 'NÃO PAGO'}</p>

        {venda.observacao && (
          <>
            <div className="border-t border-dashed border-black my-1.5" />
            <p>Obs: {venda.observacao}</p>
          </>
        )}

        <div className="border-t border-dashed border-black my-1.5" />
        <p className="text-center mt-1">Obrigada pela preferência!</p>
        <p className="text-center text-[11px] mt-1">{agoraFormatado()}</p>
      </div>
    </div>
  )
}
