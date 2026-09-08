import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus,
  ShoppingBag,
  Truck,
  FileText,
  Search,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  MessageCircle,
  AtSign,
  Users,
  MoreHorizontal,
} from 'lucide-react'
import Layout from '../../components/Layout.jsx'
import Card from '../../components/Card.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import PedidoSemClienteAlertBanner from '../../components/PedidoSemClienteAlertBanner.jsx'
import { useVendas, useOrcamentos, useEntregasPendentes } from '../../hooks/useVendas.js'
import { formatCurrency, formatDate, formatMonthLabel } from '../../lib/format.js'
import { FILTROS_PERIODO, dentroDoPeriodo } from '../../lib/periodos.js'
import { urgenciaEntrega } from '../../lib/entregas.js'

const ABAS = [
  { value: 'vendas', label: 'Vendas' },
  { value: 'orcamentos', label: 'Orçamentos' },
  { value: 'entregas', label: 'Entregas' },
]

const ICONE_CONTATO = {
  whatsapp: MessageCircle,
  instagram: AtSign,
  indicacao: Users,
  outro: MoreHorizontal,
}

const CORES_URGENCIA = {
  atrasado: 'bg-[var(--color-alert)]/10 text-[var(--color-alert)]',
  hoje: 'bg-[var(--color-alert)]/10 text-[var(--color-alert)]',
  urgente: 'bg-[var(--color-beige)] text-[var(--color-brown-dark)]',
  atencao: 'bg-[var(--color-beige)] text-[var(--color-brown-dark)]',
  normal: 'bg-[var(--color-beige)]/60 text-[var(--color-brown-mid)]',
}

function resumoItens(itens) {
  return itens.map((item) => `${item.quantidade}x ${item.produtos?.nome || 'Produto removido'}`).join(', ')
}

function nomeDoPedido(pedido) {
  if (pedido.clientes?.nome) return pedido.clientes.nome
  if (pedido.ifood) return `iFood · ${pedido.titulo || 'Sem nome'}`
  if (pedido.pedido_online) return pedido.titulo || 'Sem nome'
  return 'Cliente removido'
}

function agruparPorMes(vendas) {
  const grupos = new Map()
  for (const venda of vendas) {
    const [ano, mes] = venda.data_venda.split('-')
    const chave = `${ano}-${mes}`
    if (!grupos.has(chave)) {
      grupos.set(chave, { label: formatMonthLabel(new Date(Number(ano), Number(mes) - 1, 1)), vendas: [] })
    }
    grupos.get(chave).vendas.push(venda)
  }
  return Array.from(grupos.values())
}

function combinaComBusca(pedido, busca) {
  if (!busca.trim()) return true
  const termo = busca.trim().toLowerCase()
  const numero = String(pedido.numero_pedido ?? '')
  const titulo = (pedido.titulo || '').toLowerCase()
  const cliente = (pedido.clientes?.nome || '').toLowerCase()
  return numero.includes(termo) || titulo.includes(termo) || cliente.includes(termo)
}

