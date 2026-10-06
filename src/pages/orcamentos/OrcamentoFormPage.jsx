import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, X, UserPlus, Trash2, ArrowRightCircle, Printer, ExternalLink } from 'lucide-react'
import Layout from '../../components/Layout.jsx'
import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import ConfirmModal from '../../components/ConfirmModal.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import ClienteQuickCreateModal from '../../components/ClienteQuickCreateModal.jsx'
import InsumosNecessariosCard from '../../components/InsumosNecessariosCard.jsx'
import { useToast } from '../../components/ToastProvider.jsx'
import { useProdutos } from '../../hooks/useProdutos.js'
import { useInsumos } from '../../hooks/useInsumos.js'
import { useInsumosNecessarios } from '../../hooks/useInsumosNecessarios.js'
import { useClientes, getCliente } from '../../hooks/useClientes.js'
import { useConfiguracoes } from '../../hooks/useConfiguracoes.js'
import {
  getVenda,
  criarOrcamento,
  atualizarOrcamento,
  excluirOrcamento,
  converterOrcamentoEmVenda,
  getUltimaDistanciaEntrega,
} from '../../hooks/useVendas.js'
import { formatCurrency, formatQuantidadeProduto } from '../../lib/format.js'
import { FORMAS_CONTATO } from '../../lib/formasContato.js'
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

