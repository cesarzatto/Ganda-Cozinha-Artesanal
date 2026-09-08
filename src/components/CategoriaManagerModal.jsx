import { useState } from 'react'
import { X, Plus, Trash2, Tag } from 'lucide-react'
import { useCategorias, criarCategoria, excluirCategoria } from '../hooks/useCategorias.js'
import { useToast } from './ToastProvider.jsx'

export default function CategoriaManagerModal({ open, onFechar }) {
  const { categorias, loading, refetch } = useCategorias()
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)
  const showToast = useToast()

  if (!open) return null

  async function handleAdicionar(e) {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvando(true)
    try {
      await criarCategoria(nome.trim())
      setNome('')
      refetch()
    } catch {
      showToast('Essa categoria já existe ou não deu pra salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(id) {
    try {
      await excluirCategoria(id)
      refetch()
    } catch {
      showToast('Não foi possível excluir essa categoria.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-display text-xl font-semibold">Categorias</h2>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="w-9 h-9 rounded-full bg-[var(--color-beige)]/60 flex items-center justify-center active:bg-[var(--color-beige)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-5 overflow-y-auto flex flex-col gap-4">
          <form onSubmit={handleAdicionar} className="flex gap-2">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nova categoria"
              className="flex-1 min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
            />
            <button
              type="submit"
              disabled={salvando}
              aria-label="Adicionar categoria"
              className="w-12 h-12 shrink-0 rounded-2xl bg-[var(--color-brown-dark)] text-white flex items-center justify-center disabled:opacity-50"
            >
              <Plus size={20} />
            </button>
          </form>

          {!loading && categorias.length === 0 && (
            <p className="text-center text-sm text-[var(--color-brown-mid)] py-4">Nenhuma categoria ainda.</p>
          )}

          <div className="flex flex-col gap-2">
            {categorias.map((categoria) => (
              <div
                key={categoria.id}
                className="flex items-center gap-3 rounded-2xl p-3 border-2 border-[var(--color-beige)]"
              >
                <Tag size={16} className="text-[var(--color-brown-mid)] shrink-0" />
                <span className="flex-1 min-w-0 truncate font-semibold">{categoria.nome}</span>
                <button
                  onClick={() => handleExcluir(categoria.id)}
                  aria-label={`Excluir categoria ${categoria.nome}`}
                  className="w-9 h-9 shrink-0 rounded-full bg-[var(--color-alert)]/10 text-[var(--color-alert)] flex items-center justify-center active:bg-[var(--color-alert)]/20"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
