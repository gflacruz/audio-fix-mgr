import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Intake from './pages/Intake';
import Workbench from './pages/Workbench';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import RepairDetail from './pages/RepairDetail';
import SearchPage from './pages/SearchPage';
import Technicians from './pages/Technicians';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-8 max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/technicians" element={<Technicians />} />
              <Route path="/intake" element={<Intake />} />
              <Route path="/workbench" element={<Workbench />} />
              <Route path="/repair/:id" element={<RepairDetail />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/client/:id" element={<ClientDetail />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
