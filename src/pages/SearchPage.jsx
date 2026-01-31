import React, { useState, useEffect } from 'react';
import { getClients, getRepairs } from '@/lib/api';
import { Search, User, Wrench, ArrowRight, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // newest, oldest, alpha
  const [includeClosed, setIncludeClosed] = useState(false);
  const [results, setResults] = useState({ clients: [], repairs: [] });
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults({ clients: [], repairs: [] });
        setHasSearched(false);
        return;
      }

      try {
        const [foundClients, foundRepairs] = await Promise.all([
          getClients(query),
          getRepairs({ search: query, includeClosed })
        ]);

        // Apply Sorting (Client-side for now as API sorting is fixed)
        if (sortOrder === 'newest') {
          foundClients.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
          foundRepairs.sort((a, b) => new Date(b.dateIn) - new Date(a.dateIn));
        } else if (sortOrder === 'oldest') {
          foundClients.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
          foundRepairs.sort((a, b) => new Date(a.dateIn) - new Date(b.dateIn));
        } else if (sortOrder === 'alpha') {
          foundClients.sort((a, b) => a.name.localeCompare(b.name));
          foundRepairs.sort((a, b) => a.brand.localeCompare(b.brand));
        }

        setResults({ clients: foundClients, repairs: foundRepairs });
        setHasSearched(true);
      } catch (error) {
        console.error("Search error:", error);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query, sortOrder, includeClosed]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Global Search</h2>
        
        <div className="flex items-center gap-6">
          {/* Include Closed Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <div className={`relative w-10 h-6 rounded-full p-1 transition-colors duration-200 ${includeClosed ? 'bg-amber-600' : 'bg-zinc-700 group-hover:bg-zinc-600'}`}>
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${includeClosed ? 'translate-x-4' : ''}`} />
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={includeClosed}
              onChange={(e) => setIncludeClosed(e.target.checked)}
            />
            <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">Include Closed</span>
          </label>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
            <ArrowUpDown size={16} className="text-zinc-500" />
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-transparent text-sm text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="alpha">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="relative mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={24} />
        <input 
          type="text"
          autoFocus
          placeholder="Search by name, phone, serial, brand, model, or claim #..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-14 pr-6 py-4 text-xl text-white focus:border-amber-500 focus:outline-none shadow-xl"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Clients Results */}
        <div>
          <h3 className="text-zinc-400 font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <User size={16} /> Clients Found ({results.clients.length})
          </h3>
          <div className="space-y-3">
            {results.clients.map(client => (
              <Link 
                to={`/client/${client.id}`} 
                key={client.id}
                className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-amber-500/50 hover:bg-zinc-800/50 transition-all group"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-white group-hover:text-amber-500 transition-colors">{client.name}</div>
                    <div className="text-sm text-zinc-500">{client.phone}</div>
                    {client.email && <div className="text-xs text-zinc-600">{client.email}</div>}
                  </div>
                  <ArrowRight size={16} className="text-zinc-600 group-hover:text-amber-500 transition-colors" />
                </div>
              </Link>
            ))}
            {hasSearched && results.clients.length === 0 && (
              <div className="text-zinc-600 text-sm italic p-2">No clients found matching "{query}"</div>
            )}
            {!hasSearched && (
              <div className="text-zinc-700 text-sm italic p-2">Type to search clients...</div>
            )}
          </div>
        </div>

        {/* Repairs Results */}
        <div>
          <h3 className="text-zinc-400 font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Wrench size={16} /> Units Found ({results.repairs.length})
          </h3>
          <div className="space-y-3">
            {results.repairs.map(ticket => (
              <Link 
                to={`/repair/${ticket.id}`} 
                key={ticket.id}
                className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-amber-500/50 hover:bg-zinc-800/50 transition-all group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-white group-hover:text-amber-500 transition-colors">
                      <span className="text-zinc-500 mr-2">#{ticket.claimNumber || ticket.id}</span>
                      {ticket.brand} {ticket.model}
                    </div>
                    <div className="text-sm text-zinc-500">
                      Owner: {ticket.clientName}
                    </div>
                    <div className="mt-2 text-xs text-zinc-400 bg-zinc-950/50 px-2 py-1 rounded inline-block">
                      {ticket.status}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
             {hasSearched && results.repairs.length === 0 && (
              <div className="text-zinc-600 text-sm italic p-2">No units found matching "{query}"</div>
            )}
            {!hasSearched && (
              <div className="text-zinc-700 text-sm italic p-2">Type to search units...</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SearchPage;
