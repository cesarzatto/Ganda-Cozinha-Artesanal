import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Wheat, Search } from 'lucide-react'
import Layout from '../../components/Layout.jsx'
import Card from '../../components/Card.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import { useInsumos } from '../../hooks/useInsumos.js'

export default function InsumosListPage() {
  const navigate = useNavigate()
  const { insumos, loading } = useInsumos()
  const [busca, setBusca] = useState('')

  const insumosExibidos = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return insumos.filter((i) => !termo || i.nome.toLowerCase().includes(termo))
  }, [insumos, busca])

  return (
    <Layout
      title="Insumos"
      subtitle={loading ? 'Carregando...' : `${insumos.length} insumo${insumos.length === 1 ? '' : 's'}`}
    >
      {!loading && insumos.length === 0 && (
        <EmptyState
          icon={Wheat}
          title="Nenhum insumo ainda"
          description="Cadastre os ingredientes que você usa nas receitas para montar a ficha técnica dos produtos."
        />
      )}

      {insumos.length > 0 && (
        <div className="relative mb-3">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-brown-mid)]" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome"
            className="w-full min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] pl-11 pr-4 outline-none focus:border-[var(--color-rose)] bg-white"
          />
        </div>
      )}

      {insumosExibidos.length === 0 && insumos.length > 0 && (
        <p className="text-center text-sm text-[var(--color-brown-mid)] py-6">Nenhum insumo encontrado.</p>
      )}

      <div className="flex flex-col gap-3">
        {insumosExibidos.map((insumo) => (
          <Card
            key={insumo.id}
            as="button"
            onClick={() => navigate(`/insumos/${insumo.id}`)}
            className="flex items-center gap-3 text-left w-full active:scale-[0.99] transition-transform"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{insumo.nome}</h3>
            </div>
            <span className="text-sm text-[var(--color-brown-mid)] shrink-0">{insumo.unidade_medida}</span>
          </Card>
        ))}
      </div>

      <button
        onClick={() => navigate('/insumos/novo')}
        aria-label="Novo insumo"
        className="fixed bottom-6 right-5 w-14 h-14 rounded-full bg-[var(--color-brown-dark)] text-white shadow-lg flex items-center justify-center active:bg-[var(--color-brown-mid)]"
      >
        <Plus size={26} />
      </button>
    </Layout>
  )
}
