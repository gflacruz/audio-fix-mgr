import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getSuggestions, updateSuggestion } from '@/lib/api';
import { MessageSquare, CheckCircle, Circle, User } from 'lucide-react';
import { format } from 'date-fns';

const Suggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const data = await getSuggestions();
      setSuggestions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'open' ? 'closed' : 'open';
      await updateSuggestion(id, newStatus);
      setSuggestions(suggestions.map(s => 
        s.id === id ? { ...s, status: newStatus } : s
      ));
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Suggestions</h1>
            <p className="text-zinc-400">Review feedback and ideas from the team.</p>
          </header>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64 text-zinc-500">
              Loading suggestions...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p>No suggestions yet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {suggestions.map((suggestion) => (
                <div 
                  key={suggestion.id}
                  className={`bg-zinc-900 border rounded-lg p-6 transition-all ${
                    suggestion.status === 'closed' 
                      ? 'border-zinc-800 opacity-75' 
                      : 'border-zinc-700 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${
                          suggestion.status === 'open' 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          {suggestion.status}
                        </span>
                        <span className="text-zinc-500 text-sm flex items-center gap-1">
                          <User size={14} />
                          {suggestion.user_name} ({suggestion.user_role})
                        </span>
                        <span className="text-zinc-600 text-sm">•</span>
                        <span className="text-zinc-500 text-sm">
                          {format(new Date(suggestion.created_at), 'PPP p')}
                        </span>
                      </div>
                      <p className="text-zinc-200 text-lg whitespace-pre-wrap leading-relaxed">
                        {suggestion.content}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => handleToggleStatus(suggestion.id, suggestion.status)}
                      className={`p-2 rounded-lg transition-colors ${
                        suggestion.status === 'open'
                          ? 'text-zinc-400 hover:text-green-400 hover:bg-zinc-800'
                          : 'text-green-500 bg-green-500/10 hover:bg-green-500/20'
                      }`}
                      title={suggestion.status === 'open' ? 'Mark as Closed' : 'Reopen'}
                    >
                      {suggestion.status === 'open' ? <Circle size={24} /> : <CheckCircle size={24} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Suggestions;
