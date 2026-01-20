import React, { useEffect, useState } from 'react';
import { getDB } from '@/lib/api';
import { Link } from 'react-router-dom';

const Clients = () => {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    getDB().then(db => setClients(db.clients || []));
  }, []);

  const formatPhoneNumber = (str) => {
    const cleaned = ('' + str).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    return match ? '(' + match[1] + ') ' + match[2] + '-' + match[3] : str;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-white">Client Database</h2>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
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
    </div>
  );
};

export default Clients;
