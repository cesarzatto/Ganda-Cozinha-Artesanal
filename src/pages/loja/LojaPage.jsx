import { useCallback, useEffect, useMemo, useState } from 'react'
import { Cookie, Minus, Plus, MessageCircle } from 'lucide-react'
import { getProdutosPublicos } from '../../hooks/useProdutos.js'
import { registrarPedidoLoja } from '../../hooks/useLoja.js'
import { useToast } from '../../components/ToastProvider.jsx'
import { formatCurrency, formatQuantidadeProduto } from '../../lib/format.js'
import { linkWhatsAppPedido } from '../../lib/loja.js'
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

export default function LojaPage() {
  const showToast = useToast()
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const [carrinho, setCarrinho] = useState({})
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [enviando, setEnviando] = useState(false)
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

  const podeEnviar =
    itensCarrinho.length > 0 && nome.trim().length > 0 && telefone.trim().length > 0 && formaPagamento && !enviando

  async function handleEnviarPedido() {
    if (!nome.trim()) return showToast('Escreva seu nome.')
    if (!telefone.trim()) return showToast('Escreva seu telefone.')
    if (!formaPagamento) return showToast('Escolha como vai pagar.')
    if (itensCarrinho.length === 0) return

    // Abre a aba do WhatsApp já aqui, ainda de forma síncrona no clique —
    // se esperar a resposta do servidor pra só então abrir, o navegador
    // trata como pop-up "não solicitado" e bloqueia.
    const janela = window.open('', '_blank')

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
      })

      const link = linkWhatsAppPedido({
        nome: nome.trim(),
        total: formatCurrency(total),
        itens: itensCarrinho.map((item) => ({
          linha: `${item.quantidade}x ${item.produto.nome}`,
          subtotalFormatado: formatCurrency(Number(item.produto.preco_venda) * item.quantidade),
        })),
        formaPagamentoLabel: FORMAS_PAGAMENTO.find((f) => f.value === formaPagamento)?.label,
      })

      if (janela) janela.location.href = link
      setPedidoEnviado({ link })
      setCarrinho({})
      setNome('')
      setTelefone('')
      setFormaPagamento('')
      carregar(false)
    } catch (err) {
      if (janela) janela.close()
      if (err?.message?.includes('Estoque insuficiente')) {
        showToast(err.message)
        carregar(false)
      } else {
        showToast('Não deu para enviar o pedido. Tente de novo.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-full bg-[var(--color-bg)] pb-32">
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[var(--color-success)] p-4 shadow-[0_-4px_16px_rgba(59,31,22,0.1)]">
          <div className="max-w-lg mx-auto flex flex-col gap-2 text-center">
            <p className="font-semibold text-[var(--color-success)]">Pedido enviado! ✅</p>
            <p className="text-sm text-[var(--color-brown-mid)]">
              Se o WhatsApp não abriu sozinho,{' '}
              <a href={pedidoEnviado.link} target="_blank" rel="noreferrer" className="underline font-semibold">
                toque aqui para mandar a mensagem
              </a>
              .
            </p>
            <button
              type="button"
              onClick={() => setPedidoEnviado(null)}
              className="text-xs text-[var(--color-brown-mid)] underline mt-1"
            >
              Fazer outro pedido
            </button>
          </div>
        </div>
      )}

      {!pedidoEnviado && itensCarrinho.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[var(--color-beige)] p-4 shadow-[0_-4px_16px_rgba(59,31,22,0.1)]">
          <div className="max-w-lg mx-auto flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--color-brown-mid)]">
                {itensCarrinho.length} {itensCarrinho.length === 1 ? 'item' : 'itens'}
              </span>
              <span className="font-display text-xl font-semibold">{formatCurrency(total)}</span>
            </div>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
            />
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              type="tel"
              placeholder="Seu telefone (com DDD)"
              className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
            />
            <select
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)] bg-white"
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
              className={`flex items-center justify-center gap-2 min-h-[52px] rounded-2xl font-semibold text-white ${
                podeEnviar
                  ? 'bg-[var(--color-success)] active:opacity-90'
                  : 'bg-[var(--color-beige)] text-[var(--color-brown-mid)] cursor-not-allowed'
              }`}
            >
              <MessageCircle size={20} /> {enviando ? 'Enviando...' : 'Enviar pedido no WhatsApp'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
