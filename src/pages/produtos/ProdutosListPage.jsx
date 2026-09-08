import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Cookie, Sparkles, Clock, UtensilsCrossed, Layers, Share2 } from 'lucide-react'
import Layout from '../../components/Layout.jsx'
import Card from '../../components/Card.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import { useProdutos } from '../../hooks/useProdutos.js'
import { formatCurrency } from '../../lib/format.js'

export default function ProdutosListPage() {
  const navigate = useNavigate()
  const { produtos, loading } = useProdutos()
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')

  const categoriasPresentes = useMemo(() => {
    const set = new Set(produtos.map((p) => p.categoria).filter(Boolean))
    return Array.from(set).sort()
  }, [produtos])

  const produtosExibidos =
    categoriaFiltro === 'todas' ? produtos : produtos.filter((p) => p.categoria === categoriaFiltro)

  return (
    <Layout
      title="Produtos"
      subtitle={loading ? 'Carregando...' : `${produtosExibidos.length} produto${produtosExibidos.length === 1 ? '' : 's'}`}
      headerAction={
        <button
          onClick={() => navigate('/produtos/catalogo')}
          aria-label="Exportar catálogo"
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
        >
          <Share2 size={20} />
        </button>
      }
    >
      {!loading && produtos.length === 0 && (
        <EmptyState
          icon={Cookie}
          title="Nenhum produto ainda"
          description="Cadastre seus produtos sob encomenda ou marmitas para organizar preço e estoque."
        />
      )}

      {categoriasPresentes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto mb-3 pb-1 -mx-1 px-1">
          <button
            onClick={() => setCategoriaFiltro('todas')}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border-2 ${
              categoriaFiltro === 'todas'
                ? 'border-[var(--color-brown-dark)] bg-[var(--color-beige)]/60'
                : 'border-[var(--color-beige)] text-[var(--color-brown-mid)] bg-white'
            }`}
          >
            Todas
          </button>
          {categoriasPresentes.map((categoria) => (
            <button
              key={categoria}
              onClick={() => setCategoriaFiltro(categoria)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border-2 ${
                categoriaFiltro === categoria
                  ? 'border-[var(--color-brown-dark)] bg-[var(--color-beige)]/60'
                  : 'border-[var(--color-beige)] text-[var(--color-brown-mid)] bg-white'
              }`}
            >
              {categoria}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {produtosExibidos.map((produto) => {
          return (
            <Card
              key={produto.id}
              as="button"
              onClick={() => navigate(`/produtos/${produto.id}`)}
              className="flex items-center gap-3 text-left w-full active:scale-[0.99] transition-transform"
            >
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-beige)] overflow-hidden shrink-0 flex items-center justify-center">
                {produto.foto_url ? (
                  <img src={produto.foto_url} alt={produto.nome} className="w-full h-full object-cover" />
                ) : (
                  <Cookie size={26} className="text-[var(--color-brown-mid)]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold truncate">{produto.nome}</h3>
                  {produto.sazonal && (
                    <span title={produto.epoca_sazonal || 'Sazonal'}>
                      <Sparkles size={14} className="text-[var(--color-rose)] shrink-0" />
                    </span>
                  )}
                  {produto.sob_demanda ? (
                    <span title="Sob Encomenda">
                      <Clock size={14} className="text-[var(--color-rose)] shrink-0" />
                    </span>
                  ) : (
                    <span title="Marmita">
                      <UtensilsCrossed size={14} className="text-[var(--color-rose)] shrink-0" />
                    </span>
                  )}
                </div>
                {produto.categoria && (
                  <p className="text-sm text-[var(--color-brown-mid)] truncate">{produto.categoria}</p>
                )}
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  {!produto.vendido_separadamente && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-beige)] text-[var(--color-brown-dark)] px-2.5 py-0.5 text-xs font-semibold">
                      <Layers size={12} /> Ingrediente
                    </span>
                  )}
                </div>
              </div>

              <span className="font-display font-semibold text-lg shrink-0">
                {formatCurrency(produto.preco_venda)}
              </span>
            </Card>
          )
        })}
      </div>

      <button
        onClick={() => navigate('/produtos/novo')}
        aria-label="Novo produto"
        className="fixed bottom-6 right-5 w-14 h-14 rounded-full bg-[var(--color-brown-dark)] text-white shadow-lg flex items-center justify-center active:bg-[var(--color-brown-mid)]"
      >
        <Plus size={26} />
      </button>
    </Layout>
  )
}
