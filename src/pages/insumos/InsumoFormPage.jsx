import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import Layout from '../../components/Layout.jsx'
import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import ConfirmModal from '../../components/ConfirmModal.jsx'
import { useToast } from '../../components/ToastProvider.jsx'
import { getInsumo, salvarInsumo, excluirInsumo } from '../../hooks/useInsumos.js'

const UNIDADES = ['g', 'kg', 'ml', 'L', 'unidade']

export default function InsumoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const showToast = useToast()

  const [carregando, setCarregando] = useState(Boolean(id))
  const [salvando, setSalvando] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)

  const [nome, setNome] = useState('')
  const [unidadeMedida, setUnidadeMedida] = useState('g')

  useEffect(() => {
    if (!id) return
    let ativo = true
    getInsumo(id)
      .then((insumo) => {
        if (!ativo) return
        setNome(insumo.nome)
        setUnidadeMedida(insumo.unidade_medida)
      })
      .catch(() => showToast('Não foi possível carregar o insumo.'))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [id, showToast])

  async function handleSalvar(e) {
    e.preventDefault()
    if (!nome.trim()) {
      showToast('Dê um nome para o insumo.')
      return
    }
    setSalvando(true)
    try {
      await salvarInsumo({
        id,
        nome: nome.trim(),
        unidadeMedida,
      })
      showToast('Insumo salvo! ✅')
      navigate('/insumos')
    } catch {
      showToast('Não deu para salvar o insumo. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir() {
    try {
      await excluirInsumo(id)
      showToast('Insumo excluído.')
      navigate('/insumos')
    } catch {
      showToast('Não foi possível excluir este insumo.')
    } finally {
      setConfirmarExclusao(false)
    }
  }

  if (carregando) {
    return (
      <Layout title={id ? 'Editar insumo' : 'Novo insumo'} back>
        <p className="text-center text-[var(--color-brown-mid)] py-10">Carregando...</p>
      </Layout>
    )
  }

  return (
    <Layout title={id ? 'Editar insumo' : 'Novo insumo'} back>
      <form onSubmit={handleSalvar} className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Nome do insumo</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Leite condensado"
              className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Unidade de medida</span>
            <select
              value={unidadeMedida}
              onChange={(e) => setUnidadeMedida(e.target.value)}
              className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)] bg-white"
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--color-brown-mid)]">
              Usada na ficha técnica dos produtos, para calcular quanto desse insumo é preciso.
            </span>
          </label>
        </Card>

        <Button type="submit" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar insumo'}
        </Button>

        {id && (
          <Button type="button" variant="outline" onClick={() => setConfirmarExclusao(true)} className="gap-2">
            <Trash2 size={18} /> Excluir insumo
          </Button>
        )}
      </form>

      <ConfirmModal
        open={confirmarExclusao}
        title="Excluir este insumo?"
        description="Se ele estiver em alguma ficha técnica, será removido de lá também."
        confirmLabel="Excluir"
        onConfirm={handleExcluir}
        onCancel={() => setConfirmarExclusao(false)}
      />
    </Layout>
  )
}
