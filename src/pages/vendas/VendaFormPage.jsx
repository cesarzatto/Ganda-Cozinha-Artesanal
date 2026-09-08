import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, AlertTriangle, UserPlus, ExternalLink, Gift, Bike } from 'lucide-react'
import Layout from '../../components/Layout.jsx'
import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import ClienteQuickCreateModal from '../../components/ClienteQuickCreateModal.jsx'
import InsumosNecessariosCard from '../../components/InsumosNecessariosCard.jsx'
import { useToast } from '../../components/ToastProvider.jsx'
import { useProdutos } from '../../hooks/useProdutos.js'
import { useInsumos } from '../../hooks/useInsumos.js'
import { useInsumosNecessarios } from '../../hooks/useInsumosNecessarios.js'
import { useClientes, getCliente } from '../../hooks/useClientes.js'
import { useConfiguracoes } from '../../hooks/useConfiguracoes.js'
import { registrarVenda, getUltimaDistanciaEntrega } from '../../hooks/useVendas.js'
import { formatCurrency, formatQuantidadeProduto } from '../../lib/format.js'
import { FORMAS_PAGAMENTO } from '../../lib/formasPagamento.js'
import {
  TIPOS_FRETE,
  ENDERECO_ORIGEM,
  calcularCustoEntrega,
  enderecoCompletoCliente,
  linkGoogleMaps,
} from '../../lib/frete.js'

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function novaLinha() {
  return { key: crypto.randomUUID(), produtoId: '', quantidade: '1' }
}

