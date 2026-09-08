import { createContext, useContext, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { X, Home, ClipboardList, Cookie, Archive, Wheat, Users, Landmark, Settings, Store } from 'lucide-react'
import logo from '../assets/logo-ganda-badge.png'

const SideMenuContext = createContext(null)

const ITEMS = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/produtos', label: 'Produtos', icon: Cookie },
  { to: '/estoque', label: 'Estoque', icon: Archive },
  { to: '/insumos', label: 'Insumos', icon: Wheat },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/financeiro', label: 'Financeiro', icon: Landmark },
  { to: '/config', label: 'Configurações', icon: Settings },
]

export function SideMenuProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)

  return (
    <SideMenuContext.Provider value={{ isOpen, open, close }}>
      {children}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <button
            aria-label="Fechar menu"
            onClick={close}
            className="absolute inset-0 bg-black/40"
          />
          <nav className="relative w-72 max-w-[80%] h-full bg-[var(--color-bg)] shadow-xl flex flex-col animate-[slideIn_0.2s_ease-out]">
            <div className="bg-[var(--color-brown-dark)] px-5 pt-6 pb-5 flex items-center justify-between">
              <img src={logo} alt="Ganda Cozinha Artesanal" className="w-16 h-16 rounded-full shadow-md" />
              <button
                onClick={close}
                aria-label="Fechar menu"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3">
              {ITEMS.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={close}
                  className={({ isActive }) =>
                    `flex items-center gap-4 px-5 py-3.5 text-base font-semibold transition-colors ${
                      isActive
                        ? 'bg-[var(--color-beige)] text-[var(--color-brown-dark)]'
                        : 'text-[var(--color-brown-mid)] active:bg-[var(--color-beige)]/50'
                    }`
                  }
                >
                  <Icon size={22} />
                  {label}
                </NavLink>
              ))}

              <a
                href="/loja"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 px-5 py-3.5 text-base font-semibold text-[var(--color-brown-mid)] active:bg-[var(--color-beige)]/50 mt-2 border-t border-[var(--color-beige)] pt-4"
              >
                <Store size={22} />
                Loja (link p/ clientes)
              </a>
            </div>
          </nav>
        </div>
      )}
    </SideMenuContext.Provider>
  )
}

export function useSideMenu() {
  const ctx = useContext(SideMenuContext)
  if (!ctx) throw new Error('useSideMenu deve ser usado dentro de SideMenuProvider')
  return ctx
}
