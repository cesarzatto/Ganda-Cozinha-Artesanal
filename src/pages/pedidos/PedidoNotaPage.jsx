import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getVenda, marcarNotinhaImpressa } from '../../hooks/useVendas.js'
import { contarItens, formatCurrency, formatDate, formatQuantidade, formatQuantidadeProduto, formatTotalItens } from '../../lib/format.js'
import { FORMAS_PAGAMENTO } from '../../lib/formasPagamento.js'
import NotinhaShell, { agoraFormatado } from '../../components/NotinhaShell.jsx'

function nomeCliente(venda) {
  if (venda.clientes?.nome) return venda.clientes.nome
  if (venda.ifood) return `iFood · ${venda.titulo || 'Sem nome'}`
  if (venda.pedido_online) return venda.titulo || 'Sem nome'
  return 'Cliente a definir'
}

export default function PedidoNotaPage() {
  const { id } = useParams()
  const [venda, setVenda] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [jaEstavaImpressa, setJaEstavaImpressa] = useState(false)

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

  return (
    <NotinhaShell jaEstavaImpressa={jaEstavaImpressa} onImprimir={handleImprimir}>
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
                {formatQuantidadeProduto(item.quantidade, item.produtos?.rendimento_unidade_medida).replace(/x$/, '')} x{' '}
                {formatCurrency(item.preco_unitario)}
              </span>
              <span>{formatCurrency(item.preco_unitario * item.quantidade)}</span>
            </div>
          </div>
        ))}

        {(venda.itens_personalizados || []).map((item, i) => (
          <div key={`esp-${i}`} className="mb-1">
            <p>{item.descricao}</p>
            <div className="flex justify-between">
              <span>
                {formatQuantidade(item.quantidade)} x {formatCurrency(item.valor_unitario)}
              </span>
              <span>{formatCurrency(item.valor_unitario * item.quantidade)}</span>
            </div>
          </div>
        ))}

        <p className="font-extrabold text-right">
          {formatTotalItens(contarItens(venda.venda_itens, venda.itens_personalizados || []))}
        </p>

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
    </NotinhaShell>
  )
}
