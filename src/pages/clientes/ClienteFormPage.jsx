import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import Card from '../../components/Card.jsx'
import ClienteForm from '../../components/ClienteForm.jsx'
import ConfirmModal from '../../components/ConfirmModal.jsx'
import { useToast } from '../../components/ToastProvider.jsx'
import { getCliente, excluirCliente } from '../../hooks/useClientes.js'

export default function ClienteFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const showToast = useToast()

  const [cliente, setCliente] = useState(null)
  const [carregando, setCarregando] = useState(Boolean(id))
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)

  useEffect(() => {
    if (!id) return
    let ativo = true
    getCliente(id)
      .then((c) => ativo && setCliente(c))
      .catch(() => showToast('Não foi possível carregar o cliente.'))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [id, showToast])

  async function handleExcluir() {
    try {
      await excluirCliente(id)
      showToast('Cliente excluído.')
      navigate('/clientes')
    } catch {
      showToast('Esse cliente já tem vendas registradas e não pode ser excluído.')
    } finally {
      setConfirmarExclusao(false)
    }
  }

  if (carregando) {
    return (
      <Layout title={id ? 'Editar cliente' : 'Novo cliente'} back>
        <p className="text-center text-[var(--color-brown-mid)] py-10">Carregando...</p>
      </Layout>
    )
  }

  return (
    <Layout title={id ? 'Editar cliente' : 'Novo cliente'} back>
      <Card>
        <ClienteForm
          clienteInicial={cliente}
          onSalvo={() => navigate('/clientes')}
          onExcluir={id ? () => setConfirmarExclusao(true) : undefined}
        />
      </Card>

      <ConfirmModal
        open={confirmarExclusao}
        title="Excluir este cliente?"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={handleExcluir}
        onCancel={() => setConfirmarExclusao(false)}
      />
    </Layout>
  )
}
