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
import Suppliers from '@/pages/inventory/Suppliers'
import InventoryHistory from '@/pages/inventory/InventoryHistory'
import InventoryValuation from '@/pages/inventory/InventoryValuation'

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
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="history" element={<InventoryHistory />} />
              <Route path="valuation" element={<InventoryValuation />} />
            </Route>
            <Route path="/bar-flow" element={<ComingSoon title="Bar flow" />} />
            <Route path="/finance" element={<ComingSoon title="Finance" />} />
            <Route path="/customers" element={<ComingSoon title="Customers" />} />
            <Route path="/staff" element={<ComingSoon title="Staff" />} />
            <Route path="/settings" element={<ComingSoon title="Settings" />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
