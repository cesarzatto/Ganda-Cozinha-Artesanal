import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import Button from './Button.jsx'
import { FORMAS_CONTATO } from '../lib/formasContato.js'
import { useToast } from './ToastProvider.jsx'
import { salvarCliente } from '../hooks/useClientes.js'
import { buscarEnderecoPorCep } from '../lib/cep.js'

const ESTADO_INICIAL = {
  nome: '',
  dataNascimento: '',
  origem: '',
  indicadoPor: '',
  documento: '',
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  telefone: '',
  email: '',
  instagram: '',
}

export default function ClienteForm({ clienteInicial, valoresIniciais, onSalvo, onCancelar, onExcluir }) {
  const showToast = useToast()
  const [campos, setCampos] = useState(() => ({ ...ESTADO_INICIAL, ...valoresIniciais }))
  const [salvando, setSalvando] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [cidadeUfCep, setCidadeUfCep] = useState('')

  useEffect(() => {
    if (!clienteInicial) return
    setCampos({
      nome: clienteInicial.nome,
      dataNascimento: clienteInicial.data_nascimento || '',
      origem: clienteInicial.origem,
      indicadoPor: clienteInicial.indicado_por || '',
      documento: clienteInicial.documento || '',
      cep: clienteInicial.cep || '',
      rua: clienteInicial.rua || '',
      numero: clienteInicial.numero || '',
      complemento: clienteInicial.complemento || '',
      telefone: clienteInicial.telefone || '',
      email: clienteInicial.email || '',
      instagram: clienteInicial.instagram || '',
    })
  }, [clienteInicial])

  function set(campo, valor) {
    setCampos((c) => ({ ...c, [campo]: valor }))
  }

  // Busca o endereço pelo CEP (ViaCEP, gratuito, sem chave) assim que o
  // campo perde o foco com 8 dígitos — preenche a rua automaticamente,
  // deixando só número e complemento pra digitar.
  async function handleCepBlur() {
    setCidadeUfCep('')
    if (campos.cep.replace(/\D/g, '').length !== 8) return

    setBuscandoCep(true)
    try {
      const endereco = await buscarEnderecoPorCep(campos.cep)
      if (!endereco) {
        showToast('CEP não encontrado.')
        return
      }
      if (endereco.rua) set('rua', endereco.rua)
      setCidadeUfCep(endereco.cidadeUf)
    } catch {
      // sem internet ou API fora do ar: deixa a pessoa preencher na mão, sem travar o cadastro
    } finally {
      setBuscandoCep(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!campos.nome.trim()) return showToast('Dê um nome para o cliente.')
    if (!campos.origem) return showToast('Escolha por onde o cliente chegou.')
    if (!campos.rua.trim() || !campos.numero.trim()) {
      return showToast('Preencha rua e número do endereço.')
    }
    if (!campos.telefone.trim()) return showToast('Preencha o telefone do cliente.')

    setSalvando(true)
    try {
      const id = await salvarCliente({
        id: clienteInicial?.id,
        tipo: 'PF',
        nome: campos.nome.trim(),
        razaoSocial: '',
        dataNascimento: campos.dataNascimento,
        origem: campos.origem,
        indicadoPor: campos.indicadoPor.trim(),
        documento: campos.documento.trim(),
        cep: campos.cep.trim(),
        rua: campos.rua.trim(),
        numero: campos.numero.trim(),
        complemento: campos.complemento.trim(),
        telefone: campos.telefone.trim(),
        email: campos.email.trim(),
        instagram: campos.instagram.trim(),
      })
      showToast('Cliente salvo! ✅')
      onSalvo(id)
    } catch {
      showToast('Não deu para salvar o cliente. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  const inputClass =
    'min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Nome</span>
        <input
          value={campos.nome}
          onChange={(e) => set('nome', e.target.value)}
          placeholder="Nome completo"
          className={inputClass}
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Data de nascimento (opcional)</span>
        <input
          type="date"
          value={campos.dataNascimento}
          onChange={(e) => set('dataNascimento', e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">CPF (opcional)</span>
        <input
          value={campos.documento}
          onChange={(e) => set('documento', e.target.value)}
          placeholder="000.000.000-00"
          className={inputClass}
        />
      </label>

      <div>
        <span className="text-sm font-semibold block mb-1">Por onde ela chegou?</span>
        <div className="grid grid-cols-4 gap-2">
          {FORMAS_CONTATO.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => set('origem', value)}
              className={`flex flex-col items-center gap-1 rounded-2xl p-2.5 border-2 ${
                campos.origem === value
                  ? 'border-[var(--color-brown-dark)] bg-[var(--color-beige)]/60'
                  : 'border-[var(--color-beige)] bg-white'
              }`}
            >
              <Icon size={20} />
              <span className="text-[11px] font-semibold text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {campos.origem === 'indicacao' && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Quem indicou?</span>
          <input
            value={campos.indicadoPor}
            onChange={(e) => set('indicadoPor', e.target.value)}
            placeholder="Nome de quem indicou"
            className={inputClass}
          />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Telefone</span>
        <input
          type="tel"
          value={campos.telefone}
          onChange={(e) => set('telefone', e.target.value)}
          placeholder="(00) 00000-0000"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">CEP (opcional)</span>
        <input
          value={campos.cep}
          onChange={(e) => set('cep', e.target.value)}
          onBlur={handleCepBlur}
          placeholder="00000-000"
          className={inputClass}
        />
        {buscandoCep && <span className="text-xs text-[var(--color-brown-mid)]">Buscando endereço...</span>}
        {cidadeUfCep && <span className="text-xs text-[var(--color-brown-mid)]">{cidadeUfCep}</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Rua</span>
        <input
          value={campos.rua}
          onChange={(e) => set('rua', e.target.value)}
          placeholder="Nome da rua"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Número</span>
        <input
          value={campos.numero}
          onChange={(e) => set('numero', e.target.value)}
          placeholder="Nº"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Complemento (opcional)</span>
        <input
          value={campos.complemento}
          onChange={(e) => set('complemento', e.target.value)}
          placeholder="Apto, bloco, referência..."
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">E-mail (opcional)</span>
        <input
          type="email"
          value={campos.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="email@exemplo.com"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Instagram (opcional)</span>
        <input
          value={campos.instagram}
          onChange={(e) => set('instagram', e.target.value)}
          placeholder="@usuario"
          className={inputClass}
        />
      </label>

      <Button type="submit" disabled={salvando}>
        {salvando ? 'Salvando...' : 'Salvar cliente'}
      </Button>

      {onCancelar && (
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      )}

      {onExcluir && (
        <Button type="button" variant="outline" onClick={onExcluir} className="gap-2">
          <Trash2 size={18} /> Excluir cliente
        </Button>
      )}
    </form>
  )
}
