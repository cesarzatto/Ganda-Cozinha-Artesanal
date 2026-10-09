import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getEncomenda, marcarEncomendaNotinhaImpressa } from '../../hooks/useEncomendas.js'
import { formatCurrency, formatDate, formatQuantidade } from '../../lib/format.js'
import { FORMAS_PAGAMENTO } from '../../lib/formasPagamento.js'
import NotinhaShell, { agoraFormatado } from '../../components/NotinhaShell.jsx'

export default function EncomendaNotaPage() {
  const { id } = useParams()
  const [encomenda, setEncomenda] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [jaEstavaImpressa, setJaEstavaImpressa] = useState(false)

  useEffect(() => {
    let ativo = true
    getEncomenda(id)
      .then((e) => {
        if (!ativo) return
        setEncomenda(e)
        setJaEstavaImpressa(Boolean(e.notinha_impressa))
      })
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [id])

  function handleImprimir() {
    marcarEncomendaNotinhaImpressa(id, true).catch(() => {})
    window.print()
  }

  if (carregando) {
    return <p className="text-center text-[var(--color-brown-mid)] py-10">Carregando...</p>
  }

  if (!encomenda) {
    return <p className="text-center text-[var(--color-brown-mid)] py-10">Encomenda não encontrada.</p>
  }

  const nome = encomenda.clientes?.nome || encomenda.cliente_nome
  const telefone = encomenda.clientes?.telefone
  const rotuloPagamento = FORMAS_PAGAMENTO.find((f) => f.value === encomenda.forma_pagamento)?.label

  return (
    <NotinhaShell jaEstavaImpressa={jaEstavaImpressa} onImprimir={handleImprimir}>
      <div className="text-center mb-2">
        <p className="font-extrabold text-[16px]">
          GANDA COZINHA
          <br className="hidden print:inline" /> ARTESANAL
        </p>
        <p>Encomenda #{encomenda.numero}</p>
      </div>

      <div className="border-t border-dashed border-black my-1.5" />

      <p>Cliente: {nome}</p>
      {telefone && <p>Tel: {telefone}</p>}
      {encomenda.endereco_entrega && <p>Entregar em: {encomenda.endereco_entrega}</p>}
      <p>Data: {formatDate(encomenda.data_encomenda)}</p>
      {encomenda.data_entrega && <p>Entrega: {formatDate(encomenda.data_entrega)}</p>}

      <div className="border-t border-dashed border-black my-1.5" />

      {encomenda.itens.map((item, i) => (
        <div key={i} className="mb-1">
          <p>{item.descricao}</p>
          <div className="flex justify-between">
            <span>
              {formatQuantidade(item.quantidade)} x {formatCurrency(item.valor_unitario)}
            </span>
            <span>{formatCurrency(item.quantidade * item.valor_unitario)}</span>
          </div>
        </div>
      ))}

      <div className="border-t border-dashed border-black my-1.5" />

      <div className="flex justify-between font-extrabold text-[18px] mt-1">
        <span>TOTAL</span>
        <span>{formatCurrency(encomenda.valor_total)}</span>
      </div>

      <div className="border-t border-dashed border-black my-1.5" />

      <p>Pagamento: {rotuloPagamento || 'A combinar'}</p>
      <p>{encomenda.pago ? 'PAGO' : 'NÃO PAGO'}</p>

      {encomenda.observacao && (
        <>
          <div className="border-t border-dashed border-black my-1.5" />
          <p>Obs: {encomenda.observacao}</p>
        </>
      )}

      <div className="border-t border-dashed border-black my-1.5" />
      <p className="text-center mt-1">Obrigada pela preferência!</p>
      <p className="text-center text-[11px] mt-1">{agoraFormatado()}</p>
    </NotinhaShell>
  )
}
