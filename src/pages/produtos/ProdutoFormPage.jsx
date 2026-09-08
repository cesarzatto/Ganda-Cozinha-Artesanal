import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, Plus, Trash2, Clock, UtensilsCrossed, X } from 'lucide-react'
import Layout from '../../components/Layout.jsx'
import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import ConfirmModal from '../../components/ConfirmModal.jsx'
import { useToast } from '../../components/ToastProvider.jsx'
import { useInsumos } from '../../hooks/useInsumos.js'
import { useCategorias } from '../../hooks/useCategorias.js'
import { useProdutos, getProduto, getFichaTecnica, salvarProduto, excluirProduto } from '../../hooks/useProdutos.js'
import { uploadFotoProduto } from '../../lib/uploadFoto.js'
import CategoriaManagerModal from '../../components/CategoriaManagerModal.jsx'

function novaLinhaFicha() {
  return { key: crypto.randomUUID(), tipo: 'insumo', refId: '', quantidade: '' }
}

const UNIDADES_RENDIMENTO = ['unidade', 'g', 'kg', 'ml', 'L']

export default function ProdutoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const showToast = useToast()
  const { insumos } = useInsumos()
  const { produtos } = useProdutos()
  const { categorias, refetch: refetchCategorias } = useCategorias()

  const [carregando, setCarregando] = useState(Boolean(id))
  const [salvando, setSalvando] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [gerenciarCategorias, setGerenciarCategorias] = useState(false)

  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [sobDemanda, setSobDemanda] = useState(false)
  const [fotoUrl, setFotoUrl] = useState('')
  const [fotoFile, setFotoFile] = useState(null)
  const [itensFicha, setItensFicha] = useState([novaLinhaFicha()])

  const [rendimentoLote, setRendimentoLote] = useState('1')
  const [rendimentoUnidadeMedida, setRendimentoUnidadeMedida] = useState('unidade')

  const [precoVenda, setPrecoVenda] = useState('')

  const [estoqueMinimo, setEstoqueMinimo] = useState('')
  const [quantidadeInicial, setQuantidadeInicial] = useState('')

  const subProdutosDisponiveis = useMemo(
    () => produtos.filter((p) => !p.vendido_separadamente && p.id !== id),
    [produtos, id],
  )

  useEffect(() => {
    if (!id) return
    let ativo = true
    async function carregar() {
      try {
        const [produto, ficha] = await Promise.all([getProduto(id), getFichaTecnica(id)])
        if (!ativo) return
        setNome(produto.nome)
        setCategoria(produto.categoria || '')
        setSobDemanda(produto.sob_demanda ?? false)
        setFotoUrl(produto.foto_url || '')
        setItensFicha(
          ficha.length > 0
            ? ficha.map((item) => ({
                key: item.id,
                tipo: item.sub_produto_id ? 'sub_produto' : 'insumo',
                refId: item.sub_produto_id || item.insumo_id,
                quantidade: String(item.quantidade),
              }))
            : [novaLinhaFicha()],
        )
        setRendimentoLote(String(produto.rendimento_lote ?? 1))
        setRendimentoUnidadeMedida(produto.rendimento_unidade_medida || 'unidade')
        setPrecoVenda(String(produto.preco_venda ?? ''))
        setEstoqueMinimo(String(produto.estoque_minimo ?? ''))
      } catch {
        showToast('Não foi possível carregar o produto.')
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [id, showToast])

  // Quando o produto é medido (g/kg/ml/L, não "unidade"), a ficha técnica
  // descreve a receita inteira (o lote), não uma unidade só — por isso pede
  // quanto ela rende. Isso é usado só para calcular quanto de cada insumo é
  // necessário num orçamento/venda (ver src/lib/insumosNecessarios.js),
  // não para custo.
  const ehProdutoMedido = rendimentoUnidadeMedida !== 'unidade'

  const atualizarLinha = useCallback((key, campo, valor) => {
    setItensFicha((linhas) => linhas.map((linha) => (linha.key === key ? { ...linha, [campo]: valor } : linha)))
  }, [])

  const atualizarLinhaRef = useCallback((key, valorCombinado) => {
    const [tipo, refId] = valorCombinado ? valorCombinado.split(':') : ['insumo', '']
    setItensFicha((linhas) => linhas.map((linha) => (linha.key === key ? { ...linha, tipo, refId } : linha)))
  }, [])

  const removerLinha = useCallback((key) => {
    setItensFicha((linhas) => (linhas.length > 1 ? linhas.filter((linha) => linha.key !== key) : linhas))
  }, [])

  async function handleSalvar(e) {
    e.preventDefault()
    if (!nome.trim()) {
      showToast('Dê um nome para o produto.')
      return
    }

    setSalvando(true)
    try {
      let novaFotoUrl = fotoUrl
      if (fotoFile) {
        novaFotoUrl = await uploadFotoProduto(fotoFile)
      }

      await salvarProduto({
        id,
        nome: nome.trim(),
        categoria: categoria.trim(),
        precoVenda: Number(precoVenda) || 0,
        precoManual: true,
        sazonal: false,
        epocaSazonal: '',
        sobDemanda,
        vendidoSeparadamente: true,
        fotoUrl: novaFotoUrl,
        tempoProducaoMinutos: 0,
        rendimentoLote: sobDemanda ? Math.max(Number(rendimentoLote) || 1, 1) : 1,
        rendimentoUnidadeMedida: sobDemanda ? rendimentoUnidadeMedida : 'unidade',
        custoIndiretoUnidade: 0,
        margemDesejada: null,
        estoqueMinimo: Number(estoqueMinimo) || 0,
        quantidadeInicial: Number(quantidadeInicial) || 0,
        itensFicha: sobDemanda
          ? itensFicha
              .filter((item) => item.refId && Number(item.quantidade) > 0)
              .map((item) => ({ tipo: item.tipo, refId: item.refId, quantidade: Number(item.quantidade) }))
          : [],
      })

      showToast('Produto salvo! ✅')
      navigate('/produtos')
    } catch {
      showToast('Não deu para salvar o produto. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir() {
    try {
      await excluirProduto(id)
      showToast('Produto excluído.')
      navigate('/produtos')
    } catch {
      showToast('Esse produto já tem vendas registradas e não pode ser excluído.')
    } finally {
      setConfirmarExclusao(false)
    }
  }

  if (carregando) {
    return (
      <Layout title={id ? 'Editar produto' : 'Novo produto'} back>
        <p className="text-center text-[var(--color-brown-mid)] py-10">Carregando...</p>
      </Layout>
    )
  }

  return (
    <Layout title={id ? 'Editar produto' : 'Novo produto'} back>
      <form onSubmit={handleSalvar} className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <label className="w-20 h-20 rounded-2xl bg-[var(--color-beige)] shrink-0 flex items-center justify-center overflow-hidden cursor-pointer">
              {fotoFile ? (
                <img src={URL.createObjectURL(fotoFile)} alt="" className="w-full h-full object-cover" />
              ) : fotoUrl ? (
                <img src={fotoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Camera size={24} className="text-[var(--color-brown-mid)]" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
              />
            </label>
            <p className="text-sm text-[var(--color-brown-mid)]">Foto do produto (opcional). Toque para escolher.</p>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Nome do produto</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Trufa de Maracujá"
              className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 focus:border-[var(--color-rose)] outline-none"
              required
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Tipo de produto</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSobDemanda(true)}
                aria-pressed={sobDemanda}
                className={`flex flex-col items-center gap-1 rounded-2xl p-3 border-2 ${
                  sobDemanda
                    ? 'border-[var(--color-brown-dark)] bg-[var(--color-beige)]/60'
                    : 'border-[var(--color-beige)] bg-white text-[var(--color-brown-mid)]'
                }`}
              >
                <Clock size={20} />
                <span className="text-sm font-semibold">Sob Encomenda</span>
              </button>
              <button
                type="button"
                onClick={() => setSobDemanda(false)}
                aria-pressed={!sobDemanda}
                className={`flex flex-col items-center gap-1 rounded-2xl p-3 border-2 ${
                  !sobDemanda
                    ? 'border-[var(--color-brown-dark)] bg-[var(--color-beige)]/60'
                    : 'border-[var(--color-beige)] bg-white text-[var(--color-brown-mid)]'
                }`}
              >
                <UtensilsCrossed size={20} />
                <span className="text-sm font-semibold">Marmita</span>
              </button>
            </div>
            <p className="text-xs text-[var(--color-brown-mid)]">
              {sobDemanda
                ? 'Feito na hora do pedido. Não valida nem desconta do estoque. Cadastre a ficha técnica para o sistema calcular quanto de insumo é necessário em cada orçamento ou venda.'
                : 'Preço fixo e controle de estoque simples — sem ficha técnica.'}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Categoria</span>
              <button
                type="button"
                onClick={() => setGerenciarCategorias(true)}
                className="text-sm font-semibold text-[var(--color-brown-dark)] underline"
              >
                Gerenciar categorias
              </button>
            </div>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)] bg-white"
            >
              <option value="">Sem categoria</option>
              {categoria && !categorias.some((c) => c.nome === categoria) && (
                <option value={categoria}>{categoria} (não cadastrada)</option>
              )}
              {categorias.map((c) => (
                <option key={c.id} value={c.nome}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

        </Card>

        {sobDemanda && (
          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold">Ficha técnica</h2>

            {insumos.length === 0 && subProdutosDisponiveis.length === 0 && (
              <p className="text-sm text-[var(--color-brown-mid)]">
                Cadastre insumos na aba Insumos para montar a ficha técnica deste produto.
              </p>
            )}

            {itensFicha.map((linha) => (
              <div key={linha.key} className="flex gap-2 items-center">
                <select
                  value={linha.refId ? `${linha.tipo}:${linha.refId}` : ''}
                  onChange={(e) => atualizarLinhaRef(linha.key, e.target.value)}
                  className="flex-1 min-w-0 min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-3 outline-none focus:border-[var(--color-rose)] bg-white"
                >
                  <option value="">Escolha o insumo ou sub-produto</option>
                  {insumos.length > 0 && (
                    <optgroup label="Insumos">
                      {insumos.map((insumo) => (
                        <option key={insumo.id} value={`insumo:${insumo.id}`}>
                          {insumo.nome} ({insumo.unidade_medida})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {subProdutosDisponiveis.length > 0 && (
                    <optgroup label="Sub-produtos">
                      {subProdutosDisponiveis.map((p) => (
                        <option key={p.id} value={`sub_produto:${p.id}`}>
                          {p.nome}
                          {p.rendimento_unidade_medida && p.rendimento_unidade_medida !== 'unidade'
                            ? ` (${p.rendimento_unidade_medida})`
                            : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min="0"
                  value={linha.quantidade}
                  onChange={(e) => atualizarLinha(linha.key, 'quantidade', e.target.value)}
                  placeholder="Qtd."
                  className="w-20 min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-3 outline-none focus:border-[var(--color-rose)]"
                />
                <button
                  type="button"
                  onClick={() => removerLinha(linha.key)}
                  aria-label="Remover ingrediente"
                  className="w-11 h-11 shrink-0 rounded-2xl bg-[var(--color-beige)]/60 flex items-center justify-center active:bg-[var(--color-beige)]"
                >
                  <X size={18} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setItensFicha((linhas) => [...linhas, novaLinhaFicha()])}
              className="flex items-center justify-center gap-2 min-h-[44px] rounded-2xl border-2 border-dashed border-[var(--color-rose)] text-[var(--color-brown-mid)] font-semibold"
            >
              <Plus size={18} /> Adicionar ingrediente
            </button>

            <div className="pt-2 border-t border-[var(--color-beige)] flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">Como você vende esse produto?</span>
                <select
                  value={rendimentoUnidadeMedida}
                  onChange={(e) => setRendimentoUnidadeMedida(e.target.value)}
                  className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-3 outline-none focus:border-[var(--color-rose)] bg-white"
                >
                  {UNIDADES_RENDIMENTO.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>

              {ehProdutoMedido && (
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">Quanto essa receita rende? (em {rendimentoUnidadeMedida})</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="1"
                    value={rendimentoLote}
                    onChange={(e) => setRendimentoLote(e.target.value)}
                    className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
                  />
                </label>
              )}

              <p className="text-xs text-[var(--color-brown-mid)]">
                {ehProdutoMedido
                  ? `A ficha técnica acima descreve a receita inteira (ex: os insumos de toda a panela). Diga quanto ela rende (ex: 1 ${rendimentoUnidadeMedida}) e, quando você usar esse produto num orçamento ou venda, o sistema calcula quanto de cada insumo é preciso para a quantidade pedida.`
                  : 'A quantidade de cada ingrediente acima já é por unidade deste produto. Quando você usar esse produto num orçamento ou venda, o sistema calcula quanto de cada insumo é preciso para a quantidade pedida.'}
              </p>
            </div>
          </Card>
        )}

        <Card className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold">Preço</h2>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Preço de venda</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
              placeholder="R$ 0,00"
              className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 text-lg outline-none focus:border-[var(--color-rose)]"
              required
            />
          </label>
        </Card>

        {!sobDemanda && (
          <Card className="flex flex-col gap-4">
            <h2 className="font-display text-lg font-semibold">Estoque</h2>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Estoque mínimo (alerta)</span>
              <input
                type="number"
                inputMode="decimal"
                step="1"
                min="0"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(e.target.value)}
                placeholder="0"
                className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
              />
            </label>
            {!id && (
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">Quantidade já pronta em estoque</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="1"
                  min="0"
                  value={quantidadeInicial}
                  onChange={(e) => setQuantidadeInicial(e.target.value)}
                  placeholder="0"
                  className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
                />
              </label>
            )}
          </Card>
        )}

        <Button type="submit" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar produto'}
        </Button>

        {id && (
          <Button type="button" variant="outline" onClick={() => setConfirmarExclusao(true)} className="gap-2">
            <Trash2 size={18} /> Excluir produto
          </Button>
        )}
      </form>

      <ConfirmModal
        open={confirmarExclusao}
        title="Excluir este produto?"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={handleExcluir}
        onCancel={() => setConfirmarExclusao(false)}
      />

      <CategoriaManagerModal
        open={gerenciarCategorias}
        onFechar={() => {
          setGerenciarCategorias(false)
          refetchCategorias()
        }}
      />
    </Layout>
  )
}
