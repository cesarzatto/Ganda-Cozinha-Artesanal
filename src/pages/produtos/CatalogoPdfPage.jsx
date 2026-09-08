import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Printer, Cookie } from 'lucide-react'
import { useProdutos } from '../../hooks/useProdutos.js'
import { formatCurrency, formatQuantidadeProduto } from '../../lib/format.js'
import logo from '../../assets/logo-ganda-badge.png'

function hojeFormatado() {
  return new Date().toLocaleDateString('pt-BR')
}

function ItemCatalogo({ produto, mostrarEstoque }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[var(--color-beige)]">
      <div className="w-12 h-12 rounded-xl bg-[var(--color-beige)] overflow-hidden shrink-0 flex items-center justify-center">
        {produto.foto_url ? (
          <img src={produto.foto_url} alt={produto.nome} className="w-full h-full object-cover" />
        ) : (
          <Cookie size={20} className="text-[var(--color-brown-mid)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-tight">{produto.nome}</p>
        {produto.categoria && <p className="text-xs text-[var(--color-brown-mid)] truncate">{produto.categoria}</p>}
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {mostrarEstoque && (
          <span className="text-xs text-[var(--color-brown-mid)]">
            {formatQuantidadeProduto(produto.estoque_atual, 'unidade').replace(/x$/, '')} disponíveis
          </span>
        )}
        <span className="font-display font-semibold">
          {formatCurrency(produto.preco_venda)}
          {produto.rendimento_unidade_medida !== 'unidade' ? `/${produto.rendimento_unidade_medida}` : ''}
        </span>
      </div>
    </div>
  )
}

export default function CatalogoPdfPage() {
  const navigate = useNavigate()
  const { produtos, loading } = useProdutos()

  const marmitasDisponiveis = useMemo(
    () =>
      produtos
        .filter((p) => p.vendido_separadamente && !p.sob_demanda && Number(p.estoque_atual) > 0)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [produtos],
  )

  const sobEncomenda = useMemo(
    () =>
      produtos
        .filter((p) => p.vendido_separadamente && p.sob_demanda)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [produtos],
  )

  if (loading) {
    return <p className="text-center text-[var(--color-brown-mid)] py-10">Carregando...</p>
  }

  return (
    <div className="min-h-full bg-[var(--color-bg)] print:bg-white">
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
          <Printer size={18} /> Imprimir / Salvar PDF
        </button>
      </div>

      <div className="max-w-xl mx-auto bg-white p-8 print:p-0 print:max-w-none">
        <div className="flex items-center gap-4 mb-6">
          <img src={logo} alt="Ganda Cozinha Artesanal" className="w-16 h-16 rounded-full" />
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--color-brown-dark)]">
              Ganda Cozinha Artesanal
            </h1>
            <p className="text-[var(--color-brown-mid)] text-sm">Catálogo disponível — {hojeFormatado()}</p>
          </div>
        </div>

        {marmitasDisponiveis.length === 0 && sobEncomenda.length === 0 && (
          <p className="text-sm text-[var(--color-brown-mid)]">Nenhum produto disponível no momento.</p>
        )}

        {marmitasDisponiveis.length > 0 && (
          <div className="mb-6">
            <h2 className="font-display text-lg font-semibold text-[var(--color-brown-dark)] mb-1">
              Disponível agora
            </h2>
            <div className="flex flex-col">
              {marmitasDisponiveis.map((produto) => (
                <ItemCatalogo key={produto.id} produto={produto} mostrarEstoque />
              ))}
            </div>
          </div>
        )}

        {sobEncomenda.length > 0 && (
          <div className="mb-6">
            <h2 className="font-display text-lg font-semibold text-[var(--color-brown-dark)] mb-1">Sob encomenda</h2>
            <p className="text-xs text-[var(--color-brown-mid)] mb-1">Feito na hora do pedido — consulte o prazo.</p>
            <div className="flex flex-col">
              {sobEncomenda.map((produto) => (
                <ItemCatalogo key={produto.id} produto={produto} />
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-[var(--color-brown-mid)] text-center mt-10">Gerado em {hojeFormatado()}</p>
      </div>
    </div>
  )
}
