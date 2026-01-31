import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Intake from './pages/Intake';
import Workbench from './pages/Workbench';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import RepairDetail from './pages/RepairDetail';
import SearchPage from './pages/SearchPage';
import Technicians from './pages/Technicians';
import AdminUsers from './pages/AdminUsers';
import Inventory from './pages/Inventory';
import Payroll from './pages/Payroll';
import PayrollHistory from './pages/PayrollHistory';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/technicians" element={<Technicians />} />
            <Route path="/intake" element={<Intake />} />
            <Route path="/workbench" element={<Workbench />} />
            <Route path="/repair/:id" element={<RepairDetail />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/client/:id" element={<ClientDetail />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/payroll/history" element={<PayrollHistory />} />
            <Route path="/admin" element={<AdminUsers />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
