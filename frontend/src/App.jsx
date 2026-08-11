import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import Dashboard from '@/pages/Dashboard'
import POS from '@/pages/POS'
import ComingSoon from '@/pages/ComingSoon'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/inventory" element={<ComingSoon title="Inventory" />} />
          <Route path="/bar-flow" element={<ComingSoon title="Bar flow" />} />
          <Route path="/finance" element={<ComingSoon title="Finance" />} />
          <Route path="/customers" element={<ComingSoon title="Customers" />} />
          <Route path="/staff" element={<ComingSoon title="Staff" />} />
          <Route path="/settings" element={<ComingSoon title="Settings" />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
