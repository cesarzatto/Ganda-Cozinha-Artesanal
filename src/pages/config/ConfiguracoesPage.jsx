import { useEffect, useState } from 'react'
import Layout from '../../components/Layout.jsx'
import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import { useToast } from '../../components/ToastProvider.jsx'
import { useConfiguracoes, salvarConfiguracoes } from '../../hooks/useConfiguracoes.js'

export default function ConfiguracoesPage() {
  const showToast = useToast()
  const { config, loading, refetch } = useConfiguracoes()
  const [valorHora, setValorHora] = useState('')
  const [margemPadrao, setMargemPadrao] = useState('')
  const [consumoMedioKmL, setConsumoMedioKmL] = useState('')
  const [precoCombustivelLitro, setPrecoCombustivelLitro] = useState('')
  const [desgastePorKm, setDesgastePorKm] = useState('')
  const [velocidadeMediaKmh, setVelocidadeMediaKmh] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (loading) return
    setValorHora(String(config.valor_hora_trabalho))
    setMargemPadrao(String(config.margem_padrao))
    setConsumoMedioKmL(String(config.consumo_medio_km_l))
    setPrecoCombustivelLitro(String(config.preco_combustivel_litro))
    setDesgastePorKm(String(config.desgaste_por_km))
    setVelocidadeMediaKmh(String(config.velocidade_media_kmh))
  }, [loading, config])

  async function handleSalvar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      await salvarConfiguracoes({
        valorHoraTrabalho: Number(valorHora) || 0,
        margemPadrao: Number(margemPadrao) || 0,
        consumoMedioKmL: Number(consumoMedioKmL) || 0,
        precoCombustivelLitro: Number(precoCombustivelLitro) || 0,
        desgastePorKm: Number(desgastePorKm) || 0,
        velocidadeMediaKmh: Number(velocidadeMediaKmh) || 0,
      })
      showToast('Configurações salvas! ✅')
      refetch()
    } catch {
      showToast('Não deu para salvar. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Layout title="Configurações" subtitle="Usadas para calcular o preço sugerido" back>
      {loading ? (
        <p className="text-center text-[var(--color-brown-mid)] py-10">Carregando...</p>
      ) : (
        <form onSubmit={handleSalvar} className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Valor da sua hora de trabalho</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={valorHora}
                onChange={(e) => setValorHora(e.target.value)}
                className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
              />
              <span className="text-xs text-[var(--color-brown-mid)]">
                Usado para calcular o custo de mão de obra de cada produto.
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Margem de lucro padrão (%)</span>
              <input
                type="number"
                inputMode="decimal"
                step="1"
                min="0"
                max="95"
                value={margemPadrao}
                onChange={(e) => setMargemPadrao(e.target.value)}
                className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
              />
              <span className="text-xs text-[var(--color-brown-mid)]">
                Usada nos produtos que não têm uma margem própria definida.
              </span>
            </label>
          </Card>

          <Card className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Custo de entrega</h2>
              <p className="text-xs text-[var(--color-brown-mid)]">
                Usados para calcular o custo estimado de frete quando a entrega é por Motoboy ou Estabelecimento.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">Consumo médio (km/l)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={consumoMedioKmL}
                  onChange={(e) => setConsumoMedioKmL(e.target.value)}
                  className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">Preço do combustível (R$/l)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={precoCombustivelLitro}
                  onChange={(e) => setPrecoCombustivelLitro(e.target.value)}
                  className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">Desgaste do veículo (R$/km)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={desgastePorKm}
                  onChange={(e) => setDesgastePorKm(e.target.value)}
                  className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">Velocidade média (km/h)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="1"
                  min="0"
                  value={velocidadeMediaKmh}
                  onChange={(e) => setVelocidadeMediaKmh(e.target.value)}
                  className="min-h-[48px] rounded-2xl border-2 border-[var(--color-beige)] px-4 outline-none focus:border-[var(--color-rose)]"
                />
              </label>
            </div>
            <span className="text-xs text-[var(--color-brown-mid)] -mt-2">
              O custo por km soma combustível + desgaste + o tempo do trajeto (usando o valor da sua hora, acima). O
              custo da entrega é a distância de ida × 2 (ida e volta) × custo por km.
            </span>
          </Card>

          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar configurações'}
          </Button>
        </form>
      )}
    </Layout>
  )
}
