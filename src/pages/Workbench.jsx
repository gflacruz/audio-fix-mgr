import React, { useEffect, useState, useRef } from 'react';
import { getRepairs, updateRepair } from '@/lib/api';
import { Clock, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const StatusBadge = ({ status }) => {
  const colors = {
    queued: 'bg-zinc-800 text-zinc-300',
    diagnosing: 'bg-blue-900/50 text-blue-400 border-blue-900',
    estimate: 'bg-orange-900/50 text-orange-400 border-orange-900',
    parts: 'bg-yellow-900/50 text-yellow-400 border-yellow-900',
    repairing: 'bg-purple-900/50 text-purple-400 border-purple-900',
    testing: 'bg-pink-900/50 text-pink-400 border-pink-900',
    ready: 'bg-green-900/50 text-green-400 border-green-900',
    closed: 'bg-zinc-900 text-zinc-600',
  };
  
  return (
    <span className={`px-2 py-1 rounded text-xs uppercase font-bold tracking-wider border ${colors[status] || colors.queued}`}>
      {status === 'estimate' ? 'Awaiting Est.' : status}
    </span>
  );
};

const Workbench = () => {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('');
  const searchInputRef = useRef(null);

  const loadData = async () => {
    try {
      const data = await getRepairs();
      setTickets(data);
    } catch (error) {
      console.error("Error loading repairs:", error);
    }
  };

  useEffect(() => {
    loadData();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await updateRepair(id, { status: newStatus });
      // Update local state to reflect change immediately or reload
      // Reloading ensures we are in sync
      loadData();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.status !== 'closed' &&
    ((t.clientName || '').toLowerCase().includes(filter.toLowerCase()) ||
    (t.brand || '').toLowerCase().includes(filter.toLowerCase()) ||
    (t.model || '').toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Repair Workbench</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Search tickets..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 pl-10 pr-4 py-2 rounded-lg text-sm text-white focus:border-amber-500 focus:outline-none w-64"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredTickets.map(ticket => (
          <div key={ticket.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <Link to={`/repair/${ticket.id}`} className="block flex-1 cursor-pointer">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-lg text-white hover:text-amber-500 transition-colors">
                      <span className="text-zinc-500 mr-2">#{ticket.claimNumber || ticket.id}</span>
                      {ticket.brand} {ticket.model} 
                      {ticket.unitType && <span className="text-zinc-500 font-normal text-sm ml-2">({ticket.unitType})</span>}
                    </span>
                    <StatusBadge status={ticket.status} />
                    {ticket.priority === 'rush' && (
                      <span className="flex items-center gap-1 text-red-500 text-xs font-bold uppercase">
                        <AlertTriangle size={12} /> Rush
                      </span>
                    )}
                  </div>
                  <div className="text-zinc-400 text-sm">
                    Client: <span className="text-zinc-200">{ticket.clientName}</span> • In: {new Date(ticket.dateIn).toLocaleDateString()}
                    <span className="ml-3 text-zinc-500">• Tech: <span className="text-zinc-300 font-medium">{ticket.technician || 'Unassigned'}</span></span>
                  </div>
                </div>
              </Link>
              
              <div className="flex items-center gap-2 pl-4">
                <select 
                  value={ticket.status} 
                  onChange={(e) => updateStatus(ticket.id, e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded px-2 py-1 focus:outline-none focus:border-amber-500"
                >
                  <option value="queued">Queued</option>
                  <option value="diagnosing">Diagnosing</option>
                  <option value="estimate">Awaiting Estimate</option>
                  <option value="parts">Waiting for Parts</option>
                  <option value="repairing">Repairing</option>
                  <option value="testing">Testing</option>
                  <option value="ready">Ready for Pickup</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <Link to={`/repair/${ticket.id}`} className="block">
              <div className="bg-zinc-950/50 rounded p-3 text-sm text-zinc-400 border border-zinc-800/50 hover:bg-zinc-950 hover:border-zinc-700 transition-colors">
                <span className="font-semibold text-zinc-500 block mb-1 text-xs uppercase tracking-wide">Reported Issue</span>
                {ticket.issue}
              </div>
            </Link>
          </div>
        ))}

        {filteredTickets.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No tickets found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};

export default Workbench;
