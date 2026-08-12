import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import POS from '@/pages/POS'
import ComingSoon from '@/pages/ComingSoon'
import InventoryShell from '@/pages/inventory/InventoryShell'
import ItemsList from '@/pages/inventory/ItemsList'
import PurchaseOrders from '@/pages/inventory/PurchaseOrders'
import TransferOrders from '@/pages/inventory/TransferOrders'
import StockAdjustments from '@/pages/inventory/StockAdjustments'
import InventoryCounts from '@/pages/inventory/InventoryCounts'
import Production from '@/pages/inventory/Production'
import Suppliers from '@/pages/inventory/Suppliers'
import InventoryHistory from '@/pages/inventory/InventoryHistory'
import InventoryValuation from '@/pages/inventory/InventoryValuation'
import BarFlow from '@/pages/BarFlow'
import FinanceShell from '@/pages/finance/FinanceShell'
import Payments from '@/pages/finance/Payments'
import SalesSummary from '@/pages/finance/SalesSummary'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/inventory" element={<InventoryShell />}>
              <Route index element={<ItemsList />} />
              <Route path="purchase-orders" element={<PurchaseOrders />} />
              <Route path="transfer-orders" element={<TransferOrders />} />
              <Route path="adjustments" element={<StockAdjustments />} />
              <Route path="counts" element={<InventoryCounts />} />
              <Route path="production" element={<Production />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="history" element={<InventoryHistory />} />
              <Route path="valuation" element={<InventoryValuation />} />
            </Route>
            <Route path="/bar-flow" element={<BarFlow />} />
            <Route path="/finance" element={<FinanceShell />}>
              <Route index element={<Payments />} />
              <Route path="sales-summary" element={<SalesSummary />} />
            </Route>
            <Route path="/customers" element={<ComingSoon title="Customers" />} />
            <Route path="/staff" element={<ComingSoon title="Staff" />} />
            <Route path="/settings" element={<ComingSoon title="Settings" />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