function AbaVendas({ busca }) {
  const navigate = useNavigate()
  const { vendas, loading } = useVendas()
  const [filtro, setFiltro] = useState('mes')

  const vendasFiltradas = useMemo(
    () => vendas.filter((v) => dentroDoPeriodo(v.data_venda, filtro) && combinaComBusca(v, busca)),
    [vendas, filtro, busca],
  )
  const totalFiltrado = vendasFiltradas.reduce((soma, v) => soma + Number(v.valor_total), 0)
  const grupos = agruparPorMes(vendasFiltradas)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-2">
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

      {!loading && (
        <p className="text-sm text-[var(--color-brown-mid)] -mt-2">
          {vendasFiltradas.length} venda{vendasFiltradas.length === 1 ? '' : 's'} · {formatCurrency(totalFiltrado)}
        </p>
      )}

      {!loading && vendasFiltradas.length === 0 && (
        <EmptyState
          icon={ShoppingBag}
          title={busca ? 'Nenhuma venda encontrada' : 'Nenhuma venda por aqui'}
          description={!busca ? 'Toque no botão + para registrar uma venda.' : undefined}
        />
      )}

      <div className="flex flex-col gap-5">
        {grupos.map((grupo) => (
          <div key={grupo.label}>
            <h2 className="font-display text-lg font-semibold mb-2">{grupo.label}</h2>
            <div className="flex flex-col gap-2">
              {grupo.vendas.map((venda) => {
                const Icon = ICONE_CONTATO[venda.forma_contato] || MoreHorizontal
                return (
                  <Card
                    key={venda.id}
                    as="button"
                    onClick={() => navigate(`/vendas/${venda.id}`)}
                    className="flex items-start gap-3 text-left w-full active:scale-[0.99] transition-transform"
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--color-beige)] flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-[var(--color-brown-mid)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        #{venda.numero_pedido} · {nomeDoPedido(venda)}
                      </p>
                      <p className="text-sm text-[var(--color-brown-mid)]">{resumoItens(venda.venda_itens)}</p>
                      <p className="text-xs text-[var(--color-brown-mid)] mt-0.5">{formatDate(venda.data_venda)}</p>
                      {Number(venda.desconto) > 0 && (
                        <p className="text-xs text-[var(--color-alert)]">
                          Desconto de {formatCurrency(venda.desconto)}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            venda.pago
                              ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                              : 'bg-[var(--color-alert)]/10 text-[var(--color-alert)]'
                          }`}
                        >
                          {venda.pago ? 'Pago' : 'Não pago'}
                        </span>
                        {venda.sem_valor && (
                          <span className="inline-block rounded-full bg-[var(--color-beige)] text-[var(--color-brown-dark)] px-2 py-0.5 text-[11px] font-semibold">
                            Sem valor atribuído
                          </span>
                        )}
                        {venda.pedido_online && !venda.cliente_id && (
                          <span className="inline-block rounded-full bg-[var(--color-alert)]/10 text-[var(--color-alert)] px-2 py-0.5 text-[11px] font-semibold">
                            Cadastrar cliente
                          </span>
                        )}
                        {!venda.notinha_impressa && (
                          <span className="inline-block rounded-full bg-[var(--color-beige)] text-[var(--color-brown-dark)] px-2 py-0.5 text-[11px] font-semibold">
                            Notinha pendente
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-display font-semibold shrink-0">{formatCurrency(venda.valor_total)}</span>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AbaOrcamentos({ busca }) {
  const navigate = useNavigate()
  const { orcamentos, loading } = useOrcamentos()

  const orcamentosFiltrados = useMemo(
    () => orcamentos.filter((o) => combinaComBusca(o, busca)),
    [orcamentos, busca],
  )

  return (
    <div className="flex flex-col gap-3">
      {!loading && orcamentosFiltrados.length === 0 && (
        <EmptyState
          icon={FileText}
          title={busca ? 'Nenhum orçamento encontrado' : 'Nenhum orçamento ainda'}
          description={!busca ? 'Toque no botão + para montar um orçamento para um cliente.' : undefined}
        />
      )}

      {orcamentosFiltrados.map((orcamento) => (
        <Card
          key={orcamento.id}
          as="button"
          onClick={() => navigate(`/orcamentos/${orcamento.id}`)}
          className="flex items-start gap-3 text-left w-full active:scale-[0.99] transition-transform"
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">
              #{orcamento.numero_pedido} · {orcamento.titulo}
            </p>
            <p className="text-sm text-[var(--color-brown-mid)] truncate">
              {orcamento.clientes?.nome || 'Sem cliente ainda'} · {resumoItens(orcamento.venda_itens)}
            </p>
          </div>
          <span className="font-display font-semibold shrink-0">{formatCurrency(orcamento.valor_total)}</span>
        </Card>
      ))}
    </div>
  )
}

function AbaEntregas({ busca }) {
  const navigate = useNavigate()
  const { entregas, loading } = useEntregasPendentes()
  const [ordem, setOrdem] = useState('proxima')

  const entregasExibidas = useMemo(() => {
    const filtradas = entregas.filter((e) => combinaComBusca(e, busca))
    return ordem === 'proxima' ? filtradas : [...filtradas].reverse()
  }, [entregas, busca, ordem])

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setOrdem('proxima')}
          className={`min-h-[40px] rounded-2xl text-sm font-semibold border-2 flex items-center justify-center gap-1.5 ${
            ordem === 'proxima'
              ? 'border-[var(--color-brown-dark)] bg-[var(--color-beige)]/60'
              : 'border-[var(--color-beige)] text-[var(--color-brown-mid)] bg-white'
          }`}
        >
          <ArrowUpNarrowWide size={16} /> Mais próximas
        </button>
        <button
          onClick={() => setOrdem('distante')}
          className={`min-h-[40px] rounded-2xl text-sm font-semibold border-2 flex items-center justify-center gap-1.5 ${
            ordem === 'distante'
              ? 'border-[var(--color-brown-dark)] bg-[var(--color-beige)]/60'
              : 'border-[var(--color-beige)] text-[var(--color-brown-mid)] bg-white'
          }`}
        >
          <ArrowDownNarrowWide size={16} /> Mais distantes
        </button>
      </div>

      {!loading && entregasExibidas.length === 0 && (
        <EmptyState
          icon={Truck}
          title={busca ? 'Nenhuma entrega encontrada' : 'Nenhuma entrega pendente'}
          description={!busca ? 'Vendas com data de entrega marcada aparecem aqui até você marcar como entregues.' : undefined}
        />
      )}

      {entregasExibidas.map((venda) => {
        const urgencia = urgenciaEntrega(venda.data_entrega)
        return (
          <Card
            key={venda.id}
            as="button"
            onClick={() => navigate(`/vendas/${venda.id}`)}
            className="flex items-start gap-3 text-left w-full active:scale-[0.99] transition-transform"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">
                #{venda.numero_pedido} · {nomeDoPedido(venda)}
              </p>
              <p className="text-sm text-[var(--color-brown-mid)]">{resumoItens(venda.venda_itens)}</p>
              <p className="text-xs text-[var(--color-brown-mid)] mt-0.5">Entrega em {formatDate(venda.data_entrega)}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${CORES_URGENCIA[urgencia.nivel]}`}>
              {urgencia.texto}
            </span>
          </Card>
        )
      })}
    </div>
  )
}

export default function PedidosPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const abaAtiva = ABAS.some((a) => a.value === searchParams.get('aba')) ? searchParams.get('aba') : 'vendas'
  const [busca, setBusca] = useState('')

  function trocarAba(valor) {
    const params = {}
    if (valor !== 'vendas') params.aba = valor
    setSearchParams(params)
  }

  function irParaNovo() {
    if (abaAtiva === 'orcamentos') navigate('/orcamentos/novo')
    else navigate('/vendas/novo')
  }

  return (
    <Layout title="Pedidos" subtitle="Vendas, orçamentos e entregas">
      <PedidoSemClienteAlertBanner />

      <div className="grid grid-cols-3 gap-2 mb-3">
        {ABAS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => trocarAba(value)}
            className={`min-h-[44px] rounded-2xl text-sm font-semibold border-2 ${
              abaAtiva === value
                ? 'border-[var(--color-brown-dark)] bg-[var(--color-beige)]/60'
                : 'border-[var(--color-beige)] text-[var(--color-brown-mid)] bg-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-brown-mid)]" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nº do pedido, título ou cliente"
          className="w-full min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] pl-11 pr-4 outline-none focus:border-[var(--color-rose)] bg-white"
        />
      </div>

      {abaAtiva === 'vendas' && <AbaVendas busca={busca} />}
      {abaAtiva === 'orcamentos' && <AbaOrcamentos busca={busca} />}
      {abaAtiva === 'entregas' && <AbaEntregas busca={busca} />}

      {abaAtiva !== 'entregas' && (
        <button
          onClick={irParaNovo}
          aria-label={abaAtiva === 'orcamentos' ? 'Novo orçamento' : 'Nova venda'}
          className="fixed bottom-6 right-5 w-14 h-14 rounded-full bg-[var(--color-brown-dark)] text-white shadow-lg flex items-center justify-center active:bg-[var(--color-brown-mid)]"
        >
          <Plus size={26} />
        </button>
      )}
    </Layout>
  )
}
