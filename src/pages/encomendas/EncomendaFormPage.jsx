import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, X, Receipt, Trash2, UserPlus } from 'lucide-react'
import Layout from '../../components/Layout.jsx'
import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import ConfirmModal from '../../components/ConfirmModal.jsx'
import ClienteQuickCreateModal from '../../components/ClienteQuickCreateModal.jsx'
import { useToast } from '../../components/ToastProvider.jsx'
import { useClientes, getCliente } from '../../hooks/useClientes.js'
import { enderecoCompletoCliente } from '../../lib/frete.js'
import { getEncomenda, salvarEncomenda, excluirEncomenda, totalDosItens } from '../../hooks/useEncomendas.js'
import { formatCurrency } from '../../lib/format.js'
import { FORMAS_PAGAMENTO } from '../../lib/formasPagamento.js'

const inputClass =
  'min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]'

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function novaLinha() {
  return { key: crypto.randomUUID(), descricao: '', quantidade: '1', valorUnitario: '' }
}

function Toggle({ ligado, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ligado}
      className={`w-14 h-8 rounded-full transition-colors relative shrink-0 ${
        ligado ? 'bg-[var(--color-success)]' : 'bg-[var(--color-beige)]'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${
          ligado ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function EncomendaFormPage() {
  const { id } = useParams()
  const editando = Boolean(id)
  const navigate = useNavigate()
  const showToast = useToast()

  const [carregando, setCarregando] = useState(editando)
  const [salvando, setSalvando] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [numero, setNumero] = useState(null)

  const { clientes, refetch: refetchClientes } = useClientes()
  const [clienteId, setClienteId] = useState('')
  const [novoClienteAberto, setNovoClienteAberto] = useState(false)
  const [enderecoEntrega, setEnderecoEntrega] = useState('')
  const [dataEncomenda, setDataEncomenda] = useState(hoje())
  const [dataEntrega, setDataEntrega] = useState('')
  const [linhas, setLinhas] = useState([novaLinha()])
  const [formaPagamento, setFormaPagamento] = useState('')
  const [pago, setPago] = useState(false)
  const [entregue, setEntregue] = useState(false)
  const [observacao, setObservacao] = useState('')

  useEffect(() => {
    if (!editando) return
    let ativo = true
    getEncomenda(id)
      .then((e) => {
        if (!ativo) return
        setNumero(e.numero)
        setClienteId(e.cliente_id || '')
        setEnderecoEntrega(e.endereco_entrega || '')
        setDataEncomenda(e.data_encomenda)
        setDataEntrega(e.data_entrega || '')
        setLinhas(
          e.itens.length > 0
            ? e.itens.map((item) => ({
                key: crypto.randomUUID(),
                descricao: item.descricao,
                quantidade: String(item.quantidade),
                valorUnitario: String(item.valor_unitario),
              }))
            : [novaLinha()],
        )
        setFormaPagamento(e.forma_pagamento || '')
        setPago(e.pago)
        setEntregue(e.entregue)
        setObservacao(e.observacao || '')
      })
      .catch(() => showToast('Não foi possível carregar essa encomenda.'))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [id, editando, showToast])

  const itensValidos = useMemo(
    () =>
      linhas
        .filter((l) => l.descricao.trim() && Number(l.quantidade) > 0)
        .map((l) => ({
          descricao: l.descricao.trim(),
          quantidade: Number(l.quantidade),
          valor_unitario: Number(l.valorUnitario) || 0,
        })),
    [linhas],
  )
  const total = totalDosItens(itensValidos)
  const clienteSelecionado = useMemo(() => clientes.find((c) => c.id === clienteId), [clientes, clienteId])

  // Ao escolher o cliente, já sugere o endereço cadastrado (dá pra ajustar).
  function escolherCliente(id) {
    setClienteId(id)
    const cliente = clientes.find((c) => c.id === id)
    if (cliente && !enderecoEntrega.trim()) setEnderecoEntrega(enderecoCompletoCliente(cliente))
  }

  async function handleClienteCriado(id) {
    try {
      await refetchClientes()
      const cliente = await getCliente(id)
      setClienteId(cliente.id)
      if (!enderecoEntrega.trim()) setEnderecoEntrega(enderecoCompletoCliente(cliente))
    } catch {
      // o cliente foi criado; a pessoa escolhe na lista
    } finally {
      setNovoClienteAberto(false)
    }
  }

  function atualizarLinha(key, campo, valor) {
    setLinhas((atual) => atual.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)))
  }

  function removerLinha(key) {
    setLinhas((atual) => (atual.length > 1 ? atual.filter((l) => l.key !== key) : atual))
  }

  async function handleSalvar() {
    if (!clienteSelecionado) return showToast('Escolha o cliente dessa encomenda.')
    if (itensValidos.length === 0) return showToast('Escreva ao menos um item, com a quantidade.')

    setSalvando(true)
    try {
      const salvoId = await salvarEncomenda({
        id,
        clienteId: clienteSelecionado.id,
        clienteNome: clienteSelecionado.nome,
        enderecoEntrega: enderecoEntrega.trim(),
        dataEncomenda,
        dataEntrega,
        itens: itensValidos,
        formaPagamento,
        pago,
        entregue,
        observacao: observacao.trim(),
      })
      showToast('Encomenda salva! ✅')
      if (editando) setSalvando(false)
      else navigate(`/encomendas/${salvoId}`, { replace: true })
    } catch {
      showToast('Não deu para salvar a encomenda. Tente de novo.')
      setSalvando(false)
    }
  }

  async function handleExcluir() {
    try {
      await excluirEncomenda(id)
      showToast('Encomenda apagada.')
      navigate('/pedidos?aba=encomendas', { replace: true })
    } catch {
      showToast('Não deu para apagar. Tente de novo.')
      setConfirmarExclusao(false)
    }
  }

  if (carregando) {
    return (
      <Layout title="Encomenda" back>
        <p className="text-center text-[var(--color-brown-mid)] py-10">Carregando...</p>
      </Layout>
    )
  }

  return (
    <Layout
      title={editando ? `Encomenda #${numero}` : 'Nova encomenda'}
      back
      headerAction={
        editando ? (
          <button
            onClick={() => navigate(`/encomendas/${id}/nota`)}
            aria-label="Imprimir notinha"
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
          >
            <Receipt size={20} />
          </button>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Cliente</span>
            <div className="flex gap-2">
              <select
                value={clienteId}
                onChange={(e) => escolherCliente(e.target.value)}
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
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Endereço de entrega (opcional)</span>
            <input
              value={enderecoEntrega}
              onChange={(e) => setEnderecoEntrega(e.target.value)}
              placeholder="Rua, número, bairro"
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Data da encomenda</span>
              <input
                type="date"
                value={dataEncomenda}
                onChange={(e) => setDataEncomenda(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Entrega (opcional)</span>
              <input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} className={inputClass} />
            </label>
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <span className="text-sm font-semibold">Itens da encomenda</span>

          {linhas.map((linha, i) => (
            <div key={linha.key} className="flex flex-col gap-2 pb-3 border-b border-[var(--color-beige)] last:border-0 last:pb-0">
              <div className="flex gap-2 items-center">
                <input
                  value={linha.descricao}
                  onChange={(e) => atualizarLinha(linha.key, 'descricao', e.target.value)}
                  placeholder={`Item ${i + 1} (ex: Bolo de aniversário)`}
                  aria-label={`Descrição do item ${i + 1}`}
                  className={`${inputClass} flex-1 min-w-0`}
                />
                <button
                  type="button"
                  onClick={() => removerLinha(linha.key)}
                  aria-label="Remover item"
                  className="w-11 h-11 shrink-0 rounded-2xl bg-[var(--color-beige)]/60 flex items-center justify-center active:bg-[var(--color-beige)]"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--color-brown-mid)]">Quantidade</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={linha.quantidade}
                    onChange={(e) => atualizarLinha(linha.key, 'quantidade', e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--color-brown-mid)]">Valor unitário (R$)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={linha.valorUnitario}
                    onChange={(e) => atualizarLinha(linha.key, 'valorUnitario', e.target.value)}
                    placeholder="0,00"
                    className={inputClass}
                  />
                </label>
              </div>
              {Number(linha.quantidade) > 0 && Number(linha.valorUnitario) > 0 && (
                <p className="text-xs text-[var(--color-brown-mid)] text-right">
                  Subtotal: {formatCurrency(Number(linha.quantidade) * Number(linha.valorUnitario))}
                </p>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => setLinhas((atual) => [...atual, novaLinha()])}
            className="flex items-center justify-center gap-2 min-h-[44px] rounded-2xl border-2 border-dashed border-[var(--color-rose)] text-[var(--color-brown-mid)] font-semibold"
          >
            <Plus size={18} /> Adicionar item
          </button>

          <div className="flex justify-between items-center pt-2 border-t border-[var(--color-beige)]">
            <span className="font-semibold">Total</span>
            <span className="font-display text-xl font-semibold">{formatCurrency(total)}</span>
          </div>
        </Card>

        <div>
          <h2 className="font-semibold mb-2">Forma de pagamento (opcional)</h2>
          <div className="grid grid-cols-4 gap-2">
            {FORMAS_PAGAMENTO.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
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

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Já foi pago?</span>
            <Toggle ligado={pago} onClick={() => setPago((v) => !v)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Já foi entregue?</span>
            <Toggle ligado={entregue} onClick={() => setEntregue((v) => !v)} />
          </div>
        </Card>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Observação (opcional)</span>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            placeholder="Detalhes da encomenda..."
            className="rounded-2xl border-2 border-[var(--color-beige)] px-4 py-3 outline-none focus:border-[var(--color-rose)] resize-none"
          />
        </label>

        <Button onClick={handleSalvar} disabled={salvando}>
          {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Salvar encomenda'}
        </Button>

        {editando && (
          <>
            <Button type="button" variant="outline" onClick={() => navigate(`/encomendas/${id}/nota`)} className="gap-2">
              <Receipt size={18} /> Imprimir notinha
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmarExclusao(true)} className="gap-2">
              <Trash2 size={18} /> Apagar encomenda
            </Button>
          </>
        )}
      </div>

      <ClienteQuickCreateModal
        open={novoClienteAberto}
        onCriado={handleClienteCriado}
        onFechar={() => setNovoClienteAberto(false)}
      />

      <ConfirmModal
        open={confirmarExclusao}
        title="Apagar esta encomenda?"
        description="Ela some da lista. Essa ação não pode ser desfeita."
        confirmLabel="Apagar"
        onConfirm={handleExcluir}
        onCancel={() => setConfirmarExclusao(false)}
      />
    </Layout>
  )
}
