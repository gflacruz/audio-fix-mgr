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
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error || `API Error: ${response.statusText}`;
      
      // Dispatch global error event for database/server errors (500s)
      if (response.status >= 500) {
        window.dispatchEvent(new CustomEvent('api-error', { detail: message }));
      }
      
      throw new Error(message);
    }

    return response.json();
  } catch (error) {
    // Catch network errors (fetch failed entirely)
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      const msg = "Network Error: Unable to reach the server. Please ensure the backend server is running.";
      window.dispatchEvent(new CustomEvent('api-error', { detail: msg }));
    }
    throw error;
  }
};

// Clients
export const getClients = async (search = '', page = 1, limit = 100) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  params.append('page', page);
  params.append('limit', limit);
  return fetchJSON(`/clients?${params.toString()}`);
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

export const deleteClient = async (id) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/clients/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

// Repairs
export const getRepairs = async (options = {}) => {
  const params = new URLSearchParams();
  if (options.clientId) params.append('clientId', options.clientId);
  if (options.search) params.append('search', options.search);
  if (options.includeClosed !== undefined) params.append('includeClosed', options.includeClosed);
  
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

export const deleteRepair = async (id) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/repairs/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const getRepairNotes = async (id) => {
  return fetchJSON(`/repairs/${id}/notes`);
};

export const addRepairNote = async (id, noteData) => {
  return fetchJSON(`/repairs/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify(noteData),
  });
};

export const updateRepairNote = async (repairId, noteId, text) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/repairs/${repairId}/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify({ text }),
    headers: { Authorization: `Bearer ${user?.token}` },
  });
};

export const deleteRepairNote = async (repairId, noteId) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/repairs/${repairId}/notes/${noteId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${user?.token}` },
  });
};

// Model Notes
export const getModelNote = async (brand, model) => {
  const params = new URLSearchParams({ brand, model });
  return fetchJSON(`/repairs/model-notes?${params.toString()}`);
};

export const saveModelNote = async (brand, model, note, updatedBy) => {
  return fetchJSON('/repairs/model-notes', {
    method: 'PUT',
    body: JSON.stringify({ brand, model, note, updatedBy }),
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

export const processPayout = async (items, technician) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON('/repairs/payout', {
    method: 'POST',
    body: JSON.stringify({ items, technician }),
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const updatePayrollBatch = async (batchId, items, paidOutDate) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/repairs/payroll-history/batch/${batchId}`, {
    method: 'PATCH',
    body: JSON.stringify({ items, paidOutDate }),
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const getUnpaidRepairsForTech = async (techName, search = '') => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  return fetchJSON(`/repairs/payroll/technician/${encodeURIComponent(techName)}?${params.toString()}`, {
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
export const getParts = async (search = '', page = 1, limit = 50) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  params.append('page', page);
  params.append('limit', limit);
  
  return fetchJSON(`/parts?${params.toString()}`, {
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const getPart = async (id) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/parts/${id}`, {
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const createPart = async (partData) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  const isFormData = partData instanceof FormData;
  
  const headers = { Authorization: `Bearer ${user?.token}` };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}/parts`, {
    method: 'POST',
    headers,
    body: isFormData ? partData : JSON.stringify(partData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${response.statusText}`);
  }
  return response.json();
};

export const updatePart = async (id, partData) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  const isFormData = partData instanceof FormData;
  
  const headers = { Authorization: `Bearer ${user?.token}` };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}/parts/${id}`, {
    method: 'PATCH',
    headers,
    body: isFormData ? partData : JSON.stringify(partData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${response.statusText}`);
  }
  return response.json();
};

export const deletePart = async (id) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/parts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const addRepairPart = async (repairId, partId, quantity = 1, price = undefined) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/repairs/${repairId}/parts`, {
    method: 'POST',
    body: JSON.stringify({ partId, quantity, price }),
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

export const addCustomRepairPart = async (repairId, { name, price, quantity = 1 }) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/repairs/${repairId}/parts`, {
    method: 'POST',
    body: JSON.stringify({ name, price, quantity }),
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const uploadRepairPhoto = async (repairId, file) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  const formData = new FormData();
  formData.append('photo', file);

  const response = await fetch(`${API_BASE}/repairs/${repairId}/photos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${user?.token}`
      // Content-Type is set automatically by browser with boundary for FormData
    },
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${response.statusText}`);
  }

  return response.json();
};

export const deleteRepairPhoto = async (repairId, photoId) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/repairs/${repairId}/photos/${photoId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const sendEstimateEmail = async (repairId, estimateId) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/repairs/${repairId}/email-estimate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user?.token}`, 'Content-Type': 'application/json' },
    body: estimateId ? JSON.stringify({ estimateId }) : undefined
  });
};

export const sendPickupEmail = async (repairId) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/repairs/${repairId}/email-pickup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const sendEstimateText = async (repairId, estimateId) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/repairs/${repairId}/text-estimate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user?.token}`, 'Content-Type': 'application/json' },
    body: estimateId ? JSON.stringify({ estimateId }) : undefined
  });
};

export const sendPickupText = async (repairId) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/repairs/${repairId}/text-pickup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const sendOptInText = async (clientId) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/clients/${clientId}/send-opt-in`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

// Reports
export const getReports = async (year) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  const params = year ? `?year=${year}` : '';
  return fetchJSON(`/repairs/reports${params}`, {
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

// Suggestions
export const createSuggestion = async (content) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON('/suggestions', {
    method: 'POST',
    body: JSON.stringify({ content }),
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const getSuggestions = async () => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON('/suggestions', {
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const updateSuggestion = async (id, status) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/suggestions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

// Estimates
export const getEstimates = async (repairId) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/estimates/repair/${repairId}`, {
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const getEstimate = async (id) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/estimates/${id}`, {
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const createEstimate = async (estimateData) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON('/estimates', {
    method: 'POST',
    body: JSON.stringify(estimateData),
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const updateEstimate = async (id, updates) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/estimates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    headers: { Authorization: `Bearer ${user?.token}` }
  });
};

export const deleteEstimate = async (id) => {
  const user = JSON.parse(localStorage.getItem('audio_fix_user'));
  return fetchJSON(`/estimates/${id}`, {
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
