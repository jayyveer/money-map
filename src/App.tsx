import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthForm } from './components/auth/AuthForm'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { EPFSection } from './components/dashboard/EPFSection'
import { InvestmentSection } from './components/dashboard/InvestmentSection'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AuthForm />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<div>Dashboard Overview</div>} />
          <Route path="epf" element={<EPFSection />} />
          <Route path="investments" element={<InvestmentSection />} />
          <Route path="expenses" element={<div>Expenses Section</div>} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}

export default App