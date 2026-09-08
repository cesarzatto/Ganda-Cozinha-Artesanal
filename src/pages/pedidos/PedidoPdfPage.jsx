import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Printer } from 'lucide-react'
import { getVenda } from '../../hooks/useVendas.js'
import { formatCurrency, formatDate, formatQuantidadeProduto } from '../../lib/format.js'
import { FORMAS_CONTATO } from '../../lib/formasContato.js'
import { FORMAS_PAGAMENTO } from '../../lib/formasPagamento.js'
import logo from '../../assets/logo-ganda-badge.png'

function hojeFormatado() {
  return new Date().toLocaleDateString('pt-BR')
}

export default function PedidoPdfPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [venda, setVenda] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    getVenda(id)
      .then((v) => ativo && setVenda(v))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [id])

  if (carregando) {
    return <p className="text-center text-[var(--color-brown-mid)] py-10">Carregando...</p>
  }

  if (!venda) {
    return <p className="text-center text-[var(--color-brown-mid)] py-10">Pedido não encontrado.</p>
  }

  const isOrcamento = venda.status === 'orcamento'
  const rotuloContato = FORMAS_CONTATO.find((f) => f.value === venda.forma_contato)?.label
  const rotuloPagamento = FORMAS_PAGAMENTO.find((f) => f.value === venda.forma_pagamento)?.label

  return (
    <div className="min-h-full bg-[var(--color-bg)] print:bg-white">
      <div className="print:hidden sticky top-0 z-10 bg-[var(--color-brown-dark)] text-white px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 font-semibold active:bg-white/20"
        >
          <Printer size={18} /> Imprimir / Salvar PDF
        </button>
      </div>

      <div className="max-w-xl mx-auto bg-white p-8 print:p-0 print:max-w-none">
        <div className="flex items-center gap-4 mb-6">
          <img src={logo} alt="Ganda Cozinha Artesanal" className="w-16 h-16 rounded-full" />
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--color-brown-dark)]">Ganda Cozinha Artesanal</h1>
            <p className="text-[var(--color-brown-mid)] text-sm">
              {isOrcamento ? `Orçamento — ${venda.titulo}` : `Pedido #${venda.numero_pedido}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-[var(--color-brown-mid)]">Cliente</p>
            <p className="font-semibold">
              {venda.clientes?.nome ||
                (venda.ifood
                  ? `iFood · ${venda.titulo || 'Sem nome'}`
                  : venda.pedido_online
                    ? venda.titulo || 'Sem nome'
                    : 'A definir')}
            </p>
            {venda.clientes?.telefone && <p>{venda.clientes.telefone}</p>}
            {!venda.clientes?.telefone && venda.telefone_pedido && <p>{venda.telefone_pedido}</p>}
          </div>
          <div>
            <p className="text-[var(--color-brown-mid)]">Data</p>
            <p className="font-semibold">{formatDate(venda.data_venda)}</p>
            {venda.data_entrega && (
              <>
                <p className="text-[var(--color-brown-mid)] mt-1">Entrega prevista</p>
                <p className="font-semibold">{formatDate(venda.data_entrega)}</p>
              </>
            )}
            {isOrcamento && venda.data_validade && (
              <>
                <p className="text-[var(--color-brown-mid)] mt-1">Válido até</p>
                <p className="font-semibold">{formatDate(venda.data_validade)}</p>
              </>
            )}
          </div>
        </div>

        <table className="w-full text-sm mb-4 border-collapse">
          <thead>
            <tr className="border-b-2 border-[var(--color-beige)] text-left">
              <th className="py-2">Produto</th>
              <th className="py-2 text-center">Qtd.</th>
              <th className="py-2 text-right">Unit.</th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {venda.venda_itens.map((item, i) => (
              <tr key={i} className="border-b border-[var(--color-beige)]">
                <td className="py-2">{item.produtos?.nome || 'Produto removido'}</td>
                <td className="py-2 text-center">
                  {formatQuantidadeProduto(item.quantidade, item.produtos?.rendimento_unidade_medida).replace(
                    /x$/,
                    '',
                  )}
                </td>
                <td className="py-2 text-right">{formatCurrency(item.preco_unitario)}</td>
                <td className="py-2 text-right">{formatCurrency(item.preco_unitario * item.quantidade)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col items-end gap-1 text-sm mb-6">
          {Number(venda.desconto) > 0 && (
            <p>
              <span className="text-[var(--color-brown-mid)]">Desconto: </span>
              <span>-{formatCurrency(venda.desconto)}</span>
            </p>
          )}
          <p className="font-display text-xl font-semibold text-[var(--color-brown-dark)]">
            Total: {formatCurrency(venda.valor_total)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          {rotuloContato && (
            <div>
              <p className="text-[var(--color-brown-mid)]">Contato</p>
              <p className="font-semibold">{rotuloContato}</p>
            </div>
          )}
          {rotuloPagamento && (
            <div>
              <p className="text-[var(--color-brown-mid)]">Pagamento</p>
              <p className="font-semibold">{rotuloPagamento}</p>
            </div>
          )}
        </div>

        {venda.observacao && (
          <div className="mb-6 text-sm">
            <p className="text-[var(--color-brown-mid)]">Observação</p>
            <p>{venda.observacao}</p>
          </div>
        )}

        <p className="text-xs text-[var(--color-brown-mid)] text-center mt-10">Gerado em {hojeFormatado()}</p>
      </div>
    </div>
  )
}
