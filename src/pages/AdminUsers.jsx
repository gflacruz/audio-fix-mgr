// src/pages/AdminUsers.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Trash2, UserPlus, Shield, UserCog, Key, CheckCircle } from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: 'technician' });
  const [resetModal, setResetModal] = useState({ show: false, userId: null, username: '' });
  const [deleteModal, setDeleteModal] = useState({ show: false, userId: null, username: '' });
  const [editModal, setEditModal] = useState({ show: false, userId: null, name: '', username: '', role: '' });
  const [newPassword, setNewPassword] = useState('');
  const [successModal, setSuccessModal] = useState({ show: false, message: '' });
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

  const initiateEdit = (u) => {
    setEditModal({ show: true, userId: u.id, name: u.name, username: u.username, role: u.role, originalRole: u.role });
  };

  const confirmEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:3001/api/users/${editModal.userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editModal.name, username: editModal.username, role: editModal.role })
      });
      if (res.ok) {
        const updated = await res.json();
        const roleChanged = editModal.role !== editModal.originalRole;
        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
        setEditModal({ show: false, userId: null, name: '', username: '', role: '', originalRole: '' });
        if (roleChanged) {
          setSuccessModal({ show: true, message: `${updated.name}'s role has been updated to ${roleLabel(updated.role)}.` });
        }
      } else {
        const err = await res.json();
        setSuccessModal({ show: true, message: err.error || 'Failed to update user' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const initiateDelete = (id, username) => {
    setDeleteModal({ show: true, userId: id, username });
  };

  const confirmDelete = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/users/${deleteModal.userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        loadUsers();
        setDeleteModal({ show: false, userId: null, username: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const initiatePasswordReset = (id, username) => {
    setResetModal({ show: true, userId: id, username });
    setNewPassword('');
  };

  const confirmPasswordReset = async (e) => {
    e.preventDefault();
    if (!newPassword) return;

    try {
      const res = await fetch(`http://localhost:3001/api/users/${resetModal.userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });

      if (res.ok) {
        setResetModal({ show: false, userId: null, username: '' });
        setNewPassword('');
        setSuccessModal({ show: true, message: `Password for ${resetModal.username} has been updated.` });
      } else {
        const err = await res.json();
        setSuccessModal({ show: true, message: err.error || 'Failed to update password' });
      }
    } catch (err) {
      console.error(err);
      setSuccessModal({ show: true, message: 'An error occurred' });
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

  const roleBadgeClass = (role) => {
    if (role === 'admin') return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500';
    if (role === 'senior_technician') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400';
  };

  const roleLabel = (role) => role === 'senior_technician' ? 'Senior Tech' : role;

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2">
        <Shield className="text-amber-600 dark:text-amber-500" /> Admin User Management
      </h2>

      {/* Add User Form */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl mb-8 shadow-sm dark:shadow-none">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <UserPlus size={20} /> Add New User
        </h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs text-zinc-600 dark:text-zinc-500 mb-1">Username</label>
            <input
              required
              value={newUser.username}
              onChange={e => setNewUser({...newUser, username: e.target.value})}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2 text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-600 dark:text-zinc-500 mb-1">Display Name</label>
            <input
              required
              value={newUser.name}
              onChange={e => setNewUser({...newUser, name: e.target.value})}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2 text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-600 dark:text-zinc-500 mb-1">Password</label>
            <input
              required
              type="password"
              value={newUser.password}
              onChange={e => setNewUser({...newUser, password: e.target.value})}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2 text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-600 dark:text-zinc-500 mb-1">Role</label>
            <select
              value={newUser.role}
              onChange={e => setNewUser({...newUser, role: e.target.value})}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2 text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="technician">Technician</option>
              <option value="senior_technician">Senior Technician</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded text-sm font-medium h-[38px]">
            Add User
          </button>
        </form>
      </div>

      {/* User List */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Username</th>
              <th className="p-4">Role</th>
              <th className="p-4">Created</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                <td className="p-4 font-medium text-zinc-900 dark:text-white">{u.name}</td>
                <td className="p-4 text-zinc-600 dark:text-zinc-400">{u.username}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-xs uppercase font-bold ${roleBadgeClass(u.role)}`}>
                    {roleLabel(u.role)}
                  </span>
                </td>
                <td className="p-4 text-zinc-500">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => initiateEdit(u)}
                    className="text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mr-3"
                    title="Edit User"
                  >
                    <UserCog size={18} />
                  </button>
                  <button
                    onClick={() => initiatePasswordReset(u.id, u.username)}
                    className="text-zinc-400 hover:text-amber-600 dark:hover:text-amber-500 transition-colors mr-3"
                    title="Reset Password"
                  >
                    <Key size={18} />
                  </button>
                  {u.id !== parseInt(currentUser.id) && (
                    <button
                      onClick={() => initiateDelete(u.id, u.username)}
                      className="text-zinc-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
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

      {/* Edit User Modal */}
      {editModal.show && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <UserCog className="text-blue-600 dark:text-blue-400" /> Edit User
            </h3>
            <form onSubmit={confirmEdit} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-500 mb-1">Display Name</label>
                <input
                  required
                  autoFocus
                  value={editModal.name}
                  onChange={e => setEditModal(m => ({ ...m, name: e.target.value }))}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2.5 text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-500 mb-1">Username</label>
                <input
                  required
                  value={editModal.username}
                  onChange={e => setEditModal(m => ({ ...m, username: e.target.value }))}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2.5 text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-500 mb-1">Role</label>
                <select
                  value={editModal.role}
                  onChange={e => setEditModal(m => ({ ...m, role: e.target.value }))}
                  disabled={editModal.userId === parseInt(currentUser.id)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2.5 text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="technician">Technician</option>
                  <option value="senior_technician">Senior Technician</option>
                  <option value="admin">Admin</option>
                </select>
                {editModal.userId === parseInt(currentUser.id) && (
                  <p className="text-xs text-zinc-500 mt-1">You cannot change your own role.</p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModal({ show: false, userId: null, name: '', username: '', role: '' })}
                  className="px-4 py-2 rounded text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded text-sm font-medium"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetModal.show && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Key className="text-amber-600 dark:text-amber-500" /> Reset Password
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Enter a new password for user <span className="text-zinc-900 dark:text-white font-semibold">{resetModal.username}</span>.
            </p>

            <form onSubmit={confirmPasswordReset}>
              <div className="mb-6">
                <label className="block text-xs text-zinc-600 dark:text-zinc-500 mb-1">New Password</label>
                <input
                  required
                  type="password"
                  autoFocus
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-3 text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="Enter new password"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setResetModal({ show: false, userId: null, username: '' })}
                  className="px-4 py-2 rounded text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded text-sm font-medium"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal.show && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 w-full max-w-sm shadow-xl text-center">
            <CheckCircle className="text-green-500 mx-auto mb-3" size={40} />
            <p className="text-zinc-900 dark:text-white font-medium mb-6">{successModal.message}</p>
            <button
              autoFocus
              onClick={() => setSuccessModal({ show: false, message: '' })}
              className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded text-sm font-medium"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Trash2 className="text-red-600 dark:text-red-500" /> Delete User
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Are you sure you want to delete <span className="text-zinc-900 dark:text-white font-semibold">{deleteModal.username}</span>? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ show: false, userId: null, username: '' })}
                className="px-4 py-2 rounded text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm font-medium"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
