// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Wrench, Settings } from 'lucide-react';
import { getDB } from '@/lib/api'; // Just to verify connection if needed

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    // Load saved server URL or default
    const saved = localStorage.getItem('server_url');
    if (saved) {
      setServerUrl(saved);
    } else {
      setServerUrl(`http://${window.location.hostname}:3001`);
    }
  }, []);

  const handleServerUrlChange = (e) => {
    setServerUrl(e.target.value);
    // Real-time save, or save on submit? Real-time is easier for now,
    // but implies a page reload might be needed to apply it to api.js constant.
    // Actually, api.js reads it on module load.
    // We should probably reload the page if this changes and they hit "Save" or "Login".
    localStorage.setItem('server_url', e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Ensure api.js picks up the new URL (it might need a reload if we just set it)
    // But since api.js is already loaded, we might need to force a reload if they changed it.
    // For now, let's assume they set it up before hitting login.
    // To be safe, we can update the localStorage (done above) and rely on the fact 
    // that api.js might need a reload. 
    // Actually, let's just use the URL directly here for the login call to verify it works.

    let loginUrl = serverUrl.replace(/\/$/, '');
    if (!loginUrl.startsWith('http')) loginUrl = `http://${loginUrl}`;
    // If they omitted port and it's not standard, this might fail, but let's trust user or default
    if (!loginUrl.includes(':') && !loginUrl.includes('https')) loginUrl = `${loginUrl}:3001`; 
    
    // Construct the full API base for login
    const apiBase = `${loginUrl}/api`;

    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        // If login succeeded, the URL is good. Ensure localStorage is exact.
        // We set 'server_url' to the base URL (e.g. http://192.168.1.15:3001)
        localStorage.setItem('server_url', loginUrl);
        
        // Force reload if the API module has an old cached URL? 
        // If api.js evaluates `localStorage` at top level, it won't change until reload.
        // We should probably force a reload if the previous value was different, 
        // OR just rely on the user refreshing if things break. 
        // Better: Reload page if we just changed the server setting, but we are logged in now.
        // If we just navigate, api.js still has old value in memory.
        // Let's do a hard window.location.href assignment if we want to be safe, 
        // OR just update the login and let them reload if needed.
        // Actually, if we successfully logged in, we have the token.
        // But future calls (getRepairs) use API_BASE from api.js.
        
        // Let's assume the user might need to refresh if they changed the IP.
        // We will do a full page reload to root upon success to ensure api.js re-initializes.
        
        login(data);
        // navigate('/') is soft. window.location.href is hard.
        // If we changed the URL, we MUST reload.
        window.location.href = '/'; 
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      setError(`Connection failed to ${apiBase}. Check Server Address.`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl max-w-md w-full shadow-2xl relative">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-4 right-4 text-zinc-600 hover:text-amber-500 transition-colors"
          title="Server Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
            <Wrench className="text-zinc-900 w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AudioFix<span className="text-amber-500">Mgr</span></h1>
          <p className="text-zinc-500 mt-2">Sign in to access the workbench</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-900/50 text-red-400 p-3 rounded mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {showSettings && (
             <div className="bg-zinc-950/50 p-3 rounded border border-zinc-800 mb-4 animate-in fade-in slide-in-from-top-2">
               <label className="block text-xs font-medium text-amber-500 mb-1">Server Address</label>
               <input
                 type="text"
                 value={serverUrl}
                 onChange={handleServerUrlChange}
                 className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                 placeholder="http://192.168.1.x:3001"
               />
               <p className="text-xs text-zinc-600 mt-1">
                 Enter the IP of the main computer.
               </p>
             </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-3 text-white focus:border-amber-500 focus:outline-none transition-colors"
              placeholder="Enter username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-3 text-white focus:border-amber-500 focus:outline-none transition-colors"
              placeholder="Enter password"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg transition-all transform active:scale-95 shadow-lg shadow-amber-900/20 mt-4"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
