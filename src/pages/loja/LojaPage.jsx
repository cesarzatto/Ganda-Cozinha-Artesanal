import { useCallback, useEffect, useMemo, useState } from 'react'
import { Cookie, Minus, Plus, MessageCircle, X, AlertTriangle } from 'lucide-react'
import { getProdutosPublicos } from '../../hooks/useProdutos.js'
import { registrarPedidoLoja, buscarClienteParaCheckout } from '../../hooks/useLoja.js'
import { useToast } from '../../components/ToastProvider.jsx'
import { formatCurrency, formatQuantidadeProduto } from '../../lib/format.js'
import { linkWhatsAppPedido } from '../../lib/loja.js'
import { enderecoCompletoCliente } from '../../lib/frete.js'
import { FORMAS_PAGAMENTO } from '../../lib/formasPagamento.js'
import logo from '../../assets/logo-ganda-badge.png'

function ItemLoja({ produto, quantidade, onChange }) {
  const qtd = Number(quantidade) || 0
  const max = Number(produto.estoque_atual)

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--color-beige)] last:border-0">
      <div className="w-14 h-14 rounded-2xl bg-[var(--color-beige)] overflow-hidden shrink-0 flex items-center justify-center">
        {produto.foto_url ? (
          <img src={produto.foto_url} alt={produto.nome} className="w-full h-full object-cover" />
        ) : (
          <Cookie size={22} className="text-[var(--color-brown-mid)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-tight">{produto.nome}</p>
        <p className="text-sm text-[var(--color-brown-mid)]">{formatCurrency(produto.preco_venda)}</p>
        <p className="text-xs text-[var(--color-brown-mid)]">
          {formatQuantidadeProduto(produto.estoque_atual, 'unidade').replace(/x$/, '')} disponíveis
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => onChange(String(Math.max(qtd - 1, 0)))}
          disabled={qtd <= 0}
          aria-label="Diminuir quantidade"
          className="w-9 h-9 rounded-full bg-[var(--color-beige)] flex items-center justify-center disabled:opacity-40 active:bg-[var(--color-rose)]"
        >
          <Minus size={16} />
        </button>
        <span className="w-6 text-center font-semibold">{qtd}</span>
        <button
          type="button"
          onClick={() => onChange(String(Math.min(qtd + 1, max)))}
          disabled={qtd >= max}
          aria-label="Aumentar quantidade"
          className="w-9 h-9 rounded-full bg-[var(--color-beige)] flex items-center justify-center disabled:opacity-40 active:bg-[var(--color-rose)]"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

const inputClass =
  'min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]'

function CheckoutModal({ total, itensCarrinho, onFechar, onEnviado }) {
  const showToast = useToast()
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [enviando, setEnviando] = useState(false)

  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [clienteEncontrado, setClienteEncontrado] = useState(null)
  const [usarEnderecoCadastrado, setUsarEnderecoCadastrado] = useState(true)
  const [enderecoManual, setEnderecoManual] = useState('')
  const [salvarComoPrincipal, setSalvarComoPrincipal] = useState(false)

  const enderecoCadastrado = useMemo(
    () => (clienteEncontrado ? enderecoCompletoCliente(clienteEncontrado) : ''),
    [clienteEncontrado],
  )

  // Busca o cadastro só depois que a pessoa parece ter terminado de digitar
  // o telefone (evita disparar uma consulta a cada tecla).
  useEffect(() => {
    const digitos = telefone.replace(/\D/g, '')
    if (digitos.length < 10) {
      setClienteEncontrado(null)
      return
    }
    let ativo = true
    setBuscandoCliente(true)
    const timeout = setTimeout(() => {
      buscarClienteParaCheckout(telefone)
        .then((cliente) => {
          if (!ativo) return
          setClienteEncontrado(cliente)
          setUsarEnderecoCadastrado(true)
        })
        .catch(() => ativo && setClienteEncontrado(null))
        .finally(() => ativo && setBuscandoCliente(false))
    }, 600)
    return () => {
      ativo = false
      clearTimeout(timeout)
    }
  }, [telefone])

  const enderecoFinal =
    clienteEncontrado && enderecoCadastrado && usarEnderecoCadastrado ? enderecoCadastrado : enderecoManual.trim()

  const precisaDigitarEndereco = !clienteEncontrado || !enderecoCadastrado || !usarEnderecoCadastrado

  const podeEnviar =
    nome.trim().length > 0 &&
    telefone.trim().length > 0 &&
    formaPagamento &&
    enderecoFinal.length > 0 &&
    !enviando

  async function handleEnviarPedido() {
    if (!nome.trim()) return showToast('Escreva seu nome.')
    if (!telefone.trim()) return showToast('Escreva seu telefone.')
    if (!formaPagamento) return showToast('Escolha como vai pagar.')
    if (!enderecoFinal) return showToast('Confirme o endereço de entrega.')

    setEnviando(true)
    try {
      await registrarPedidoLoja({
        nome: nome.trim(),
        telefone: telefone.trim(),
        itens: itensCarrinho.map((item) => ({
          produtoId: item.produto.id,
          quantidade: item.quantidade,
          precoUnitario: Number(item.produto.preco_venda),
        })),
        valorTotal: total,
        formaPagamento,
        endereco: enderecoFinal,
        salvarEnderecoPrincipal: !clienteEncontrado && salvarComoPrincipal,
      })

      const link = linkWhatsAppPedido({
        nome: nome.trim(),
        total: formatCurrency(total),
        itens: itensCarrinho.map((item) => ({
          linha: `${item.quantidade}x ${item.produto.nome}`,
          subtotalFormatado: formatCurrency(Number(item.produto.preco_venda) * item.quantidade),
        })),
        formaPagamentoLabel: FORMAS_PAGAMENTO.find((f) => f.value === formaPagamento)?.label,
        endereco: enderecoFinal,
      })

      onEnviado(link)
    } catch (err) {
      if (err?.message?.includes('Estoque insuficiente')) {
        showToast(err.message)
      } else {
        showToast('Não deu para enviar o pedido. Tente de novo.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-display text-xl font-semibold">Finalizar pedido</h2>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="w-9 h-9 rounded-full bg-[var(--color-beige)]/60 flex items-center justify-center active:bg-[var(--color-beige)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-5 overflow-y-auto flex flex-col gap-3">
          <div className="flex justify-between items-center text-sm pb-2 border-b border-[var(--color-beige)]">
            <span className="text-[var(--color-brown-mid)]">
              {itensCarrinho.length} {itensCarrinho.length === 1 ? 'item' : 'itens'}
            </span>
            <span className="font-display text-lg font-semibold">{formatCurrency(total)}</span>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Seu nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" className={inputClass} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Seu telefone (com DDD)</span>
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              type="tel"
              placeholder="(00) 00000-0000"
              className={inputClass}
            />
          </label>

          {buscandoCliente && <p className="text-xs text-[var(--color-brown-mid)]">Verificando cadastro...</p>}

          {!buscandoCliente && clienteEncontrado && enderecoCadastrado && (
            <div className="flex flex-col gap-2 rounded-2xl bg-[var(--color-beige)]/60 p-3">
              <span className="text-sm font-semibold">Entregar em:</span>
              <span className="text-sm text-[var(--color-brown-dark)]">{enderecoCadastrado}</span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setUsarEnderecoCadastrado(true)}
                  className={`min-h-[40px] rounded-2xl text-sm font-semibold border-2 ${
                    usarEnderecoCadastrado
                      ? 'border-[var(--color-brown-dark)] bg-white'
                      : 'border-transparent text-[var(--color-brown-mid)] bg-white/60'
                  }`}
                >
                  Sim, esse
                </button>
                <button
                  type="button"
                  onClick={() => setUsarEnderecoCadastrado(false)}
                  className={`min-h-[40px] rounded-2xl text-sm font-semibold border-2 ${
                    !usarEnderecoCadastrado
                      ? 'border-[var(--color-brown-dark)] bg-white'
                      : 'border-transparent text-[var(--color-brown-mid)] bg-white/60'
                  }`}
                >
                  Não, outro
                </button>
              </div>
            </div>
          )}

          {!buscandoCliente && precisaDigitarEndereco && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Endereço de entrega</span>
              <input
                value={enderecoManual}
                onChange={(e) => setEnderecoManual(e.target.value)}
                placeholder="Rua, número, bairro, cidade"
                className={inputClass}
              />
            </label>
          )}

          {!buscandoCliente && !clienteEncontrado && telefone.replace(/\D/g, '').length >= 10 && (
            <button
              type="button"
              onClick={() => setSalvarComoPrincipal((v) => !v)}
              aria-pressed={salvarComoPrincipal}
              className={`flex items-center justify-between gap-2 rounded-2xl p-3 text-left text-sm font-semibold border-2 ${
                salvarComoPrincipal
                  ? 'border-[var(--color-brown-dark)] bg-[var(--color-beige)]/60'
                  : 'border-[var(--color-beige)] bg-white'
              }`}
            >
              Posso cadastrar esse endereço como meu endereço principal?
              <span
                className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${
                  salvarComoPrincipal ? 'bg-[var(--color-success)]' : 'bg-[var(--color-beige)]'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    salvarComoPrincipal ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          )}

          <select
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value)}
            className={`${inputClass} bg-white`}
          >
            <option value="">Como você vai pagar?</option>
            {FORMAS_PAGAMENTO.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleEnviarPedido}
            disabled={!podeEnviar}
            className={`flex items-center justify-center gap-2 min-h-[52px] rounded-2xl font-semibold text-white mt-1 ${
              podeEnviar
                ? 'bg-[var(--color-success)] active:opacity-90'
                : 'bg-[var(--color-beige)] text-[var(--color-brown-mid)] cursor-not-allowed'
            }`}
          >
            <MessageCircle size={20} /> {enviando ? 'Enviando...' : 'Enviar pedido no WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LojaPage() {
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const [carrinho, setCarrinho] = useState({})
  const [checkoutAberto, setCheckoutAberto] = useState(false)
  const [pedidoEnviado, setPedidoEnviado] = useState(null)

  const carregar = useCallback((mostrarCarregando) => {
    if (mostrarCarregando) setCarregando(true)
    getProdutosPublicos()
      .then((data) => {
        setProdutos(data)
        setErro(false)
        // Se o estoque baixou enquanto o carrinho estava montado, ajusta
        // as quantidades já escolhidas para não deixar pedir mais do que tem.
        setCarrinho((atual) => {
          let mudou = false
          const proximo = { ...atual }
          const disponiveis = new Set(data.map((p) => p.id))
          for (const produtoId of Object.keys(proximo)) {
            const produto = data.find((p) => p.id === produtoId)
            const max = produto ? Number(produto.estoque_atual) : 0
            const qtd = Number(proximo[produtoId]) || 0
            if (!disponiveis.has(produtoId) || qtd > max) {
              proximo[produtoId] = max > 0 ? String(max) : ''
              mudou = true
            }
          }
          return mudou ? proximo : atual
        })
      })
      .catch(() => setErro(true))
      .finally(() => mostrarCarregando && setCarregando(false))
  }, [])

  useEffect(() => {
    carregar(true)

    // "focus" já significa que a aba está em primeiro plano — não precisa
    // checar visibilityState de novo (e em alguns navegadores/contextos ele
    // demora a atualizar). "visibilitychange" cobre o caso de trocar de aba
    // sem sair da janela, onde focus não dispara.
    function aoFocar() {
      carregar(false)
    }
    function aoMudarVisibilidade() {
      if (document.visibilityState === 'visible') carregar(false)
    }
    window.addEventListener('focus', aoFocar)
    document.addEventListener('visibilitychange', aoMudarVisibilidade)

    return () => {
      window.removeEventListener('focus', aoFocar)
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    }
  }, [carregar])

  function atualizarQuantidade(produtoId, valor) {
    setCarrinho((atual) => ({ ...atual, [produtoId]: valor }))
  }

  const itensCarrinho = useMemo(
    () =>
      Object.entries(carrinho)
        .map(([produtoId, quantidade]) => ({
          produto: produtos.find((p) => p.id === produtoId),
          quantidade: Number(quantidade) || 0,
        }))
        .filter((item) => item.produto && item.quantidade > 0),
    [carrinho, produtos],
  )

  const total = itensCarrinho.reduce((soma, item) => soma + Number(item.produto.preco_venda) * item.quantidade, 0)

  function handlePedidoEnviado(link) {
    setCheckoutAberto(false)
    setPedidoEnviado({ link })
    setCarrinho({})
    carregar(false)
  }

  return (
    <div className="min-h-full bg-[var(--color-bg)] pb-28">
      <header className="bg-[var(--color-brown-dark)] text-white px-4 pt-6 pb-5 rounded-b-3xl flex items-center gap-3">
        <img src={logo} alt="Ganda Cozinha Artesanal" className="w-12 h-12 rounded-full shrink-0" />
        <div>
          <h1 className="font-display text-xl font-semibold">Ganda Cozinha Artesanal</h1>
          <p className="text-sm text-white/80">Monte seu pedido</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-4">
        {carregando && <p className="text-center text-[var(--color-brown-mid)] py-10">Carregando cardápio...</p>}

        {erro && (
          <p className="text-center text-[var(--color-alert)] py-10">
            Não deu para carregar o cardápio agora. Tente de novo em instantes.
          </p>
        )}

        {!carregando && !erro && produtos.length === 0 && (
          <p className="text-center text-[var(--color-brown-mid)] py-10">Nenhum produto disponível no momento.</p>
        )}

        {produtos.length > 0 && (
          <div className="bg-white rounded-3xl shadow-[0_2px_10px_rgba(59,31,22,0.08)] p-4">
            <div className="flex flex-col">
              {produtos.map((produto) => (
                <ItemLoja
                  key={produto.id}
                  produto={produto}
                  quantidade={carrinho[produto.id] || ''}
                  onChange={(v) => atualizarQuantidade(produto.id, v)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {pedidoEnviado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center">
              <MessageCircle size={32} className="text-[var(--color-success)]" />
            </div>
            <p className="font-display text-2xl font-semibold text-[var(--color-success)]">Pedido registrado!</p>
            <p className="text-sm text-[var(--color-brown-mid)]">
              Falta só um passo: toque no botão abaixo pra abrir o WhatsApp com a mensagem do seu pedido já pronta.
            </p>

            <a
              href={pedidoEnviado.link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 min-h-[56px] w-full rounded-2xl font-semibold text-white text-lg bg-[var(--color-success)] active:opacity-90"
            >
              <MessageCircle size={22} /> Abrir WhatsApp
            </a>

            <div className="flex items-start gap-2 rounded-2xl bg-[var(--color-beige)] p-3 text-left">
              <AlertTriangle size={20} className="text-[var(--color-brown-dark)] shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-[var(--color-brown-dark)]">
                Importante: depois de abrir, toque em <span className="underline">Enviar</span> lá dentro do
                WhatsApp. Sem esse passo, o pedido não chega até nós!
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPedidoEnviado(null)}
              className="mt-1 min-h-[48px] w-full rounded-2xl border-2 border-[var(--color-beige)] font-semibold text-[var(--color-brown-dark)]"
            >
              Fazer outro pedido
            </button>
          </div>
        </div>
      )}

      {!pedidoEnviado && itensCarrinho.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[var(--color-beige)] p-4 shadow-[0_-4px_16px_rgba(59,31,22,0.1)]">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--color-brown-mid)]">
                {itensCarrinho.length} {itensCarrinho.length === 1 ? 'item' : 'itens'}
              </p>
              <p className="font-display text-xl font-semibold">{formatCurrency(total)}</p>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutAberto(true)}
              className="flex-1 min-h-[52px] rounded-2xl font-semibold text-white bg-[var(--color-success)] active:opacity-90"
            >
              Finalizar pedido
            </button>
          </div>
        </div>
      )}

      {checkoutAberto && (
        <CheckoutModal
          total={total}
          itensCarrinho={itensCarrinho}
          onFechar={() => setCheckoutAberto(false)}
          onEnviado={handlePedidoEnviado}
        />
      )}
    </div>
  )
}
