import { useMemo } from 'react'
import { useEncomendas } from '../../hooks/useEncomendas.js'
import { useProdutos } from '../../hooks/useProdutos.js'
import { formatDate, formatQuantidade, formatQuantidadeProduto } from '../../lib/format.js'
import { consolidarProducao } from '../../lib/producao.js'
import NotinhaShell, { agoraFormatado } from '../../components/NotinhaShell.jsx'

function Origem({ pedido, quantidade }) {
  return (
    <>
      <p className="text-[12px]">
        {quantidade != null ? `${formatQuantidade(quantidade)}x — ` : ''}#{pedido.numero} {pedido.cliente}
      </p>
      <p className="text-[11px] pl-2">entrega: {pedido.entrega ? formatDate(pedido.entrega) : 'sem data'}</p>
    </>
  )
}

// Notinha única para a cozinha com tudo que está nas encomendas e ainda não
// foi feito (encomenda só vira pedido depois de pronta).
export default function ProducaoGeralPage() {
  const { encomendas, loading } = useEncomendas()
  const { produtos, loading: carregandoProdutos } = useProdutos()
  const { marmitas, especiais, totalEncomendas } = useMemo(
    () => consolidarProducao(encomendas, produtos),
    [encomendas, produtos],
  )

  if (loading || carregandoProdutos) {
    return <p className="text-center text-[var(--color-brown-mid)] py-10">Carregando...</p>
  }

  const nadaAProduzir = marmitas.length === 0 && especiais.length === 0

  return (
    <NotinhaShell jaEstavaImpressa={false} onImprimir={() => window.print()}>
      <div className="text-center mb-2">
        <p className="font-extrabold text-[16px]">A PRODUZIR</p>
        <p>
          {totalEncomendas} encomenda{totalEncomendas === 1 ? '' : 's'}
        </p>
      </div>

      <div className="border-t border-dashed border-black my-1.5" />

      {nadaAProduzir && <p>Nenhuma encomenda pendente.</p>}

      {marmitas.length > 0 && (
        <>
          <p className="font-extrabold">MARMITAS</p>
          {marmitas.map((marmita) => (
            <div key={marmita.nome} className="mb-2">
              <p>{marmita.nome}</p>
              <p>
                Encomendado: {formatQuantidadeProduto(marmita.encomendado, marmita.unidade)}
                {!marmita.sobDemanda && <> · Estoque: {formatQuantidade(marmita.estoque)}</>}
              </p>
              <p className="font-extrabold text-[16px]">
                {marmita.fazer > 0
                  ? `FAZER: ${formatQuantidadeProduto(marmita.fazer, marmita.unidade)}`
                  : 'Já tem em estoque'}
              </p>
              {marmita.encomendas.map((encomenda, i) => (
                <Origem key={i} pedido={encomenda} quantidade={encomenda.quantidade} />
              ))}
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
              <p className="font-extrabold text-[16px]">FAZER: {formatQuantidade(item.total)}x</p>
              {item.encomendas.map((encomenda, j) => (
                <Origem key={j} pedido={encomenda} quantidade={encomenda.quantidade} />
              ))}
            </div>
          ))}
        </>
      )}

      <div className="border-t border-dashed border-black my-1.5" />
      <p className="text-center text-[11px] mt-1">{agoraFormatado()}</p>
    </NotinhaShell>
  )
}
