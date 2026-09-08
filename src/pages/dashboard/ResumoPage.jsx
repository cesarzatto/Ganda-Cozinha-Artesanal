import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, Wallet, Trophy } from 'lucide-react'
import Layout from '../../components/Layout.jsx'
import Card from '../../components/Card.jsx'
import { useDashboard } from '../../hooks/useDashboard.js'
import { formatCurrency } from '../../lib/format.js'
import logo from '../../assets/logo-ganda-badge.png'
import EntregaAlertBanner from '../../components/EntregaAlertBanner.jsx'
import PedidoSemClienteAlertBanner from '../../components/PedidoSemClienteAlertBanner.jsx'

function Comparacao({ atual, anterior }) {
  if (!anterior) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-[var(--color-brown-mid)]">
        <Minus size={14} /> sem dados do mês anterior
      </span>
    )
  }

  const diferenca = atual - anterior
  if (Math.abs(diferenca) < 0.01) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-[var(--color-brown-mid)]">
        <Minus size={14} /> igual ao mês passado
      </span>
    )
  }

  const subiu = diferenca > 0
  const percentual = anterior !== 0 ? Math.abs((diferenca / anterior) * 100) : 100

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-semibold ${
        subiu ? 'text-[var(--color-success)]' : 'text-[var(--color-alert)]'
      }`}
    >
      {subiu ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
      {percentual.toFixed(0)}% {subiu ? 'a mais' : 'a menos'} que o mês passado
    </span>
  )
}

export default function ResumoPage() {
  const { resumo, loading, error } = useDashboard()

  return (
    <Layout
      title="Ganda Cozinha Artesanal"
      headerAction={<img src={logo} alt="Ganda Cozinha Artesanal" className="w-16 h-16 rounded-full shrink-0" />}
    >
      <PedidoSemClienteAlertBanner />
      <EntregaAlertBanner />

      {loading && <p className="text-center text-[var(--color-brown-mid)] py-10">Carregando...</p>}

      {!loading && error && (
        <p className="text-center text-[var(--color-brown-mid)] py-10 px-6">
          Não foi possível carregar o resumo agora. Verifique sua conexão e tente novamente.
        </p>
      )}

      {!loading && resumo && (
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[var(--color-brown-mid)]">
              <TrendingUp size={18} />
              <span className="text-sm font-semibold">Total vendido no mês</span>
            </div>
            <span className="font-display text-3xl font-semibold">
              {formatCurrency(resumo.mesAtual.totalVendido)}
            </span>
            <Comparacao atual={resumo.mesAtual.totalVendido} anterior={resumo.mesAnterior.totalVendido} />
          </Card>

          <Card className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[var(--color-brown-mid)]">
              <Wallet size={18} />
              <span className="text-sm font-semibold">Lucro estimado</span>
            </div>
            <span className="font-display text-3xl font-semibold">
              {formatCurrency(resumo.mesAtual.lucroEstimado)}
            </span>
            <Comparacao atual={resumo.mesAtual.lucroEstimado} anterior={resumo.mesAnterior.lucroEstimado} />
          </Card>

          <Card className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[var(--color-brown-mid)]">
              <Trophy size={18} />
              <span className="text-sm font-semibold">Produto mais vendido</span>
            </div>
            {resumo.mesAtual.produtoMaisVendido ? (
              <span className="font-display text-2xl font-semibold">{resumo.mesAtual.produtoMaisVendido}</span>
            ) : (
              <span className="text-[var(--color-brown-mid)]">Nenhuma venda este mês ainda</span>
            )}
          </Card>

          {resumo.mesAtual.qtdVendas === 0 && (
            <p className="text-center text-sm text-[var(--color-brown-mid)] px-6">
              Assim que você registrar vendas, o resumo do mês aparece aqui automaticamente.
            </p>
          )}
        </div>
      )}
    </Layout>
  )
}
