import React, { useEffect, useState, useRef } from 'react';
import { getClients } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const searchInputRef = useRef(null);
  const LIMIT = 20;

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    getClients(search, page, LIMIT).then(data => setClients(data)).catch(console.error);
  }, [search, page]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const formatPhoneNumber = (str) => {
    const cleaned = ('' + str).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    return match ? '(' + match[1] + ') ' + match[2] + '-' + match[3] : str;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Client Database</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={handleSearch}
            className="bg-zinc-900 border border-zinc-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-amber-500 w-64"
          />
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-4">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-800/50 text-zinc-400">
            <tr>
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Phone</th>
              <th className="p-4 font-medium">Address</th>
              <th className="p-4 font-medium">Joined</th>
              <th className="p-4 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {clients.map((client, i) => (
              <tr key={i} className="hover:bg-zinc-800/30 group">
                <td className="p-4 font-medium text-white">
                  <Link to={`/client/${client.id}`} className="hover:text-amber-500 transition-colors">
                    {client.name}
                  </Link>
                </td>
                <td className="p-4 text-zinc-400">{client.email}</td>
                <td className="p-4 text-zinc-400">{formatPhoneNumber(client.phone)}</td>
                <td className="p-4 text-zinc-400 max-w-xs truncate">
                  {[client.address, client.city, client.state].filter(Boolean).join(', ') || '-'}
                </td>
                <td className="p-4 text-zinc-500">{new Date(client.dateAdded).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  <Link 
                    to={`/client/${client.id}`}
                    className="text-zinc-500 hover:text-white px-3 py-1 bg-zinc-800 rounded text-xs transition-colors opacity-0 group-hover:opacity-100"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-zinc-500">No clients found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center items-center gap-4">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <span className="text-zinc-500">Page {page}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={clients.length < LIMIT}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Clients;
