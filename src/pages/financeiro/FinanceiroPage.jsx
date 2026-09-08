import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpCircle, ArrowDownCircle, Landmark, Search } from 'lucide-react'
import Layout from '../../components/Layout.jsx'
import Card from '../../components/Card.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import { useFinanceiro } from '../../hooks/useFinanceiro.js'
import { formatCurrency, formatDate } from '../../lib/format.js'
import { FILTROS_PERIODO, dentroDoPeriodo } from '../../lib/periodos.js'

export default function FinanceiroPage() {
  const navigate = useNavigate()
  const { entradas, saidasInsumos, loading } = useFinanceiro()
  const [filtro, setFiltro] = useState('mes')
  const [mesEspecifico, setMesEspecifico] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busca, setBusca] = useState('')

  const transacoes = useMemo(() => {
    const doVendas = entradas.map((v) => ({
      id: `venda-${v.id}`,
      tipo: 'entrada',
      data: v.data_venda,
      descricao: `Venda #${v.numero_pedido} · ${v.clientes?.nome || 'Cliente removido'}`,
      valor: Number(v.valor_total),
      onClick: () => navigate(`/vendas/${v.id}`),
    }))
    const doInsumos = saidasInsumos.map((m) => ({
      id: `mov-insumo-${m.id}`,
      tipo: 'saida',
      data: m.created_at.slice(0, 10),
      descricao: `${m.motivo || 'Compra'} de ${m.insumos?.nome || 'insumo'}`,
      valor: m.valor_total != null ? Number(m.valor_total) : Number(m.quantidade) * Number(m.insumos?.custo_unitario || 0),
      onClick: null,
    }))
    const buscaNormalizada = busca.trim().toLowerCase()
    return [...doVendas, ...doInsumos]
      .filter((t) =>
        filtro === 'especifico'
          ? Boolean(mesEspecifico) && t.data.slice(0, 7) === mesEspecifico
          : dentroDoPeriodo(t.data, filtro),
      )
      .filter((t) => filtroTipo === 'todos' || t.tipo === filtroTipo)
      .filter((t) => !buscaNormalizada || t.descricao.toLowerCase().includes(buscaNormalizada))
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [entradas, saidasInsumos, filtro, mesEspecifico, filtroTipo, busca, navigate])

  const totalEntradas = transacoes.filter((t) => t.tipo === 'entrada').reduce((soma, t) => soma + t.valor, 0)
  const totalSaidas = transacoes.filter((t) => t.tipo === 'saida').reduce((soma, t) => soma + t.valor, 0)
  const saldo = totalEntradas - totalSaidas

  return (
    <Layout title="Financeiro" subtitle="Entradas e saídas do dinheiro">
      <div className="grid grid-cols-4 gap-2 mb-2">
        {FILTROS_PERIODO.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFiltro(value)}
            className={`min-h-[40px] rounded-2xl text-sm font-semibold border-2 ${
              filtro === value
                ? 'border-[var(--color-brown-dark)] bg-[var(--color-beige)]/60'
                : 'border-[var(--color-beige)] text-[var(--color-brown-mid)] bg-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={() => setFiltro('especifico')}
        className={`w-full min-h-[40px] rounded-2xl text-sm font-semibold border-2 mb-2 ${
          filtro === 'especifico'
            ? 'border-[var(--color-brown-dark)] bg-[var(--color-beige)]/60'
            : 'border-[var(--color-beige)] text-[var(--color-brown-mid)] bg-white'
        }`}
      >
        Escolher mês específico
      </button>

      {filtro === 'especifico' && (
        <input
          type="month"
          value={mesEspecifico}
          onChange={(e) => setMesEspecifico(e.target.value)}
          className="w-full min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)] bg-white mb-2"
        />
      )}

      <div className="relative mb-3">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-brown-mid)]" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por insumo, cliente ou nº do pedido"
          className="w-full min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] pl-11 pr-4 outline-none focus:border-[var(--color-rose)] bg-white"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { value: 'todos', label: 'Tudo' },
          { value: 'entrada', label: 'Entradas' },
          { value: 'saida', label: 'Saídas' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFiltroTipo(value)}
            className={`min-h-[40px] rounded-2xl text-sm font-semibold border-2 ${
              filtroTipo === value
                ? 'border-[var(--color-brown-dark)] bg-[var(--color-beige)]/60'
                : 'border-[var(--color-beige)] text-[var(--color-brown-mid)] bg-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[var(--color-success)]">
            <ArrowUpCircle size={16} />
            <span className="text-xs font-semibold">Entradas</span>
          </div>
          <span className="font-display text-lg font-semibold">{formatCurrency(totalEntradas)}</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[var(--color-alert)]">
            <ArrowDownCircle size={16} />
            <span className="text-xs font-semibold">Saídas</span>
          </div>
          <span className="font-display text-lg font-semibold">{formatCurrency(totalSaidas)}</span>
        </Card>
      </div>

      {filtroTipo === 'todos' && (
        <Card className="flex items-center justify-between mb-5">
          <span className="font-semibold">Lucro do período</span>
          <span
            className={`font-display text-2xl font-semibold ${
              saldo >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-alert)]'
            }`}
          >
            {formatCurrency(saldo)}
          </span>
        </Card>
      )}

      {!loading && transacoes.length === 0 && entradas.length + saidasInsumos.length === 0 && (
        <EmptyState
          icon={Landmark}
          title="Nada por aqui ainda"
          description="Vendas confirmadas entram como entrada; cadastros e compras de insumo entram como saída, automaticamente."
        />
      )}

      {!loading && transacoes.length === 0 && entradas.length + saidasInsumos.length > 0 && (
        <p className="text-center text-sm text-[var(--color-brown-mid)] py-6">
          Nenhum resultado para esse filtro ou busca.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {transacoes.map((t) => {
          const Icon = t.tipo === 'entrada' ? ArrowUpCircle : ArrowDownCircle
          const cor = t.tipo === 'entrada' ? 'text-[var(--color-success)]' : 'text-[var(--color-alert)]'
          return (
            <Card
              key={t.id}
              as={t.onClick ? 'button' : 'div'}
              onClick={t.onClick || undefined}
              className={`flex items-center gap-3 ${t.onClick ? 'text-left w-full active:scale-[0.99] transition-transform' : ''}`}
            >
              <Icon size={20} className={`shrink-0 ${cor}`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{t.descricao}</p>
                <p className="text-xs text-[var(--color-brown-mid)]">{formatDate(t.data)}</p>
              </div>
              <span className={`font-display font-semibold shrink-0 ${cor}`}>
                {t.tipo === 'entrada' ? '+' : '-'}
                {formatCurrency(t.valor)}
              </span>
            </Card>
          )
        })}
      </div>
    </Layout>
  )
}
