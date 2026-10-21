import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Printer } from 'lucide-react'
import { useEncomendas } from '../../hooks/useEncomendas.js'
import { useProdutos } from '../../hooks/useProdutos.js'
import { formatDate, formatQuantidade, formatQuantidadeProduto } from '../../lib/format.js'
import { consolidarProducao } from '../../lib/producao.js'
import logo from '../../assets/logo-ganda-badge.png'

function DetalheEncomendas({ encomendas }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {encomendas.map((e, i) => (
        <li key={i}>
          <span className="font-semibold">{formatQuantidade(e.quantidade)}x</span> — #{e.numero} {e.cliente}
          <span className="text-[var(--color-brown-mid)]">
            {' '}
            · entrega: {e.entrega ? formatDate(e.entrega) : 'sem data'}
          </span>
        </li>
      ))}
    </ul>
  )
}

const celula = 'border border-[var(--color-beige)] px-2 py-2 align-top'
const cabecalho = 'border border-[var(--color-beige)] bg-[var(--color-beige)]/50 px-2 py-2 text-left font-semibold'

// Folha A4 (impressora comum) com tudo que está nas encomendas e ainda não
// foi feito — encomenda só vira pedido depois de pronta.
export default function ProducaoGeralPage() {
  const navigate = useNavigate()
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
    <div className="min-h-full bg-[var(--color-bg)] print:bg-white">
      <style>{'@media print { @page { size: A4; margin: 12mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }'}</style>

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
          <Printer size={18} /> Imprimir (A4)
        </button>
      </div>

      <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 print:p-0 print:max-w-none text-[14px] text-[var(--color-brown-dark)]">
        <div className="flex items-center gap-4 mb-6">
          <img src={logo} alt="Ganda Cozinha Artesanal" className="w-14 h-14 rounded-full" />
          <div className="flex-1">
            <h1 className="font-display text-2xl font-semibold">A produzir</h1>
            <p className="text-[var(--color-brown-mid)] text-sm">
              Ganda Cozinha Artesanal · {totalEncomendas} encomenda{totalEncomendas === 1 ? '' : 's'} pendente
              {totalEncomendas === 1 ? '' : 's'}
            </p>
          </div>
          <p className="text-xs text-[var(--color-brown-mid)] text-right">
            Emitido em
            <br />
            {new Date().toLocaleString('pt-BR')}
          </p>
        </div>

        {nadaAProduzir && <p>Nenhuma encomenda pendente.</p>}

        {marmitas.length > 0 && (
          <section className="mb-6">
            <h2 className="font-display text-lg font-semibold mb-2">Marmitas</h2>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${cabecalho} w-8`} aria-label="Feito" />
                  <th className={cabecalho}>Marmita</th>
                  <th className={`${cabecalho} text-center`}>Encomendado</th>
                  <th className={`${cabecalho} text-center`}>Estoque</th>
                  <th className={`${cabecalho} text-center`}>Fazer</th>
                  <th className={cabecalho}>Encomendas</th>
                </tr>
              </thead>
              <tbody>
                {marmitas.map((marmita) => (
                  <tr key={marmita.nome} className="break-inside-avoid">
                    <td className={`${celula} text-center`}>
                      <span className="inline-block w-4 h-4 border-2 border-[var(--color-brown-dark)] rounded-sm" />
                    </td>
                    <td className={`${celula} font-semibold`}>{marmita.nome}</td>
                    <td className={`${celula} text-center`}>
                      {formatQuantidadeProduto(marmita.encomendado, marmita.unidade)}
                    </td>
                    <td className={`${celula} text-center`}>
                      {marmita.sobDemanda ? '—' : formatQuantidade(marmita.estoque)}
                    </td>
                    <td className={`${celula} text-center text-lg font-bold`}>
                      {marmita.fazer > 0 ? formatQuantidadeProduto(marmita.fazer, marmita.unidade) : 'Tem em estoque'}
                    </td>
                    <td className={celula}>
                      <DetalheEncomendas encomendas={marmita.encomendas} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {especiais.length > 0 && (
          <section className="mb-6">
            <h2 className="font-display text-lg font-semibold mb-2">Itens especiais</h2>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${cabecalho} w-8`} aria-label="Feito" />
                  <th className={cabecalho}>Item</th>
                  <th className={`${cabecalho} text-center`}>Fazer</th>
                  <th className={cabecalho}>Encomendas</th>
                </tr>
              </thead>
              <tbody>
                {especiais.map((item, i) => (
                  <tr key={i} className="break-inside-avoid">
                    <td className={`${celula} text-center`}>
                      <span className="inline-block w-4 h-4 border-2 border-[var(--color-brown-dark)] rounded-sm" />
                    </td>
                    <td className={`${celula} font-semibold`}>{item.nome}</td>
                    <td className={`${celula} text-center text-lg font-bold`}>{formatQuantidade(item.total)}x</td>
                    <td className={celula}>
                      <DetalheEncomendas encomendas={item.encomendas} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  )
}
