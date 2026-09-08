import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Pencil, Share2 } from 'lucide-react'
import Layout from '../../components/Layout.jsx'
import Card from '../../components/Card.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import StockBadge from '../../components/StockBadge.jsx'
import MovimentacaoModal from '../../components/MovimentacaoModal.jsx'
import { useToast } from '../../components/ToastProvider.jsx'
import { useProdutos, registrarMovimentacaoProduto } from '../../hooks/useProdutos.js'

export default function EstoqueListPage() {
  const navigate = useNavigate()
  const showToast = useToast()
  const { produtos: todosProdutos, loading, refetch } = useProdutos()
  const [produtoSelecionado, setProdutoSelecionado] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const [soAcabando, setSoAcabando] = useState(false)

  const produtos = todosProdutos.filter((p) => p.vendido_separadamente && !p.sob_demanda)

  const produtosAbaixoDoMinimo = produtos.filter(
    (p) => Number(p.estoque_atual) <= Number(p.estoque_minimo),
  ).length

  const produtosExibidos = soAcabando
    ? produtos.filter((p) => Number(p.estoque_atual) <= Number(p.estoque_minimo))
    : produtos

  async function handleConfirmarMovimentacao({ tipo, quantidade, motivo }) {
    setSalvando(true)
    try {
      await registrarMovimentacaoProduto({ produtoId: produtoSelecionado.id, tipo, quantidade, motivo })
      showToast(tipo === 'entrada' ? 'Entrada registrada! ✅' : 'Saída registrada! ✅')
      setProdutoSelecionado(null)
      refetch()
    } catch {
      showToast('Não deu para registrar. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Layout
      title="Estoque"
      subtitle={
        loading
          ? 'Carregando...'
          : produtosAbaixoDoMinimo > 0
            ? `${produtosAbaixoDoMinimo} produto${produtosAbaixoDoMinimo === 1 ? '' : 's'} acabando`
            : `${produtos.length} produto${produtos.length === 1 ? '' : 's'}`
      }
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
          icon={Archive}
          title="Nenhum produto cadastrado"
          description="Cadastre seus produtos na aba Produtos para depois controlar quantos você tem prontos."
        />
      )}

      {produtos.length > 0 && (
        <button
          onClick={() => setSoAcabando((v) => !v)}
          className={`w-full min-h-[44px] rounded-2xl text-sm font-semibold border-2 mb-3 ${
            soAcabando
              ? 'border-[var(--color-alert)] bg-[var(--color-alert)]/10 text-[var(--color-alert)]'
              : 'border-[var(--color-beige)] text-[var(--color-brown-mid)] bg-white'
          }`}
        >
          {soAcabando ? 'Mostrando só os que estão acabando' : 'Mostrar só os que estão acabando'}
        </button>
      )}

      {soAcabando && produtosExibidos.length === 0 && (
        <p className="text-center text-sm text-[var(--color-brown-mid)] py-6">
          Nenhum produto abaixo do estoque mínimo agora.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {produtosExibidos.map((produto) => (
          <Card key={produto.id} className="flex items-center gap-3">
            <button
              onClick={() =>
                setProdutoSelecionado({
                  id: produto.id,
                  nome: produto.nome,
                  quantidadeAtual: produto.estoque_atual,
                  unidadeLabel: 'un',
                })
              }
              className="flex-1 min-w-0 flex items-center gap-3 text-left active:opacity-70"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{produto.nome}</h3>
                {produto.categoria && (
                  <p className="text-xs text-[var(--color-brown-mid)] truncate">{produto.categoria}</p>
                )}
              </div>
              <StockBadge quantidade={produto.estoque_atual} unidade="un" minimo={produto.estoque_minimo} />
            </button>
            <button
              onClick={() => navigate(`/produtos/${produto.id}`)}
              aria-label="Editar produto"
              className="w-10 h-10 shrink-0 rounded-full bg-[var(--color-beige)]/60 flex items-center justify-center active:bg-[var(--color-beige)]"
            >
              <Pencil size={16} />
            </button>
          </Card>
        ))}
      </div>

      <MovimentacaoModal
        item={produtoSelecionado}
        salvando={salvando}
        onConfirm={handleConfirmarMovimentacao}
        onCancel={() => setProdutoSelecionado(null)}
      />
    </Layout>
  )
}