export default function VendaFormPage() {
  const navigate = useNavigate()
  const showToast = useToast()
  const { produtos, loading: carregandoProdutos } = useProdutos()
  const produtosVendaveis = useMemo(() => produtos.filter((p) => p.vendido_separadamente), [produtos])
  const { insumos } = useInsumos()
  const { clientes, refetch: refetchClientes } = useClientes()
  const { config } = useConfiguracoes()

  const [clienteId, setClienteId] = useState('')
  const [ifood, setIfood] = useState(false)
  const [nomeIfood, setNomeIfood] = useState('')
  const [linhas, setLinhas] = useState([novaLinha()])
  const [desconto, setDesconto] = useState('0')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [pago, setPago] = useState(true)
  const [semValor, setSemValor] = useState(false)
  const [dataVenda, setDataVenda] = useState(hoje())
  const [dataEntrega, setDataEntrega] = useState('')
  const [observacao, setObservacao] = useState('')
  const [tipoFrete, setTipoFrete] = useState('retirada')
  const [distanciaKmIda, setDistanciaKmIda] = useState('')
  const [custoMotoboy, setCustoMotoboy] = useState('')
  const [custoEstabelecimento, setCustoEstabelecimento] = useState('')
  const [enderecoManual, setEnderecoManual] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [novoClienteAberto, setNovoClienteAberto] = useState(false)

  const clienteSelecionado = useMemo(() => clientes.find((c) => c.id === clienteId), [clientes, clienteId])
  const enderecoClienteFormatado = useMemo(() => enderecoCompletoCliente(clienteSelecionado), [clienteSelecionado])
  const clienteTemEndereco = Boolean(clienteSelecionado?.rua && clienteSelecionado?.numero)
  const enderecoDestino = clienteTemEndereco ? enderecoClienteFormatado : enderecoManual.trim()

  const custoEntregaCalculado = useMemo(
    () => calcularCustoEntrega(distanciaKmIda, config),
    [distanciaKmIda, config],
  )

  const valorFrete =
    tipoFrete === 'motoboy'
      ? Number(custoMotoboy) || 0
      : tipoFrete === 'estabelecimento'
        ? Number(custoEstabelecimento) || 0
        : 0

  // Preenche a sugestão automaticamente, mas só se o campo ainda não tiver
  // sido editado — depois disso o valor digitado manda.
  useEffect(() => {
    if (tipoFrete !== 'estabelecimento' || custoEntregaCalculado <= 0) return
    setCustoEstabelecimento((atual) => atual || custoEntregaCalculado.toFixed(2))
  }, [tipoFrete, custoEntregaCalculado])

  useEffect(() => {
    if (tipoFrete !== 'estabelecimento' || !enderecoDestino) return
    let ativo = true
    getUltimaDistanciaEntrega(clienteId, enderecoDestino)
      .then((km) => {
        if (ativo && km != null) setDistanciaKmIda((atual) => atual || String(km))
      })
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [tipoFrete, enderecoDestino, clienteId])

  const itensValidos = useMemo(
    () =>
      linhas
        .filter((l) => l.produtoId && Number(l.quantidade) > 0)
        .map((l) => ({
          produto: produtos.find((p) => p.id === l.produtoId),
          quantidade: Number(l.quantidade),
        }))
        .filter((item) => item.produto),
    [linhas, produtos],
  )

  const itensParaInsumos = useMemo(
    () => itensValidos.map((item) => ({ produtoId: item.produto.id, quantidade: item.quantidade })),
    [itensValidos],
  )
  const { linhas: insumosNecessarios, carregando: carregandoInsumos } = useInsumosNecessarios(
    itensParaInsumos,
    produtos,
    insumos,
  )

  const subtotal = itensValidos.reduce((soma, item) => soma + Number(item.produto.preco_venda) * item.quantidade, 0)
  const custoTotalVenda = itensValidos.reduce(
    (soma, item) => soma + Number(item.produto.custo_total) * item.quantidade,
    0,
  )
  const descontoValor = Math.min(Number(desconto) || 0, subtotal)
  const valorProdutos = Math.max(subtotal - descontoValor, 0)
  const valorFinal = valorProdutos + valorFrete
  const lucroVenda = valorProdutos - custoTotalVenda
  const margemFinal = valorProdutos > 0 ? (lucroVenda / valorProdutos) * 100 : 0
  const descontoPercentual = subtotal > 0 ? (descontoValor / subtotal) * 100 : 0

  const alerta = useMemo(() => {
    if (descontoValor <= 0) return null
    if (lucroVenda < 0) {
      return { cor: 'vermelho', texto: 'Esse desconto deixa a venda no prejuízo!' }
    }
    if (margemFinal < 10) {
      return { cor: 'amarelo', texto: `A margem ficou baixa com esse desconto (${margemFinal.toFixed(0)}%).` }
    }
    if (descontoPercentual > 30) {
      return { cor: 'amarelo', texto: `Desconto alto: ${descontoPercentual.toFixed(0)}% do preço. Confirma?` }
    }
    return null
  }, [descontoValor, lucroVenda, margemFinal, descontoPercentual])

  function atualizarLinha(key, campo, valor) {
    setLinhas((atual) => atual.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)))
  }

  function removerLinha(key) {
    setLinhas((atual) => (atual.length > 1 ? atual.filter((l) => l.key !== key) : atual))
  }

  async function handleClienteCriado(id) {
    try {
      await refetchClientes()
      const cliente = await getCliente(id)
      setClienteId(cliente.id)
      setNovoClienteAberto(false)
    } catch {
      setNovoClienteAberto(false)
    }
  }

  async function handleConfirmar() {
    if (ifood) {
      if (!nomeIfood.trim()) {
        showToast('Informe o nome do cliente do iFood.')
        return
      }
    } else if (!clienteId) {
      showToast('Escolha o cliente dessa venda.')
      return
    }
    if (itensValidos.length === 0) {
      showToast('Escolha ao menos um produto e a quantidade.')
      return
    }
    setSalvando(true)
    try {
      await registrarVenda({
        clienteId: ifood ? null : clienteId,
        ifood,
        titulo: ifood ? nomeIfood.trim() : null,
        itens: itensValidos.map((item) => ({
          produtoId: item.produto.id,
          quantidade: item.quantidade,
          precoUnitario: Number(item.produto.preco_venda),
        })),
        valorTotal: valorFinal,
        desconto: descontoValor,
        dataVenda,
        dataEntrega,
        formaPagamento,
        observacao,
        tipoFrete,
        distanciaKmIda: tipoFrete === 'estabelecimento' ? Number(distanciaKmIda) || null : null,
        custoEntrega: tipoFrete === 'retirada' ? null : valorFrete,
        enderecoEntrega: tipoFrete === 'estabelecimento' ? enderecoDestino || null : null,
        pago,
        semValor,
      })
      showToast('Venda registrada! ✅')
      navigate('/pedidos')
    } catch (err) {
      if (err?.message?.includes('Estoque insuficiente')) {
        showToast(err.message)
      } else {
        showToast('Não deu para registrar a venda. Tente de novo.')
      }
    } finally {
      setSalvando(false)
    }
  }

  if (!carregandoProdutos && produtosVendaveis.length === 0) {
    return (
      <Layout title="Nova venda" back>
        <EmptyState
          title="Cadastre um produto primeiro"
          description="Você precisa ter ao menos um produto cadastrado para registrar uma venda."
          action={
            <Button onClick={() => navigate('/produtos/novo')} className="mt-2">
              Cadastrar produto
            </Button>
          }
        />
      </Layout>
    )
  }

  return (
    <Layout title="Nova venda" back>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <Bike size={16} className="text-[var(--color-rose)]" />
              Pedido do iFood
            </span>
            <button
              type="button"
              onClick={() => setIfood((v) => !v)}
              aria-pressed={ifood}
              className={`w-14 h-8 rounded-full transition-colors relative shrink-0 ${
                ifood ? 'bg-[var(--color-brown-dark)]' : 'bg-[var(--color-beige)]'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${
                  ifood ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {ifood ? (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Nome</span>
              <input
                value={nomeIfood}
                onChange={(e) => setNomeIfood(e.target.value)}
                placeholder="Nome do cliente no iFood"
                className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
              />
            </label>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Cliente</span>
              <div className="flex gap-2">
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="flex-1 min-w-0 min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-3 outline-none focus:border-[var(--color-rose)] bg-white"
                >
                  <option value="">Escolha o cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setNovoClienteAberto(true)}
                  aria-label="Novo cliente"
                  className="w-12 h-12 shrink-0 rounded-2xl bg-[var(--color-beige)] flex items-center justify-center active:bg-[var(--color-rose)]"
                >
                  <UserPlus size={20} />
                </button>
              </div>
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <span className="text-sm font-semibold">Produtos</span>

          {linhas.map((linha) => {
            const produtoLinha = produtos.find((p) => p.id === linha.produtoId)
            const medido = produtoLinha && produtoLinha.rendimento_unidade_medida !== 'unidade'
            return (
              <div key={linha.key} className="flex gap-2 items-center">
                <select
                  value={linha.produtoId}
                  onChange={(e) => atualizarLinha(linha.key, 'produtoId', e.target.value)}
                  className="flex-1 min-w-0 min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-3 outline-none focus:border-[var(--color-rose)] bg-white"
                >
                  <option value="">Escolha o produto</option>
                  {produtosVendaveis.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({formatCurrency(p.preco_venda)}
                      {p.rendimento_unidade_medida !== 'unidade' ? `/${p.rendimento_unidade_medida}` : ''})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  inputMode={medido ? 'decimal' : 'numeric'}
                  step={medido ? '0.001' : '1'}
                  min={medido ? '0.001' : '1'}
                  value={linha.quantidade}
                  onChange={(e) => atualizarLinha(linha.key, 'quantidade', e.target.value)}
                  placeholder={medido ? produtoLinha.rendimento_unidade_medida : 'Qtd.'}
                  className="w-16 min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-3 outline-none focus:border-[var(--color-rose)]"
                />
                <button
                  type="button"
                  onClick={() => removerLinha(linha.key)}
                  aria-label="Remover produto"
                  className="w-11 h-11 shrink-0 rounded-2xl bg-[var(--color-beige)]/60 flex items-center justify-center active:bg-[var(--color-beige)]"
                >
                  <X size={18} />
                </button>
              </div>
            )
          })}

          <button
            type="button"
            onClick={() => setLinhas((atual) => [...atual, novaLinha()])}
            className="flex items-center justify-center gap-2 min-h-[44px] rounded-2xl border-2 border-dashed border-[var(--color-rose)] text-[var(--color-brown-mid)] font-semibold"
          >
            <Plus size={18} /> Adicionar produto
          </button>
        </Card>

        <InsumosNecessariosCard linhas={insumosNecessarios} carregando={carregandoInsumos} />

        <Card className="flex flex-col gap-3">
          <span className="text-sm font-semibold">Frete</span>
          <div className="grid grid-cols-3 gap-2">
            {TIPOS_FRETE.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTipoFrete(value)}
                className={`flex flex-col items-center gap-1 rounded-2xl p-2.5 border-2 ${
                  tipoFrete === value
                    ? 'border-[var(--color-brown-dark)] bg-[var(--color-beige)]/60'
                    : 'border-[var(--color-beige)] bg-white'
                }`}
              >
                <Icon size={20} />
                <span className="text-[11px] font-semibold text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>

          {tipoFrete === 'motoboy' && (
            <div className="flex flex-col gap-2">
              {clienteTemEndereco ? (
                <p className="text-xs text-[var(--color-brown-mid)]">Endereço cadastrado: {enderecoClienteFormatado}</p>
              ) : (
                clienteId &&
                !ifood && (
                  <p className="text-xs text-[var(--color-brown-mid)]">Esse cliente ainda não tem endereço cadastrado.</p>
                )
              )}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">Quanto vai custar o motoboy?</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={custoMotoboy}
                  onChange={(e) => setCustoMotoboy(e.target.value)}
                  placeholder="R$ 0,00"
                  className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
                />
              </label>
            </div>
          )}

          {tipoFrete === 'estabelecimento' && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-[var(--color-brown-mid)]">Partindo de: {ENDERECO_ORIGEM}</p>

              {clienteTemEndereco ? (
                <p className="text-xs text-[var(--color-brown-mid)]">Endereço cadastrado: {enderecoClienteFormatado}</p>
              ) : (
                <>
                  <p className="text-xs text-[var(--color-brown-mid)]">
                    {ifood
                      ? 'Informe o endereço de entrega abaixo.'
                      : clienteId
                        ? 'Esse cliente ainda não tem endereço cadastrado.'
                        : 'Escolha o cliente acima primeiro.'}
                  </p>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">Endereço de destino</span>
                    <input
                      value={enderecoManual}
                      onChange={(e) => setEnderecoManual(e.target.value)}
                      placeholder="Rua, número, bairro, cidade"
                      className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
                    />
                  </label>
                </>
              )}

              {enderecoDestino && (
                <a
                  href={linkGoogleMaps(ENDERECO_ORIGEM, enderecoDestino)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 min-h-[44px] rounded-2xl border-2 border-[var(--color-beige)] text-[var(--color-brown-dark)] font-semibold text-sm"
                >
                  <ExternalLink size={16} /> Abrir no Google Maps
                </a>
              )}

              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">Distância até o destino (km, só ida)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={distanciaKmIda}
                  onChange={(e) => setDistanciaKmIda(e.target.value)}
                  placeholder="Ex: 5"
                  className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
                />
              </label>
              {Number(distanciaKmIda) > 0 && (
                <>
                  <div className="flex justify-between items-center text-xs text-[var(--color-brown-mid)]">
                    <span>Sugestão calculada (ida e volta)</span>
                    <span>{formatCurrency(custoEntregaCalculado)}</span>
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">Quanto vai cobrar pela entrega?</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={custoEstabelecimento}
                      onChange={(e) => setCustoEstabelecimento(e.target.value)}
                      placeholder="R$ 0,00"
                      className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
                    />
                  </label>
                </>
              )}
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <h3 className="font-semibold">Resumo</h3>

          {itensValidos.length === 0 ? (
            <p className="text-sm text-[var(--color-brown-mid)]">Escolha os produtos vendidos acima.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {itensValidos.map((item) => (
                <div key={item.produto.id} className="flex justify-between text-sm">
                  <span className="text-[var(--color-brown-mid)]">
                    {formatQuantidadeProduto(item.quantidade, item.produto.rendimento_unidade_medida)}{' '}
                    {item.produto.nome}
                  </span>
                  <span>{formatCurrency(Number(item.produto.preco_venda) * item.quantidade)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between text-sm pt-2 border-t border-[var(--color-beige)]">
            <span className="text-[var(--color-brown-mid)]">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Desconto (R$)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
              className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
            />
          </label>

          {alerta && (
            <div
              className={`flex items-start gap-2 rounded-2xl p-3 text-sm font-semibold ${
                alerta.cor === 'vermelho'
                  ? 'bg-[var(--color-alert)]/10 text-[var(--color-alert)]'
                  : 'bg-[var(--color-beige)] text-[var(--color-brown-dark)]'
              }`}
            >
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <span>{alerta.texto}</span>
            </div>
          )}

          {valorFrete > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-brown-mid)]">Frete</span>
              <span>+{formatCurrency(valorFrete)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-[var(--color-beige)]">
            <span className="font-semibold">Total da venda</span>
            <span className="font-display text-xl font-semibold">{formatCurrency(valorFinal)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Data da venda</span>
              <input
                type="date"
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
                className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Entrega (opcional)</span>
              <input
                type="date"
                value={dataEntrega}
                onChange={(e) => setDataEntrega(e.target.value)}
                className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
              />
            </label>
          </div>
        </Card>

        <div>
          <h2 className="font-semibold mb-2">Forma de pagamento (opcional)</h2>
          <div className="grid grid-cols-4 gap-2">
            {FORMAS_PAGAMENTO.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setFormaPagamento(formaPagamento === value ? '' : value)}
                className={`flex flex-col items-center gap-1 rounded-2xl p-2.5 border-2 ${
                  formaPagamento === value
                    ? 'border-[var(--color-brown-dark)] bg-[var(--color-beige)]/60'
                    : 'border-[var(--color-beige)] bg-white'
                }`}
              >
                <Icon size={20} />
                <span className="text-[11px] font-semibold text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <Card className="flex items-center justify-between">
          <span className="text-sm font-semibold">Já foi pago?</span>
          <button
            type="button"
            onClick={() => setPago((v) => !v)}
            aria-pressed={pago}
            className={`w-14 h-8 rounded-full transition-colors relative shrink-0 ${
              pago ? 'bg-[var(--color-success)]' : 'bg-[var(--color-beige)]'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${
                pago ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <Gift size={16} className="text-[var(--color-rose)]" />
              Sem valor atribuído
            </span>
            <button
              type="button"
              onClick={() => setSemValor((v) => !v)}
              aria-pressed={semValor}
              className={`w-14 h-8 rounded-full transition-colors relative shrink-0 ${
                semValor ? 'bg-[var(--color-brown-dark)]' : 'bg-[var(--color-beige)]'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${
                  semValor ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-[var(--color-brown-mid)]">
            Use para degustação, teste ou brinde. O estoque é baixado normalmente, mas o valor não entra como
            entrada no Financeiro.
          </p>
        </Card>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Observação (opcional)</span>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Alguma informação extra sobre esse pedido..."
            rows={3}
            className="rounded-2xl border-2 border-[var(--color-beige)] px-4 py-3 outline-none focus:border-[var(--color-rose)] resize-none"
          />
        </label>

        <Button onClick={handleConfirmar} disabled={salvando}>
          {salvando ? 'Registrando...' : 'Registrar venda'}
        </Button>
      </div>

      <ClienteQuickCreateModal
        open={novoClienteAberto}
        onCriado={handleClienteCriado}
        onFechar={() => setNovoClienteAberto(false)}
      />
    </Layout>
  )
}
