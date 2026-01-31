import React, { useEffect, useState } from 'react';
import { getRepairs, getTechnicians, updateRepair } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, CheckCircle, UserCog, UserMinus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

const Technicians = () => {
  const { isAdmin } = useAuth();
  const [selectedTech, setSelectedTech] = useState('Unassigned');
  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({});
  const [technicians, setTechnicians] = useState([]);

  useEffect(() => {
    // Load technicians first
    getTechnicians().then(techs => {
      setTechnicians(techs);
      // Don't force select first tech, default is Unassigned
    }).catch(console.error);
  }, []);

  useEffect(() => {
    // Check if we need to load data (Unassigned is always valid)
    if (!selectedTech && selectedTech !== '') return;
    loadData();
  }, [selectedTech]);

  const handleAssign = async (e, repairId) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Stop event bubbling
    const newTech = e.target.value;
    
    // Optimistic update or just reload
    try {
      await updateRepair(repairId, { technician: newTech || 'Unassigned' });
      loadData();
    } catch (err) {
      console.error("Failed to reassign:", err);
      alert("Failed to reassign technician");
    }
  };

  const loadData = async () => {
    try {
      const rawRepairs = await getRepairs();
      // Filter out closed repairs
      const allRepairs = rawRepairs.filter(r => r.status !== 'closed');
      
      // Calculate counts
      const newCounts = { Unassigned: 0 };
      technicians.forEach(t => newCounts[t] = 0);
      
      allRepairs.forEach(r => {
        if (!r.technician || r.technician === 'Unassigned') {
            newCounts['Unassigned'] = (newCounts['Unassigned'] || 0) + 1;
        } else if (technicians.includes(r.technician)) {
          newCounts[r.technician] = (newCounts[r.technician] || 0) + 1;
        }
      });
      setCounts(newCounts);

      // Filter for current view
      let techTickets;
      if (selectedTech === 'Unassigned') {
        techTickets = allRepairs.filter(r => !r.technician || r.technician === 'Unassigned');
      } else {
        techTickets = allRepairs.filter(r => r.technician === selectedTech);
      }
      setTickets(techTickets);
    } catch (error) {
      console.error("Error loading technician data:", error);
    }
  };

  if (technicians.length === 0) return <div className="p-8 text-zinc-500">Loading technicians...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-amber-500/10 rounded-xl">
          <UserCog className="text-amber-500" size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Technician Workload</h2>
          <p className="text-zinc-500 text-sm">Manage assignments and track progress per technician.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 mb-8 gap-8 overflow-x-auto">
        {/* Unassigned Tab */}
        <button
          onClick={() => setSelectedTech('Unassigned')}
          className={`pb-4 px-2 text-sm font-medium transition-all relative whitespace-nowrap ${
            selectedTech === 'Unassigned'
              ? 'text-white' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <span className="flex items-center gap-2">
            Unassigned
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              selectedTech === 'Unassigned'
                ? 'bg-amber-500 text-zinc-900' 
                : 'bg-zinc-800 text-zinc-400'
            }`}>
              {counts['Unassigned'] || 0}
            </span>
          </span>
          {selectedTech === 'Unassigned' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-t-full" />
          )}
        </button>

        {technicians.map(tech => (
          <button
            key={tech}
            onClick={() => setSelectedTech(tech)}
            className={`pb-4 px-2 text-sm font-medium transition-all relative whitespace-nowrap ${
              selectedTech === tech 
                ? 'text-white' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tech}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              selectedTech === tech 
                ? 'bg-amber-500 text-zinc-900' 
                : 'bg-zinc-800 text-zinc-400'
            }`}>
              {counts[tech] || 0}
            </span>
            {selectedTech === tech && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Ticket List */}
      <div className="space-y-4">
        {tickets.map(ticket => (
          <div 
            key={ticket.id}
            className="block bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-amber-500/50 hover:bg-zinc-800/50 transition-all group relative"
          >
            <Link to={`/repair/${ticket.id}`} className="absolute inset-0 z-0" />
            
            <div className="relative z-10 flex justify-between items-start mb-3 pointer-events-none">
              <div className="pointer-events-auto">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-bold text-lg text-white group-hover:text-amber-500 transition-colors">
                    <span className="text-zinc-500 mr-2">#{ticket.claimNumber || ticket.id}</span>
                    {ticket.brand} {ticket.model}
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
                </div>
              </div>

              {/* Admin Assignment Dropdown */}
              {isAdmin && (
                <div className="pointer-events-auto">
                    <select
                        value={ticket.technician || ''}
                        onChange={(e) => handleAssign(e, ticket.id)}
                        onClick={(e) => e.preventDefault()}
                        className="bg-zinc-950 border border-zinc-700 text-zinc-300 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-2"
                    >
                        <option value="">Unassigned</option>
                        {technicians.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
              )}
            </div>

            <div className="bg-zinc-950/50 rounded p-3 text-sm text-zinc-400 border border-zinc-800/50 relative z-10 pointer-events-none">
              <span className="font-semibold text-zinc-500 block mb-1 text-xs uppercase tracking-wide">Current Issue</span>
              {ticket.issue}
            </div>
          </div>
        ))}

        {tickets.length === 0 && (
          <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800/50 rounded-xl border-dashed">
            {selectedTech === 'Unassigned' ? (
                 <UserMinus size={48} className="mx-auto text-zinc-700 mb-4" />
            ) : (
                 <UserCog size={48} className="mx-auto text-zinc-700 mb-4" />
            )}
           
            <h3 className="text-zinc-400 font-medium">No Active Jobs</h3>
            <p className="text-zinc-600 text-sm mt-1">
                {selectedTech === 'Unassigned' 
                    ? "All active tickets are assigned." 
                    : `${selectedTech} has no tickets assigned right now.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Technicians;
