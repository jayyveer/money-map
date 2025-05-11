import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthForm } from './components/auth/AuthForm'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { EPFSection } from './components/dashboard/EPFSection'
import { InvestmentSection } from './components/dashboard/InvestmentSection'
import { ExpensesSection } from './components/dashboard/ExpensesSection'
import { BankSection } from './components/dashboard/BankSection'
import { ReportsSection } from './components/dashboard/ReportsSection'
import { DashboardOverview } from './components/dashboard/DashboardOverview'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AuthForm />} />

        {/* Use a persistent layout that won't remount */}
        <Route path="/" element={<DashboardLayout />}>
          {/* Index route for dashboard home */}
          <Route index element={<DashboardOverview />} />

          {/* Nested routes that only replace the content area */}
          <Route path="dashboard">
            <Route index element={<DashboardOverview />} />
            <Route path="epf" element={<EPFSection />} />
            <Route path="investments" element={<InvestmentSection />} />
            <Route path="expenses" element={<ExpensesSection />} />
            <Route path="banks" element={<BankSection />} />
            <Route path="reports" element={<ReportsSection />} />
          </Route>

          {/* Redirect root to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App