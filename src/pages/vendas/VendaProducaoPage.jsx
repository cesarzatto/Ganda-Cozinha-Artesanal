import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getVenda } from '../../hooks/useVendas.js'
import { formatDate, formatQuantidade, formatQuantidadeProduto } from '../../lib/format.js'
import { listarProducao } from '../../lib/producao.js'
import NotinhaShell, { agoraFormatado } from '../../components/NotinhaShell.jsx'

function nomeCliente(venda) {
  if (venda.clientes?.nome) return venda.clientes.nome
  if (venda.ifood) return `iFood · ${venda.titulo || 'Sem nome'}`
  if (venda.pedido_online) return venda.titulo || 'Sem nome'
  return 'Cliente a definir'
}

// Notinha para a cozinha: só o que ainda precisa ser feito neste pedido.
export default function VendaProducaoPage() {
  const { id } = useParams()
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

  const { catalogo, personalizados, temProducao } = listarProducao(venda)

  return (
    <NotinhaShell jaEstavaImpressa={false} onImprimir={() => window.print()}>
      <div className="text-center mb-2">
        <p className="font-extrabold text-[16px]">PRODUÇÃO</p>
        <p>Pedido #{venda.numero_pedido}</p>
      </div>

      <div className="border-t border-dashed border-black my-1.5" />

      <p>Cliente: {nomeCliente(venda)}</p>
      {venda.data_entrega ? (
        <p className="font-extrabold text-[16px]">ENTREGA: {formatDate(venda.data_entrega)}</p>
      ) : (
        <p>Entrega: a combinar</p>
      )}

      <div className="border-t border-dashed border-black my-1.5" />

      {!temProducao && <p>Nada a produzir neste pedido.</p>}

      {catalogo.length > 0 && (
        <>
          <p className="font-extrabold">MARMITAS</p>
          {catalogo.map((item, i) => (
            <div key={i} className="mb-1.5">
              <p>{item.nome}</p>
              <p className="font-extrabold text-[16px]">
                Fazer: {formatQuantidadeProduto(item.produzir, item.unidade)}
              </p>
              {item.produzir < item.pedido && (
                <p className="text-[11px]">(pedido {formatQuantidade(item.pedido)}, o resto já tem pronto)</p>
              )}
            </div>
          ))}
        </>
      )}

      {personalizados.length > 0 && (
        <>
          {catalogo.length > 0 && <div className="border-t border-dashed border-black my-1.5" />}
          <p className="font-extrabold">ITENS ESPECIAIS</p>
          {personalizados.map((item, i) => (
            <div key={i} className="mb-1.5">
              <p>{item.nome}</p>
              <p className="font-extrabold text-[16px]">Fazer: {formatQuantidade(item.produzir)}x</p>
            </div>
          ))}
        </>
      )}

      {venda.observacao && (
        <>
          <div className="border-t border-dashed border-black my-1.5" />
          <p>Obs: {venda.observacao}</p>
        </>
      )}

      <div className="border-t border-dashed border-black my-1.5" />
      <p className="text-center text-[11px] mt-1">{agoraFormatado()}</p>
    </NotinhaShell>
  )
}
