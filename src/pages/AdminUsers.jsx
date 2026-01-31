// src/pages/AdminUsers.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Trash2, UserPlus, Shield, UserCog } from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: 'technician' });
  const { user: currentUser } = useAuth();
  const token = currentUser?.token;

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) loadUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(newUser)
      });
      
      if (res.ok) {
        setNewUser({ username: '', password: '', name: '', role: 'technician' });
        loadUsers();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
        <Shield className="text-amber-500" /> Admin User Management
      </h2>

      {/* Add User Form */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl mb-8">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <UserPlus size={20} /> Add New User
        </h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Username</label>
            <input 
              required
              value={newUser.username}
              onChange={e => setNewUser({...newUser, username: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Display Name</label>
            <input 
              required
              value={newUser.name}
              onChange={e => setNewUser({...newUser, name: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Password</label>
            <input 
              required
              type="password"
              value={newUser.password}
              onChange={e => setNewUser({...newUser, password: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Role</label>
            <select 
              value={newUser.role}
              onChange={e => setNewUser({...newUser, role: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm"
            >
              <option value="technician">Technician</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded text-sm font-medium h-[38px]">
            Add User
          </button>
        </form>
      </div>

      {/* User List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-800/50 text-zinc-400">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Username</th>
              <th className="p-4">Role</th>
              <th className="p-4">Created</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-zinc-800/30">
                <td className="p-4 font-medium text-white">{u.name}</td>
                <td className="p-4 text-zinc-400">{u.username}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-xs uppercase font-bold ${
                    u.role === 'admin' ? 'bg-amber-900/30 text-amber-500' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-zinc-500">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  {u.id !== parseInt(currentUser.id) && (
                    <button 
                      onClick={() => handleDelete(u.id)}
                      className="text-zinc-500 hover:text-red-500 transition-colors"
                      title="Delete User"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
