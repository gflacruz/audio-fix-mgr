import React, { useEffect, useState, useRef } from 'react';
import { getRepairs, updateRepair } from '@/lib/api';
import { Clock, AlertTriangle, CheckCircle, Search, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';

const StatusBadge = ({ status }) => {
  const colors = {
    queued: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
    diagnosing: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-900',
    estimate: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-900',
    parts: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-400 dark:border-yellow-900',
    shipping: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-400 dark:border-cyan-900',
    repairing: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-400 dark:border-purple-900',
    testing: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/50 dark:text-pink-400 dark:border-pink-900',
    ready: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-400 dark:border-green-900',
    closed: 'bg-zinc-200 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-600',
  };
  
  return (
    <span className={`px-2 py-1 rounded text-xs uppercase font-bold tracking-wider border ${colors[status] || colors.queued}`}>
      {status === 'estimate' ? 'Awaiting Est.' : status}
    </span>
  );
};

const Workbench = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const searchInputRef = useRef(null);

  const loadData = async () => {
    try {
      const data = await getRepairs();
      setTickets(data);
    } catch (error) {
      console.error("Error loading repairs:", error);
    } finally {
      setLoading(false);
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
    (statusFilter === 'all' ? t.status !== 'closed' : t.status === statusFilter) &&
    ((t.clientName || '').toLowerCase().includes(filter.toLowerCase()) ||
    (t.brand || '').toLowerCase().includes(filter.toLowerCase()) ||
    (t.model || '').toLowerCase().includes(filter.toLowerCase()))
  ).sort((a, b) => {
    const dateA = new Date(a.dateIn || 0);
    const dateB = new Date(b.dateIn || 0);
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Repair Workbench</h2>
        <div className="flex items-center gap-3">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-lg text-sm text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none shadow-sm dark:shadow-none cursor-pointer"
          >
            <option value="all">All Active</option>
            <option value="queued">Queued</option>
            <option value="diagnosing">Diagnosing</option>
            <option value="estimate">Awaiting Est.</option>
            <option value="parts">Waiting for Parts</option>
            <option value="shipping">Shipping</option>
            <option value="repairing">Repairing</option>
            <option value="testing">Testing</option>
            <option value="ready">Ready for Pickup</option>
          </select>

          <select 
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-lg text-sm text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none shadow-sm dark:shadow-none cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search tickets..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pl-10 pr-4 py-2 rounded-lg text-sm text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none w-64 shadow-sm dark:shadow-none"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-[60vh]">
          <Loader className="animate-spin text-zinc-500 dark:text-zinc-400" size={64} />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map(ticket => (
            <div key={ticket.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:border-amber-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors shadow-sm dark:shadow-none">
              <div className="flex justify-between items-start mb-4">
                <Link to={`/repair/${ticket.id}`} className="block flex-1 cursor-pointer">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-lg text-zinc-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-500 transition-colors">
                        <span className="text-zinc-500 mr-2">#{ticket.claimNumber || ticket.id}</span>
                        {ticket.brand} {ticket.model} 
                        {ticket.unitType && <span className="text-zinc-400 dark:text-zinc-500 font-normal text-sm ml-2">({ticket.unitType})</span>}
                      </span>
                      <StatusBadge status={ticket.status} />
                      {ticket.priority === 'rush' && (
                        <span className="flex items-center gap-1 text-red-500 text-xs font-bold uppercase">
                          <AlertTriangle size={12} /> Rush
                        </span>
                      )}
                    </div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-sm">
                      Client: <span className="text-zinc-700 dark:text-zinc-200">{ticket.clientName}</span> • In: {new Date(ticket.dateIn).toLocaleDateString()}
                      <span className="ml-3 text-zinc-400 dark:text-zinc-500">• Tech: <span className="text-zinc-600 dark:text-zinc-300 font-medium">{ticket.technician || 'Unassigned'}</span></span>
                    </div>
                  </div>
                </Link>
                
                <div className="flex items-center gap-2 pl-4">
                  <select 
                    value={ticket.status} 
                    onChange={(e) => updateStatus(ticket.id, e.target.value)}
                    className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm rounded px-2 py-1 focus:outline-none focus:border-amber-500 shadow-sm dark:shadow-none"
                  >
                    <option value="queued">Queued</option>
                    <option value="diagnosing">Diagnosing</option>
                    <option value="estimate">Awaiting Estimate</option>
                    <option value="parts">Waiting for Parts</option>
                    <option value="shipping">Shipping</option>
                    <option value="repairing">Repairing</option>
                    <option value="testing">Testing</option>
                    <option value="ready">Ready for Pickup</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <Link to={`/repair/${ticket.id}`} className="block">
                <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded p-3 text-sm text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
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
      )}
    </div>
  );
};

export default Workbench;
