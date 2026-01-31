import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PenTool, Wrench, Users, Search, UserCog, LogOut, Shield, Package, DollarSign } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Sidebar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navClass = ({ isActive }) => 
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive 
        ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' 
        : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
    }`;

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 h-screen flex flex-col p-4 pt-8">
      <div className="mb-10 px-2 flex items-center gap-2">
        <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
          <Wrench className="text-zinc-900 w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">AudioFix<span className="text-amber-500">Mgr</span></h1>
      </div>

      <nav className="space-y-2 flex-1">
        <NavLink to="/" className={navClass}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/search" className={navClass}>
          <Search size={20} />
          <span>Search</span>
        </NavLink>
        <NavLink to="/technicians" className={navClass}>
          <UserCog size={20} />
          <span>Technicians</span>
        </NavLink>
        <NavLink to="/intake" className={navClass}>
          <PenTool size={20} />
          <span>Intake</span>
        </NavLink>
        <NavLink to="/workbench" className={navClass}>
          <Wrench size={20} />
          <span>Workbench</span>
        </NavLink>
        <NavLink to="/clients" className={navClass}>
          <Users size={20} />
          <span>Clients</span>
        </NavLink>

        <NavLink to="/inventory" className={navClass}>
          <Package size={20} />
          <span>Inventory</span>
        </NavLink>
        
        {isAdmin && (
          <>
            <NavLink to="/payroll" className={navClass}>
              <DollarSign size={20} />
              <span>Payroll</span>
            </NavLink>
            <NavLink to="/admin" className={navClass}>
              <Shield size={20} />
              <span>Admin</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="mt-auto pt-4 border-t border-zinc-800">
        <div className="px-4 mb-4">
          <div className="text-sm font-medium text-white">{user?.name}</div>
          <div className="text-xs text-zinc-500 capitalize">{user?.role}</div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors text-sm"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
