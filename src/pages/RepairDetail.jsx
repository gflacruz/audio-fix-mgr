import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDB, saveDB } from '@/lib/api';
import { printDiagnosticReceipt, printRepairInvoice } from '@/lib/printer';
import { ArrowLeft, Save, Clock, User, CheckCircle2, MessageSquare, ThumbsUp, Printer } from 'lucide-react';

const RepairDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [client, setClient] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const db = await getDB();
      const foundTicket = db.repairs.find(r => r.id === id);
      
      if (foundTicket) {
        setTicket(foundTicket);
        const foundClient = db.clients.find(c => c.id === foundTicket.clientId);
        setClient(foundClient);
      }
      setLoading(false);
    };
    loadData();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    const db = await getDB();
    const ticketIndex = db.repairs.findIndex(r => r.id === id);
    if (ticketIndex !== -1) {
      db.repairs[ticketIndex].status = newStatus;
      await saveDB(db);
      setTicket({ ...ticket, status: newStatus });
    }
  };

  const handleTechnicianChange = async (newTech) => {
    const db = await getDB();
    const ticketIndex = db.repairs.findIndex(r => r.id === id);
    if (ticketIndex !== -1) {
      db.repairs[ticketIndex].technician = newTech;
      await saveDB(db);
      setTicket({ ...ticket, technician: newTech });
    }
  };

  const addSystemNote = async (text) => {
    const note = {
      id: Date.now().toString(),
      text: text,
      date: new Date().toISOString(),
      author: 'System'
    };

    const db = await getDB();
    const ticketIndex = db.repairs.findIndex(r => r.id === id);
    
    if (ticketIndex !== -1) {
      if (!db.repairs[ticketIndex].notes) {
        db.repairs[ticketIndex].notes = [];
      }
      db.repairs[ticketIndex].notes.push(note);
      await saveDB(db);
      
      setTicket({
        ...ticket,
        notes: [...(ticket.notes || []), note]
      });
    }
  };

  const handleFeeToggle = async () => {
    const db = await getDB();
    const ticketIndex = db.repairs.findIndex(r => r.id === id);
    if (ticketIndex !== -1) {
      const newStatus = !ticket.diagnosticFeeCollected;
      db.repairs[ticketIndex].diagnosticFeeCollected = newStatus;
      await saveDB(db);
      setTicket({ ...ticket, diagnosticFeeCollected: newStatus });
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const note = {
      id: Date.now().toString(),
      text: newNote,
      date: new Date().toISOString(),
      author: 'Technician' // Placeholder for now
    };

    const db = await getDB();
    const ticketIndex = db.repairs.findIndex(r => r.id === id);
    
    if (ticketIndex !== -1) {
      if (!db.repairs[ticketIndex].notes) {
        db.repairs[ticketIndex].notes = [];
      }
      db.repairs[ticketIndex].notes.push(note);
      await saveDB(db);
      
      // Update local state
      setTicket({
        ...ticket,
        notes: [...(ticket.notes || []), note]
      });
      setNewNote('');
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading...</div>;
  if (!ticket) return <div className="p-8 text-zinc-500">Ticket not found.</div>;

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Back to Workbench
      </button>

      {/* Header / Title */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            <span className="text-amber-500 mr-3">#{ticket.claimNumber || ticket.id}</span>
            {ticket.brand} {ticket.model}
          </h1>
          <div className="flex items-center gap-4 text-zinc-400">
            <span className="flex items-center gap-1"><User size={16} /> {client?.name}</span>
            <span className="flex items-center gap-1"><Clock size={16} /> In: {new Date(ticket.dateIn).toLocaleDateString()}</span>
            {ticket.unitType && <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs">{ticket.unitType}</span>}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
           <div className="flex items-center gap-2">
             <select 
                value={ticket.technician || 'Unassigned'} 
                onChange={(e) => handleTechnicianChange(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 text-zinc-300 px-3 py-2 rounded-lg focus:border-amber-500 outline-none text-sm"
              >
                <option value="Unassigned">Unassigned</option>
                <option value="Willy">Willy</option>
                <option value="Sergei">Sergei</option>
                <option value="Tyler">Tyler</option>
              </select>

              <select 
                value={ticket.status} 
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-white px-4 py-2 rounded-lg focus:border-amber-500 outline-none"
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
           
           {/* Estimate Actions */}
           <div className="flex gap-2 mt-2">
             <button
               onClick={() => addSystemNote('Client has been notified of estimate.')}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded transition-colors"
               title="Log that client was notified"
             >
               <MessageSquare size={14} /> Notified
             </button>
             <button
               onClick={() => addSystemNote('Client has approved estimate.')}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-900/50 text-xs font-medium rounded transition-colors"
               title="Log client approval"
             >
               <ThumbsUp size={14} /> Approved
             </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="col-span-2 space-y-6">
          
          {/* Issue Description */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-amber-500 font-semibold mb-3">Reported Issue</h3>
            <p className="text-zinc-300 leading-relaxed">{ticket.issue}</p>
          </div>

          {/* Notes System */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-amber-500 font-semibold mb-4 flex items-center gap-2">
              Technician Notes 
              <span className="text-zinc-600 text-sm font-normal">({ticket.notes?.length || 0})</span>
            </h3>

            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
              {ticket.notes && ticket.notes.map((note) => (
                <div key={note.id} className="bg-zinc-950/50 border border-zinc-800/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-zinc-500 uppercase">{note.author}</span>
                    <span className="text-xs text-zinc-600">{new Date(note.date).toLocaleString()}</span>
                  </div>
                  <p className="text-zinc-300 text-sm whitespace-pre-wrap">{note.text}</p>
                </div>
              ))}
              {(!ticket.notes || ticket.notes.length === 0) && (
                <div className="text-zinc-600 text-sm italic text-center py-4">No notes added yet.</div>
              )}
            </div>

            <form onSubmit={addNote} className="relative">
              <textarea 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addNote(e);
                  }
                }}
                placeholder="Type a new note... (Press Enter to save)"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-4 pr-12 py-3 text-white focus:border-amber-500 focus:outline-none min-h-[80px]"
              />
              <button 
                type="submit" 
                disabled={!newNote.trim()}
                className="absolute bottom-3 right-3 text-amber-600 hover:text-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Info Card */}
        <div className="col-span-1 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-zinc-400 font-semibold text-sm uppercase tracking-wider mb-4">Client Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-600 block">Name</label>
                <div className="text-zinc-200">{client?.name}</div>
              </div>
              <div>
                <label className="text-xs text-zinc-600 block">Phone</label>
                <div className="text-zinc-200">{client?.phone}</div>
              </div>
              <div>
                <label className="text-xs text-zinc-600 block">Email</label>
                <div className="text-zinc-200 truncate" title={client?.email}>{client?.email || '-'}</div>
              </div>
              <div>
                <label className="text-xs text-zinc-600 block">Address</label>
                <div className="text-zinc-200 text-sm">{client?.address || '-'}</div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
             <h3 className="text-zinc-400 font-semibold text-sm uppercase tracking-wider mb-4">Unit Specs</h3>
             <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-600 block">Serial Number</label>
                <div className="text-zinc-200 font-mono">{ticket.serial || 'N/A'}</div>
              </div>
              <div>
                 <label className="text-xs text-zinc-600 block">Priority</label>
                 <div className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase ${
                   ticket.priority === 'rush' ? 'bg-red-900/30 text-red-500' : 'bg-zinc-800 text-zinc-400'
                 }`}>
                   {ticket.priority}
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <input 
                   type="checkbox" 
                   id="feeCollected"
                   checked={ticket.diagnosticFeeCollected || false}
                   onChange={handleFeeToggle}
                   className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-600 focus:ring-amber-500 focus:ring-offset-zinc-900"
                 />
                 <label htmlFor="feeCollected" className="text-xs text-zinc-400 select-none cursor-pointer">
                   Diagnostic Fee Collected ($89)
                 </label>
              </div>
             </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-zinc-400 font-semibold text-sm uppercase tracking-wider mb-4">Documents</h3>
            <div className="space-y-3">
              <button 
                onClick={() => printDiagnosticReceipt(ticket, client)}
                className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 rounded-lg transition-colors border border-zinc-700"
              >
                <Printer size={18} />
                Print Fee Receipt
              </button>
              <button 
                onClick={() => printRepairInvoice(ticket, client)}
                className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 rounded-lg transition-colors border border-zinc-700"
              >
                <Printer size={18} />
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepairDetail;
