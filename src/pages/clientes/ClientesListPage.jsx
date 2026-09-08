import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Search } from 'lucide-react'
import Layout from '../../components/Layout.jsx'
import Card from '../../components/Card.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import { useClientes } from '../../hooks/useClientes.js'
import { FORMAS_CONTATO } from '../../lib/formasContato.js'

function combinaComBusca(cliente, busca) {
  if (!busca.trim()) return true
  const termo = busca.trim().toLowerCase()
  const nome = cliente.nome.toLowerCase()
  const codigo = String(cliente.codigo ?? '')
  return nome.includes(termo) || codigo.includes(termo)
}

export default function ClientesListPage() {
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const { clientes, loading } = useClientes()

  const clientesExibidos = useMemo(
    () => clientes.filter((c) => combinaComBusca(c, busca)),
    [clientes, busca],
  )

  return (
    <Layout
      title="Clientes"
      subtitle={loading ? 'Carregando...' : `${clientesExibidos.length} cliente${clientesExibidos.length === 1 ? '' : 's'}`}
    >
      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-brown-mid)]" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou código"
          className="w-full min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] pl-11 pr-4 outline-none focus:border-[var(--color-rose)] bg-white"
        />
      </div>

      {!loading && clientesExibidos.length === 0 && (
        <EmptyState
          icon={Users}
          title={busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}
          description={!busca ? 'Cadastre seus clientes para vincular às vendas.' : undefined}
        />
      )}

      <div className="flex flex-col gap-3">
        {clientesExibidos.map((cliente) => {
          const origem = FORMAS_CONTATO.find((f) => f.value === cliente.origem)
          const Icon = origem?.icon
          return (
            <Card
              key={cliente.id}
              as="button"
              onClick={() => navigate(`/clientes/${cliente.id}`)}
              className="flex items-center gap-3 text-left w-full active:scale-[0.99] transition-transform"
            >
              <div className="w-11 h-11 rounded-full bg-[var(--color-beige)] flex items-center justify-center shrink-0">
                {Icon ? <Icon size={18} className="text-[var(--color-brown-mid)]" /> : <Users size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">
                  {cliente.codigo != null && (
                    <span className="text-[var(--color-brown-mid)] font-normal">#{cliente.codigo} · </span>
                  )}
                  {cliente.nome}
                </h3>
                <p className="text-xs text-[var(--color-brown-mid)] truncate">{cliente.telefone}</p>
              </div>
            </Card>
          )
        })}
      </div>

      <button
        onClick={() => navigate('/clientes/novo')}
        aria-label="Novo cliente"
        className="fixed bottom-6 right-5 w-14 h-14 rounded-full bg-[var(--color-brown-dark)] text-white shadow-lg flex items-center justify-center active:bg-[var(--color-brown-mid)]"
      >
        <Plus size={26} />
      </button>
    </Layout>
  )
}
