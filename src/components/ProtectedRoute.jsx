// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Sidebar from './Sidebar';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-8 text-zinc-500">Loading auth...</div>;
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ProtectedRoute;
