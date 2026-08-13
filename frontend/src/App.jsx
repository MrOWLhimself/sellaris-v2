import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { BranchProvider } from '@/context/BranchContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'

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
import Expenses from '@/pages/finance/Expenses'
import ProfitAndLoss from '@/pages/finance/ProfitAndLoss'
import ReportsShell from '@/pages/finance/reports/ReportsShell'
import SalesSummary from '@/pages/finance/reports/SalesSummary'
import SalesByItem from '@/pages/finance/reports/SalesByItem'
import SalesByCategory from '@/pages/finance/reports/SalesByCategory'
import SalesByEmployee from '@/pages/finance/reports/SalesByEmployee'
import SalesByPaymentType from '@/pages/finance/reports/SalesByPaymentType'
import Discounts from '@/pages/finance/reports/Discounts'
import Taxes from '@/pages/finance/reports/Taxes'
import Customers from '@/pages/Customers'
import PublicMenu from '@/pages/PublicMenu'
import Signup from '@/pages/Signup'
import SettingsShell from '@/pages/settings/SettingsShell'
import Features from '@/pages/settings/Features'
import PaymentTypes from '@/pages/settings/PaymentTypes'
import Loyalty from '@/pages/settings/Loyalty'
import TaxesSettings from '@/pages/settings/TaxesSettings'
import Receipt from '@/pages/settings/Receipt'
import Stores from '@/pages/settings/Stores'
import { AdminGuard } from '@/pages/admin/AdminGuard'
import SuperAdmin from '@/pages/admin/SuperAdmin'
import StaffShell from '@/pages/staff/StaffShell'
import Employees from '@/pages/staff/Employees'
import AccessRights from '@/pages/staff/AccessRights'

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <BranchProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/menu/:slug" element={<PublicMenu />} />
          <Route path="/admin" element={<AdminGuard><SuperAdmin /></AdminGuard>} />
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
              <Route path="reports" element={<ReportsShell />}>
                <Route index element={<SalesSummary />} />
                <Route path="by-item" element={<SalesByItem />} />
                <Route path="by-category" element={<SalesByCategory />} />
                <Route path="by-employee" element={<SalesByEmployee />} />
                <Route path="by-payment-type" element={<SalesByPaymentType />} />
                <Route path="discounts" element={<Discounts />} />
                <Route path="taxes" element={<Taxes />} />
              </Route>
              <Route path="expenses" element={<Expenses />} />
              <Route path="profit-loss" element={<ProfitAndLoss />} />
            </Route>
            <Route path="/customers" element={<Customers />} />
            <Route path="/staff" element={<StaffShell />}>
              <Route index element={<Employees />} />
              <Route path="roles" element={<AccessRights />} />
            </Route>
            <Route path="/settings" element={<SettingsShell />}>
              <Route index element={<Features />} />
              <Route path="payment-types" element={<PaymentTypes />} />
              <Route path="loyalty" element={<Loyalty />} />
              <Route path="taxes" element={<TaxesSettings />} />
              <Route path="receipt" element={<Receipt />} />
              <Route path="stores" element={<Stores />} />
            </Route>
          </Route>
        </Routes>
      </HashRouter>
      </BranchProvider>
    </AuthProvider>
    </ErrorBoundary>
  )
}
