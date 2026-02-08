import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Wrench, Settings, Loader2, ChevronDown } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const navigate = useNavigate();
  const { login, user } = useAuth();

  // Redirect if already logged in (or after successful login reload)
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Load saved server URL or default
    const saved = localStorage.getItem('server_url');
    if (saved) {
      setServerUrl(saved);
    } else {
      setServerUrl(`http://192.168.1.25:3001`);
    }
  }, []);

  // Fetch users when serverUrl is ready
  useEffect(() => {
    if (!serverUrl) return;

    const fetchUsers = async () => {
      let loginUrl = serverUrl.replace(/\/$/, '');
      if (!loginUrl.startsWith('http')) loginUrl = `http://${loginUrl}`;
      if (!loginUrl.includes(':') && !loginUrl.includes('https')) loginUrl = `${loginUrl}:3001`; 
      
      try {
        const response = await fetch(`${loginUrl}/api/users/public-list`);
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
          if (data.length > 0) {
            // Default to first user
            const firstUser = data[0];
            setSelectedUser(firstUser);
            setUsername(firstUser.username);
          }
        }
      } catch (err) {
        console.error("Failed to fetch user list", err);
        // Fail silently, dropdown will be empty
      }
    };

    fetchUsers();
  }, [serverUrl]);

  const handleServerUrlChange = (e) => {
    setServerUrl(e.target.value);
    localStorage.setItem('server_url', e.target.value);
  };

  const handleUserChange = (e) => {
    const selectedUsername = e.target.value;
    const userObj = users.find(u => u.username === selectedUsername);
    if (userObj) {
      setSelectedUser(userObj);
      setUsername(userObj.username);
      // Clear password when switching users
      setPassword('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    let loginUrl = serverUrl.replace(/\/$/, '');
    if (!loginUrl.startsWith('http')) loginUrl = `http://${loginUrl}`;
    if (!loginUrl.includes(':') && !loginUrl.includes('https')) loginUrl = `${loginUrl}:3001`; 
    
    const apiBase = `${loginUrl}/api`;

    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('server_url', loginUrl);
        login(data);
        
        // Reload to ensure api.js picks up the new URL. 
        // The useEffect above will handle the redirect to '/' after reload.
        window.location.reload(); 
      } else {
        setError(data.error || 'Login failed');
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError(`Connection failed to ${apiBase}. Check Server Address.`);
      setIsLoading(false);
    }
  };

  const isPasswordRequired = selectedUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl max-w-md w-full shadow-2xl relative">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-4 right-4 text-zinc-600 hover:text-amber-500 transition-colors"
          title="Server Settings"
          type="button"
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
            <label className="block text-sm font-medium text-zinc-400 mb-1">Select User</label>
            {users.length > 0 ? (
              <div className="relative">
                <select
                  value={username}
                  onChange={handleUserChange}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-3 pr-10 text-white focus:border-amber-500 focus:outline-none transition-colors appearance-none cursor-pointer"
                  disabled={isLoading}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.username}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 pointer-events-none w-5 h-5" />
              </div>
            ) : (
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-3 text-white focus:border-amber-500 focus:outline-none transition-colors"
                placeholder="Enter username"
                required
                disabled={isLoading}
              />
            )}
          </div>
          
          {isPasswordRequired && (
            <div className="animate-in fade-in slide-in-from-top-1">
              <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-3 text-white focus:border-amber-500 focus:outline-none transition-colors"
                placeholder="Enter password"
                required
                disabled={isLoading}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg transition-all transform active:scale-95 shadow-lg shadow-amber-900/20 mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
