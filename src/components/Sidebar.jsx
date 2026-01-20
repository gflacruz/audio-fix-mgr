import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PenTool, Wrench, Users, Search, UserCog } from 'lucide-react';

const Sidebar = () => {
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

      <nav className="space-y-2">
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
      </nav>

      <div className="mt-auto px-4 py-4 text-xs text-zinc-600 text-center">
        v1.0.0 &copy; 2026
      </div>
    </div>
  );
};

export default Sidebar;