export default function OrcamentoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const showToast = useToast()
  const { produtos, loading: carregandoProdutos } = useProdutos()
  const produtosVendaveis = useMemo(() => produtos.filter((p) => p.vendido_separadamente), [produtos])
  const { insumos } = useInsumos()
  const { clientes, refetch: refetchClientes } = useClientes()
  const { config } = useConfiguracoes()

  const [carregando, setCarregando] = useState(Boolean(id))
  const [titulo, setTitulo] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [linhas, setLinhas] = useState([novaLinha()])
  const [desconto, setDesconto] = useState('')
  const [formaContato, setFormaContato] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [pago, setPago] = useState(false)
  const [dataVenda, setDataVenda] = useState(hoje())
  const [dataEntrega, setDataEntrega] = useState('')
  const [dataValidade, setDataValidade] = useState('')
  const [observacao, setObservacao] = useState('')
  const [tipoFrete, setTipoFrete] = useState('retirada')
  const [distanciaKmIda, setDistanciaKmIda] = useState('')
  const [custoMotoboy, setCustoMotoboy] = useState('')
  const [custoEstabelecimento, setCustoEstabelecimento] = useState('')
  const [enderecoManual, setEnderecoManual] = useState('')

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
    if (id || tipoFrete !== 'estabelecimento' || !enderecoDestino) return
    let ativo = true
    getUltimaDistanciaEntrega(clienteId, enderecoDestino)
      .then((km) => {
        if (ativo && km != null) setDistanciaKmIda((atual) => atual || String(km))
      })
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [id, tipoFrete, enderecoDestino, clienteId])

  const [salvando, setSalvando] = useState(false)
  const [convertendo, setConvertendo] = useState(false)
  const [novoClienteAberto, setNovoClienteAberto] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)

  useEffect(() => {
    if (!id) return
    let ativo = true
    getVenda(id)
      .then((v) => {
        if (!ativo) return
        setTitulo(v.titulo || '')
        setClienteId(v.cliente_id || '')
        setLinhas(
          v.venda_itens.length > 0
            ? v.venda_itens.map((item) => ({
                key: crypto.randomUUID(),
                produtoId: item.produtos?.id || '',
                quantidade: String(item.quantidade),
              }))
            : [novaLinha()],
        )
        setDesconto(Number(v.desconto) > 0 ? String(v.desconto) : '')
        setFormaContato(v.forma_contato || '')
        setFormaPagamento(v.forma_pagamento || '')
        setPago(v.pago ?? false)
        setDataVenda(v.data_venda || hoje())
        setDataEntrega(v.data_entrega || '')
        setDataValidade(v.data_validade || '')
        setObservacao(v.observacao || '')
        setTipoFrete(v.tipo_frete || 'retirada')
        setDistanciaKmIda(v.distancia_km_ida != null ? String(v.distancia_km_ida) : '')
        if (v.tipo_frete === 'motoboy') {
          setCustoMotoboy(v.custo_entrega != null ? String(v.custo_entrega) : '')
        } else if (v.tipo_frete === 'estabelecimento') {
          setCustoEstabelecimento(v.custo_entrega != null ? String(v.custo_entrega) : '')
          const clienteTemEnderecoSalvo = Boolean(v.clientes?.rua && v.clientes?.numero)
          if (!clienteTemEnderecoSalvo) {
            setEnderecoManual(v.endereco_entrega || '')
          }
        }
      })
      .catch(() => showToast('Não foi possível carregar esse orçamento.'))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [id, showToast])

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
  const descontoValor = Math.min(Number(desconto) || 0, subtotal)
  const valorProdutos = Math.max(subtotal - descontoValor, 0)
  const valorFinal = valorProdutos + valorFrete

  function atualizarLinha(key, campo, valor) {
    setLinhas((atual) => atual.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)))
  }

  function removerLinha(key) {
    setLinhas((atual) => (atual.length > 1 ? atual.filter((l) => l.key !== key) : atual))
  }

  async function handleClienteCriado(novoId) {
    try {
      await refetchClientes()
      const cliente = await getCliente(novoId)
      setClienteId(cliente.id)
      setNovoClienteAberto(false)
    } catch {
      setNovoClienteAberto(false)
    }
  }

  function montarPayload() {
    return {
      titulo: titulo.trim(),
      clienteId: clienteId || null,
      itens: itensValidos.map((item) => ({
        produtoId: item.produto.id,
        quantidade: item.quantidade,
        precoUnitario: Number(item.produto.preco_venda),
      })),
      valorTotal: valorFinal,
      desconto: descontoValor,
      formaContato: formaContato || null,
      dataVenda,
      dataEntrega: dataEntrega || null,
      dataValidade: dataValidade || null,
      formaPagamento: formaPagamento || null,
      observacao,
      tipoFrete,
      distanciaKmIda: tipoFrete === 'estabelecimento' ? Number(distanciaKmIda) || null : null,
      custoEntrega: tipoFrete === 'retirada' ? null : valorFrete,
      enderecoEntrega: tipoFrete === 'estabelecimento' ? enderecoDestino || null : null,
      pago,
    }
  }

  async function handleSalvar() {
    if (!titulo.trim()) {
      showToast('Dê um título para o orçamento (pra achar ele depois).')
      return
    }
    if (itensValidos.length === 0) {
      showToast('Escolha ao menos um produto e a quantidade.')
      return
    }
    setSalvando(true)
    try {
      if (id) {
        await atualizarOrcamento({ id, ...montarPayload() })
      } else {
        await criarOrcamento(montarPayload())
      }
      showToast('Orçamento salvo! ✅')
      navigate('/pedidos?aba=orcamentos')
    } catch {
      showToast('Não deu para salvar o orçamento. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleVirarVenda() {
    if (!clienteId) {
      showToast('Escolha o cliente antes de virar venda.')
      return
    }
    if (!formaContato) {
      showToast('Escolha a forma de contato antes de virar venda.')
      return
    }
    if (itensValidos.length === 0) {
      showToast('Escolha ao menos um produto e a quantidade.')
      return
    }
    setConvertendo(true)
    try {
      await atualizarOrcamento({ id, ...montarPayload() })
      await converterOrcamentoEmVenda({ id, clienteId, formaContato })
      showToast('Virou venda! ✅')
      navigate(`/vendas/${id}`)
    } catch (err) {
      if (err?.message?.includes('Estoque insuficiente')) {
        showToast(err.message)
      } else {
        showToast('Não deu para virar venda. Tente de novo.')
      }
    } finally {
      setConvertendo(false)
    }
  }

  async function handleExcluir() {
    try {
      await excluirOrcamento(id)
      showToast('Orçamento excluído.')
      navigate('/pedidos?aba=orcamentos')
    } catch {
      showToast('Não foi possível excluir esse orçamento.')
    } finally {
      setConfirmarExclusao(false)
    }
  }

  if (carregando) {
    return (
      <Layout title={id ? 'Editar orçamento' : 'Novo orçamento'} back>
        <p className="text-center text-[var(--color-brown-mid)] py-10">Carregando...</p>
      </Layout>
    )
  }

  if (!carregandoProdutos && produtosVendaveis.length === 0) {
    return (
      <Layout title="Novo orçamento" back>
        <EmptyState
          title="Cadastre um produto primeiro"
          description="Você precisa ter ao menos um produto cadastrado para montar um orçamento."
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
    <Layout title={id ? 'Editar orçamento' : 'Novo orçamento'} back>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Título</span>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Ovos de Páscoa - Ana"
            className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
          />
          <span className="text-xs text-[var(--color-brown-mid)]">Usado pra você achar esse orçamento depois.</span>
        </Card>

        <Card className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Cliente (opcional por enquanto)</span>
          <div className="flex gap-2">
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="flex-1 min-w-0 min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-3 outline-none focus:border-[var(--color-rose)] bg-white"
            >
              <option value="">Ainda não sei / não escolhido</option>
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
                clienteId && (
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
                    {clienteId ? 'Esse cliente ainda não tem endereço cadastrado.' : 'Escolha o cliente acima primeiro.'}
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
            <p className="text-sm text-[var(--color-brown-mid)]">Escolha os produtos acima.</p>
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
              placeholder="0,00"
              className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
            />
          </label>

          {valorFrete > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-brown-mid)]">Frete</span>
              <span>+{formatCurrency(valorFrete)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-[var(--color-beige)]">
            <span className="font-semibold">Total</span>
            <span className="font-display text-xl font-semibold">{formatCurrency(valorFinal)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Data</span>
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

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Válido até (opcional)</span>
            <input
              type="date"
              value={dataValidade}
              onChange={(e) => setDataValidade(e.target.value)}
              className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
            />
            <span className="text-xs text-[var(--color-brown-mid)]">Aparece no PDF do orçamento.</span>
          </label>
        </Card>

        <div>
          <h2 className="font-semibold mb-2">Como ela chegou até você? (opcional)</h2>
          <div className="grid grid-cols-4 gap-2">
            {FORMAS_CONTATO.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setFormaContato(formaContato === value ? '' : value)}
                className={`flex flex-col items-center gap-1 rounded-2xl p-2.5 border-2 ${
                  formaContato === value
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

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Observação (opcional)</span>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            placeholder="Alguma informação extra..."
            className="rounded-2xl border-2 border-[var(--color-beige)] px-4 py-3 outline-none focus:border-[var(--color-rose)] resize-none"
          />
        </label>

        <Button onClick={handleSalvar} disabled={salvando || convertendo}>
          {salvando ? 'Salvando...' : 'Salvar orçamento'}
        </Button>

        {id && (
          <Button
            variant="secondary"
            onClick={handleVirarVenda}
            disabled={salvando || convertendo}
            className="gap-2"
          >
            <ArrowRightCircle size={18} /> {convertendo ? 'Virando venda...' : 'Virar venda'}
          </Button>
        )}

        {id && (
          <Button type="button" variant="outline" onClick={() => navigate(`/pedidos/${id}/pdf`)} className="gap-2">
            <Printer size={18} /> Exportar PDF
          </Button>
        )}

        {id && (
          <Button type="button" variant="outline" onClick={() => setConfirmarExclusao(true)} className="gap-2">
            <Trash2 size={18} /> Excluir orçamento
          </Button>
        )}
      </div>

      <ClienteQuickCreateModal
        open={novoClienteAberto}
        onCriado={handleClienteCriado}
        onFechar={() => setNovoClienteAberto(false)}
      />

      <ConfirmModal
        open={confirmarExclusao}
        title="Excluir este orçamento?"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={handleExcluir}
        onCancel={() => setConfirmarExclusao(false)}
      />
    </Layout>
  )
}
