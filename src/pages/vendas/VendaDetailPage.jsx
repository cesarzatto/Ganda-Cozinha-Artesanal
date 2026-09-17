import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  MessageCircle,
  AtSign,
  Users,
  MoreHorizontal,
  PackageCheck,
  Printer,
  ExternalLink,
  Store,
  AlertTriangle,
  Trash2,
  Receipt,
} from 'lucide-react'
import Layout from '../../components/Layout.jsx'
import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import ConfirmModal from '../../components/ConfirmModal.jsx'
import ClienteQuickCreateModal from '../../components/ClienteQuickCreateModal.jsx'
import InsumosNecessariosCard from '../../components/InsumosNecessariosCard.jsx'
import { useToast } from '../../components/ToastProvider.jsx'
import {
  getVenda,
  atualizarEntregaVenda,
  marcarEntregaVenda,
  marcarNotinhaImpressa,
  cancelarVenda,
  vincularClienteAoPedido,
} from '../../hooks/useVendas.js'
import { useConfiguracoes } from '../../hooks/useConfiguracoes.js'
import { useInsumos } from '../../hooks/useInsumos.js'
import { useInsumosNecessarios } from '../../hooks/useInsumosNecessarios.js'
import { formatCurrency, formatDate, formatQuantidadeProduto } from '../../lib/format.js'
import { FORMAS_CONTATO } from '../../lib/formasContato.js'
import { FORMAS_PAGAMENTO } from '../../lib/formasPagamento.js'
import {
  TIPOS_FRETE,
  ENDERECO_ORIGEM,
  calcularCustoEntrega,
  enderecoCompletoCliente,
  linkGoogleMaps,
} from '../../lib/frete.js'

const ICONE_CONTATO = {
  whatsapp: MessageCircle,
  instagram: AtSign,
  indicacao: Users,
  outro: MoreHorizontal,
}

