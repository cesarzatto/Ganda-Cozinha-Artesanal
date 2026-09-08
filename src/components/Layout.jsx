import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Menu } from 'lucide-react'
import { useSideMenu } from './SideMenuProvider.jsx'
import { useVendasSemCliente } from '../hooks/useVendas.js'
import logo from '../assets/logo-ganda-badge.png'

export default function Layout({ title, subtitle, back, headerAction, children }) {
  const navigate = useNavigate()
  const { open } = useSideMenu()
  const { vendas: vendasSemCliente } = useVendasSemCliente()

  return (
    <div className="min-h-full flex flex-col">
      <header className="relative bg-[var(--color-brown-dark)] text-[var(--color-bg)] px-4 pt-6 pb-5 rounded-b-3xl">
        <div className="absolute left-4 top-6 flex items-center gap-2">
          <button
            onClick={() => (back ? navigate(-1) : open())}
            aria-label={back ? 'Voltar' : 'Abrir menu'}
            className="relative w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 shrink-0"
          >
            {back ? <ChevronLeft size={22} /> : <Menu size={22} />}
            {!back && vendasSemCliente.length > 0 && (
              <span
                aria-label="Tem pedido sem cliente cadastrado"
                className="absolute top-1 right-1 w-3 h-3 rounded-full bg-white ring-2 ring-[var(--color-alert)]"
              />
            )}
          </button>
          <img src={logo} alt="Ganda Cozinha Artesanal" className="w-10 h-10 rounded-full shrink-0" />
        </div>
        <div className="max-w-lg mx-auto flex items-center gap-3 pl-28">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-semibold truncate">{title}</h1>
            {subtitle && <p className="text-[var(--color-rose)] text-sm mt-0.5">{subtitle}</p>}
          </div>
          {headerAction}
        </div>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-5 pb-10">{children}</main>
    </div>
  )
}
