// src/lib/api.js
// Dynamically determine the API URL
// Priority:
// 1. Manually configured 'server_url' in localStorage (for Electron/Remote clients)
// 2. Hostname relative (for web clients on the same network)
const getServerUrl = () => {
  const stored = localStorage.getItem('server_url');
  if (stored) {
    // Ensure it doesn't end with slash
    const clean = stored.replace(/\/$/, '');
    // If user just typed "192.168.1.5", add protocol and port
    if (!clean.startsWith('http')) {
      return `http://${clean}:3001/api`;
    }
    // If it's a full URL, ensure /api is appended if not present
    if (!clean.endsWith('/api')) {
      return `${clean}/api`;
    }
    return clean;
  }
  // Fallback: Assume API is on the same host, port 3001
  return `http://${window.location.hostname}:3001/api`;
};

const API_BASE = getServerUrl();

const fetchJSON = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${response.statusText}`);
  }

  return response.json();
};

// Clients
export const getClients = async (search = '') => {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return fetchJSON(`/clients${query}`);
};

export const getClient = async (id) => {
  return fetchJSON(`/clients/${id}`);
};

export const createClient = async (clientData) => {
  return fetchJSON('/clients', {
    method: 'POST',
    body: JSON.stringify(clientData),
  });
};

export const updateClient = async (id, updates) => {
  return fetchJSON(`/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
};

// Repairs
export const getRepairs = async (options = {}) => {
  const params = new URLSearchParams();
  if (options.clientId) params.append('clientId', options.clientId);
  if (options.search) params.append('search', options.search);
  
  const queryString = params.toString();
  return fetchJSON(`/repairs${queryString ? '?' + queryString : ''}`);
};

export const getRepair = async (id) => {
  return fetchJSON(`/repairs/${id}`);
};

export const createRepair = async (repairData) => {
  return fetchJSON('/repairs', {
    method: 'POST',
    body: JSON.stringify(repairData),
  });
};

export const updateRepair = async (id, updates) => {
  return fetchJSON(`/repairs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
};

export const addRepairNote = async (id, noteData) => {
  return fetchJSON(`/repairs/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify(noteData),
  });
};

export const getPayroll = async () => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON('/repairs/payroll', {
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const getPayrollHistory = async (filters = {}) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  const params = new URLSearchParams();
  if (filters.technician) params.append('technician', filters.technician);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  return fetchJSON(`/repairs/payroll-history?${params.toString()}`, {
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const processPayout = async (repairIds) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON('/repairs/payout', {
    method: 'POST',
    body: JSON.stringify({ repairIds }),
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

// Users
export const getTechnicians = async () => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON('/users?role=technician', {
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

// Parts / Inventory
export const getParts = async (search = '') => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return fetchJSON(`/parts${query}`, {
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const createPart = async (partData) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON('/parts', {
    method: 'POST',
    body: JSON.stringify(partData),
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const updatePart = async (id, partData) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/parts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(partData),
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const deletePart = async (id) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/parts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const addRepairPart = async (repairId, partId, quantity = 1) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/repairs/${repairId}/parts`, {
    method: 'POST',
    body: JSON.stringify({ partId, quantity }),
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const removeRepairPart = async (repairId, linkId) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/repairs/${repairId}/parts/${linkId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

// Legacy Fallback (To fail loud if used)
export const getDB = async () => {
  console.error("Deprecated: getDB() called. Please use granular API functions.");
  throw new Error("getDB is deprecated in favor of Backend API.");
};

export const saveDB = async () => {
  console.error("Deprecated: saveDB() called. Please use granular API functions.");
  throw new Error("saveDB is deprecated in favor of Backend API.");
};