export default function VendaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const showToast = useToast()

  const { config } = useConfiguracoes()
  const { insumos } = useInsumos()

  const [venda, setVenda] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [dataEntrega, setDataEntrega] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [pago, setPago] = useState(true)
  const [observacao, setObservacao] = useState('')
  const [entregue, setEntregue] = useState(false)
  const [notinhaImpressa, setNotinhaImpressa] = useState(false)
  const [tipoFrete, setTipoFrete] = useState('retirada')
  const [distanciaKmIda, setDistanciaKmIda] = useState('')
  const [custoMotoboy, setCustoMotoboy] = useState('')
  const [custoEstabelecimento, setCustoEstabelecimento] = useState('')
  const [enderecoManual, setEnderecoManual] = useState('')
  const [novoClienteAberto, setNovoClienteAberto] = useState(false)
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false)
  const [cancelando, setCancelando] = useState(false)

  const enderecoClienteFormatado = useMemo(() => enderecoCompletoCliente(venda?.clientes), [venda])
  const clienteTemEndereco = Boolean(venda?.clientes?.rua && venda?.clientes?.numero)
  const enderecoDestino = clienteTemEndereco ? enderecoClienteFormatado : enderecoManual.trim()

  const produtosDoPedido = useMemo(
    () => (venda?.venda_itens || []).map((item) => item.produtos).filter(Boolean),
    [venda],
  )
  const itensParaInsumos = useMemo(
    () =>
      (venda?.venda_itens || [])
        .filter((item) => item.produtos)
        .map((item) => ({ produtoId: item.produtos.id, quantidade: Number(item.quantidade) })),
    [venda],
  )
  const { linhas: insumosNecessarios, carregando: carregandoInsumos } = useInsumosNecessarios(
    itensParaInsumos,
    produtosDoPedido,
    insumos,
  )

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
    let ativo = true
    getVenda(id)
      .then((v) => {
        if (!ativo) return
        setVenda(v)
        setDataEntrega(v.data_entrega || '')
        setFormaPagamento(v.forma_pagamento || '')
        setPago(v.pago ?? true)
        setObservacao(v.observacao || '')
        setEntregue(Boolean(v.entregue))
        setNotinhaImpressa(Boolean(v.notinha_impressa))
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
      .catch(() => showToast('Não foi possível carregar esse pedido.'))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [id, showToast])

  async function handleSalvar() {
    setSalvando(true)
    try {
      await Promise.all([
        atualizarEntregaVenda({
          vendaId: id,
          dataEntrega: dataEntrega || null,
          formaPagamento: formaPagamento || null,
          observacao: observacao || null,
          tipoFrete,
          distanciaKmIda: tipoFrete === 'estabelecimento' ? Number(distanciaKmIda) || null : null,
          custoEntrega: tipoFrete === 'retirada' ? null : valorFrete,
          enderecoEntrega: tipoFrete === 'estabelecimento' ? enderecoDestino || null : null,
          pago,
        }),
        marcarEntregaVenda(id, entregue),
        marcarNotinhaImpressa(id, notinhaImpressa),
      ])
      showToast('Pedido atualizado! ✅')
    } catch {
      showToast('Não deu para salvar. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleClienteCadastrado(clienteId) {
    try {
      await vincularClienteAoPedido(id, clienteId)
      const atualizado = await getVenda(id)
      setVenda(atualizado)
      showToast('Cliente vinculado ao pedido! ✅')
    } catch {
      showToast('Cliente cadastrado, mas não deu para vincular ao pedido.')
    } finally {
      setNovoClienteAberto(false)
    }
  }

  async function handleCancelarVenda() {
    setCancelando(true)
    try {
      await cancelarVenda(id)
      showToast('Pedido cancelado e estoque devolvido. ✅')
      navigate('/pedidos')
    } catch {
      showToast('Não deu para cancelar esse pedido. Tente de novo.')
      setCancelando(false)
      setConfirmarCancelamento(false)
    }
  }

  if (carregando) {
    return (
      <Layout title="Pedido" back>
        <p className="text-center text-[var(--color-brown-mid)] py-10">Carregando...</p>
      </Layout>
    )
  }

  if (!venda) {
    return (
      <Layout title="Pedido" back>
        <p className="text-center text-[var(--color-brown-mid)] py-10">Pedido não encontrado.</p>
      </Layout>
    )
  }

  const IconContato = ICONE_CONTATO[venda.forma_contato] || MoreHorizontal
  const rotuloContato = FORMAS_CONTATO.find((f) => f.value === venda.forma_contato)?.label

  return (
    <Layout
      title={`Pedido #${venda.numero_pedido}`}
      back
      headerAction={
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/pedidos/${id}/nota`)}
            aria-label="Imprimir notinha"
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
          >
            <Receipt size={20} />
          </button>
          <button
            onClick={() => navigate(`/pedidos/${id}/pdf`)}
            aria-label="Exportar PDF"
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
          >
            <Printer size={20} />
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-2">
          {venda.forma_contato && (
            <div className="flex items-center gap-2">
              <IconContato size={16} className="text-[var(--color-brown-mid)]" />
              <span className="text-sm text-[var(--color-brown-mid)]">{rotuloContato}</span>
            </div>
          )}
          <h3 className="font-display text-xl font-semibold">
            {venda.clientes?.nome ||
              (venda.ifood
                ? `iFood · ${venda.titulo || 'Sem nome'}`
                : venda.pedido_online
                  ? venda.titulo || 'Sem nome'
                  : 'Cliente removido')}
          </h3>
          <p className="text-sm text-[var(--color-brown-mid)]">Venda em {formatDate(venda.data_venda)}</p>
          {venda.pedido_online && venda.endereco_entrega && (
            <p className="text-sm text-[var(--color-brown-mid)]">
              <span className="font-semibold text-[var(--color-brown-dark)]">Entregar em:</span>{' '}
              {venda.endereco_entrega}
            </p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            {venda.pedido_online && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-beige)] text-[var(--color-brown-dark)] px-2.5 py-0.5 text-xs font-semibold">
                <Store size={12} /> Veio da loja online
              </span>
            )}
            {venda.sem_valor && (
              <span className="rounded-full bg-[var(--color-beige)] text-[var(--color-brown-dark)] px-2.5 py-0.5 text-xs font-semibold">
                Sem valor atribuído
              </span>
            )}
          </div>
        </Card>

        {venda.pedido_online && !venda.cliente_id && (
          <Card className="flex flex-col gap-3 border-2 border-[var(--color-alert)]">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="text-[var(--color-alert)] shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-[var(--color-alert)]">
                Esse pedido veio da loja online, mas o telefone{venda.telefone_pedido ? ` (${venda.telefone_pedido})` : ''} não bate
                com nenhum cliente cadastrado.
                {venda.salvar_endereco_principal && venda.endereco_entrega && (
                  <> A cliente pediu pra usar o endereço acima como principal — vale preencher ao cadastrar.</>
                )}
              </p>
            </div>
            <Button type="button" onClick={() => setNovoClienteAberto(true)}>
              Cadastrar cliente
            </Button>
          </Card>
        )}

        <Card className="flex flex-col gap-3">
          <h3 className="font-semibold">Itens</h3>
          <div className="flex flex-col gap-1.5">
            {venda.venda_itens.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-[var(--color-brown-mid)]">
                  {formatQuantidadeProduto(item.quantidade, item.produtos?.rendimento_unidade_medida)}{' '}
                  {item.produtos?.nome || 'Produto removido'}
                </span>
                <span>{formatCurrency(Number(item.preco_unitario) * item.quantidade)}</span>
              </div>
            ))}
          </div>
          {Number(venda.desconto) > 0 && (
            <div className="flex justify-between text-sm pt-2 border-t border-[var(--color-beige)]">
              <span className="text-[var(--color-alert)]">Desconto</span>
              <span className="text-[var(--color-alert)]">-{formatCurrency(venda.desconto)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-[var(--color-beige)]">
            <span className="font-semibold">Total</span>
            <span className="font-display text-xl font-semibold">{formatCurrency(venda.valor_total)}</span>
          </div>
        </Card>

        <InsumosNecessariosCard linhas={insumosNecessarios} carregando={carregandoInsumos} />

        <Card className="flex flex-col gap-4">
          <h3 className="font-semibold">Entrega e pagamento</h3>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <PackageCheck size={16} className="text-[var(--color-rose)]" />
              Já foi entregue
            </span>
            <button
              type="button"
              onClick={() => setEntregue((v) => !v)}
              aria-pressed={entregue}
              className={`w-14 h-8 rounded-full transition-colors relative shrink-0 ${
                entregue ? 'bg-[var(--color-success)]' : 'bg-[var(--color-beige)]'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${
                  entregue ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <Receipt size={16} className="text-[var(--color-rose)]" />
              Notinha impressa
            </span>
            <button
              type="button"
              onClick={() => setNotinhaImpressa((v) => !v)}
              aria-pressed={notinhaImpressa}
              className={`w-14 h-8 rounded-full transition-colors relative shrink-0 ${
                notinhaImpressa ? 'bg-[var(--color-success)]' : 'bg-[var(--color-beige)]'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${
                  notinhaImpressa ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Data de entrega</span>
            <input
              type="date"
              value={dataEntrega}
              onChange={(e) => setDataEntrega(e.target.value)}
              className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
            />
          </label>

          <div>
            <span className="text-sm font-semibold block mb-1">Forma de pagamento</span>
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

          <div className="flex items-center justify-between">
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
          </div>

          <div>
            <span className="text-sm font-semibold block mb-1">Frete</span>
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
          </div>

          {tipoFrete === 'motoboy' && (
            <div className="flex flex-col gap-2">
              {clienteTemEndereco && (
                <p className="text-xs text-[var(--color-brown-mid)]">Endereço cadastrado: {enderecoClienteFormatado}</p>
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
                  <p className="text-xs text-[var(--color-brown-mid)]">Esse cliente ainda não tem endereço cadastrado.</p>
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

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Observação</span>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              placeholder="Alguma informação extra sobre esse pedido..."
              className="rounded-2xl border-2 border-[var(--color-beige)] px-4 py-3 outline-none focus:border-[var(--color-rose)] resize-none"
            />
          </label>
        </Card>

        <Button onClick={handleSalvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </Button>

        <Button type="button" variant="outline" onClick={() => setConfirmarCancelamento(true)} className="gap-2">
          <Trash2 size={18} /> Cancelar pedido
        </Button>
      </div>

      <ClienteQuickCreateModal
        open={novoClienteAberto}
        valoresIniciais={{
          nome: venda.titulo || '',
          telefone: venda.telefone_pedido || '',
          rua: venda.endereco_entrega || '',
        }}
        onCriado={handleClienteCadastrado}
        onFechar={() => setNovoClienteAberto(false)}
      />

      <ConfirmModal
        open={confirmarCancelamento}
        title="Cancelar este pedido?"
        description="O estoque dos produtos volta ao normal e o pedido é apagado. Essa ação não pode ser desfeita."
        confirmLabel={cancelando ? 'Cancelando...' : 'Cancelar pedido'}
        onConfirm={handleCancelarVenda}
        onCancel={() => setConfirmarCancelamento(false)}
      />
    </Layout>
  )
}
