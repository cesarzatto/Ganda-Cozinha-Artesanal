import { useMemo } from 'react'
import { useVendas } from '../../hooks/useVendas.js'
import { formatDate, formatQuantidade, formatQuantidadeProduto } from '../../lib/format.js'
import { consolidarProducao } from '../../lib/producao.js'
import NotinhaShell, { agoraFormatado } from '../../components/NotinhaShell.jsx'

function Origem({ pedido }) {
  return (
    <p className="text-[12px]">
      #{pedido.numero} {pedido.cliente} · {pedido.entrega ? formatDate(pedido.entrega) : 'sem data'}
    </p>
  )
}

// Notinha única para a cozinha com tudo que falta produzir, de todos os
// pedidos ainda não entregues.
export default function ProducaoGeralPage() {
  const { vendas, loading } = useVendas()
  const { marmitas, especiais, totalPedidos } = useMemo(() => consolidarProducao(vendas), [vendas])

  if (loading) {
    return <p className="text-center text-[var(--color-brown-mid)] py-10">Carregando...</p>
  }

  const nadaAProduzir = marmitas.length === 0 && especiais.length === 0

  return (
    <NotinhaShell jaEstavaImpressa={false} onImprimir={() => window.print()}>
      <div className="text-center mb-2">
        <p className="font-extrabold text-[16px]">PRODUÇÃO GERAL</p>
        <p>
          {totalPedidos} pedido{totalPedidos === 1 ? '' : 's'} com itens a produzir
        </p>
      </div>

      <div className="border-t border-dashed border-black my-1.5" />

      {nadaAProduzir && <p>Nada a produzir no momento.</p>}

      {marmitas.length > 0 && (
        <>
          <p className="font-extrabold">MARMITAS</p>
          {marmitas.map((marmita) => (
            <div key={marmita.nome} className="mb-2">
              <p>{marmita.nome}</p>
              <p className="font-extrabold text-[16px]">
                Fazer: {formatQuantidadeProduto(marmita.total, marmita.unidade)}
              </p>
              {marmita.pedidos.length > 1 || marmita.pedidos[0].quantidade !== marmita.total ? (
                marmita.pedidos.map((pedido, i) => (
                  <div key={i}>
                    <p className="text-[12px]">
                      {formatQuantidade(pedido.quantidade)}x — #{pedido.numero} {pedido.cliente}
                    </p>
                    <p className="text-[11px] pl-2">
                      entrega: {pedido.entrega ? formatDate(pedido.entrega) : 'sem data'}
                    </p>
                  </div>
                ))
              ) : (
                <Origem pedido={marmita.pedidos[0]} />
              )}
            </div>
          ))}
        </>
      )}

      {especiais.length > 0 && (
        <>
          {marmitas.length > 0 && <div className="border-t border-dashed border-black my-1.5" />}
          <p className="font-extrabold">ITENS ESPECIAIS</p>
          {especiais.map((item, i) => (
            <div key={i} className="mb-2">
              <p>{item.nome}</p>
              <p className="font-extrabold text-[16px]">Fazer: {formatQuantidade(item.quantidade)}x</p>
              <Origem pedido={item} />
            </div>
          ))}
        </>
      )}

      <div className="border-t border-dashed border-black my-1.5" />
      <p className="text-center text-[11px] mt-1">{agoraFormatado()}</p>
    </NotinhaShell>
  )
}
