// src/lib/api.js

export const getDB = async () => {
  if (window.electronAPI) {
    return await window.electronAPI.readDB();
  }
  // Fallback for browser dev mode (mock data)
  const stored = localStorage.getItem('audio-fix-db');
  return stored ? JSON.parse(stored) : { clients: [], repairs: [] };
};

export const saveDB = async (data) => {
  if (window.electronAPI) {
    return await window.electronAPI.writeDB(data);
  }
  // Fallback
  localStorage.setItem('audio-fix-db', JSON.stringify(data));
  return true;
};
