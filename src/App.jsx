import { Routes, Route, useLocation } from 'react-router-dom'
import { ToastProvider } from './components/ToastProvider.jsx'
import { SideMenuProvider } from './components/SideMenuProvider.jsx'
import NovoPedidoWatcher from './components/NovoPedidoWatcher.jsx'
import SupabaseSetupNotice from './components/SupabaseSetupNotice.jsx'
import { supabaseConfigured } from './lib/supabaseClient.js'
import ResumoPage from './pages/dashboard/ResumoPage.jsx'
import ProdutosListPage from './pages/produtos/ProdutosListPage.jsx'
import ProdutoFormPage from './pages/produtos/ProdutoFormPage.jsx'
import CatalogoPdfPage from './pages/produtos/CatalogoPdfPage.jsx'
import EstoqueListPage from './pages/estoque/EstoqueListPage.jsx'
import InsumosListPage from './pages/insumos/InsumosListPage.jsx'
import InsumoFormPage from './pages/insumos/InsumoFormPage.jsx'
import ClientesListPage from './pages/clientes/ClientesListPage.jsx'
import ClienteFormPage from './pages/clientes/ClienteFormPage.jsx'
import ConfiguracoesPage from './pages/config/ConfiguracoesPage.jsx'
import VendaFormPage from './pages/vendas/VendaFormPage.jsx'
import VendaDetailPage from './pages/vendas/VendaDetailPage.jsx'
import VendaProducaoPage from './pages/vendas/VendaProducaoPage.jsx'
import OrcamentoFormPage from './pages/orcamentos/OrcamentoFormPage.jsx'
import PedidosPage from './pages/pedidos/PedidosPage.jsx'
import PedidoPdfPage from './pages/pedidos/PedidoPdfPage.jsx'
import PedidoNotaPage from './pages/pedidos/PedidoNotaPage.jsx'
import EncomendaFormPage from './pages/encomendas/EncomendaFormPage.jsx'
import EncomendaNotaPage from './pages/encomendas/EncomendaNotaPage.jsx'
import FinanceiroPage from './pages/financeiro/FinanceiroPage.jsx'
import LojaPage from './pages/loja/LojaPage.jsx'

export default function App() {
  const location = useLocation()

  if (!supabaseConfigured) {
    return <SupabaseSetupNotice />
  }

  return (
    <ToastProvider>
      <SideMenuProvider>
        {/* A loja pública é a tela do cliente — o alerta sonoro é só pra Ganda */}
        {!location.pathname.startsWith('/loja') && <NovoPedidoWatcher />}
        <Routes>
          <Route path="/" element={<ResumoPage />} />

          <Route path="/loja" element={<LojaPage />} />

          <Route path="/produtos" element={<ProdutosListPage />} />
          <Route path="/produtos/catalogo" element={<CatalogoPdfPage />} />
          <Route path="/produtos/novo" element={<ProdutoFormPage />} />
          <Route path="/produtos/:id" element={<ProdutoFormPage />} />

          <Route path="/estoque" element={<EstoqueListPage />} />

          <Route path="/insumos" element={<InsumosListPage />} />
          <Route path="/insumos/novo" element={<InsumoFormPage />} />
          <Route path="/insumos/:id" element={<InsumoFormPage />} />

          <Route path="/clientes" element={<ClientesListPage />} />
          <Route path="/clientes/novo" element={<ClienteFormPage />} />
          <Route path="/clientes/:id" element={<ClienteFormPage />} />

          <Route path="/config" element={<ConfiguracoesPage />} />

          <Route path="/financeiro" element={<FinanceiroPage />} />

          <Route path="/pedidos" element={<PedidosPage />} />
          <Route path="/pedidos/:id/pdf" element={<PedidoPdfPage />} />
          <Route path="/pedidos/:id/nota" element={<PedidoNotaPage />} />

          <Route path="/vendas/novo" element={<VendaFormPage />} />
          <Route path="/vendas/:id" element={<VendaDetailPage />} />
          <Route path="/vendas/:id/producao" element={<VendaProducaoPage />} />

          <Route path="/encomendas/novo" element={<EncomendaFormPage />} />
          <Route path="/encomendas/:id" element={<EncomendaFormPage />} />
          <Route path="/encomendas/:id/nota" element={<EncomendaNotaPage />} />

          <Route path="/orcamentos/novo" element={<OrcamentoFormPage />} />
          <Route path="/orcamentos/:id" element={<OrcamentoFormPage />} />
        </Routes>
      </SideMenuProvider>
    </ToastProvider>
  )
}
