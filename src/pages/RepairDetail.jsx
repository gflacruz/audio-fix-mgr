import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRepair, updateRepair, addRepairNote, getTechnicians, getParts, addRepairPart, removeRepairPart } from '@/lib/api';
import { printDiagnosticReceipt, printRepairInvoice } from '@/lib/printer';
import { ArrowLeft, Save, Clock, User, CheckCircle2, MessageSquare, ThumbsUp, Printer, Package, Plus, Trash2, X, FileText, DollarSign, Truck, Edit2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const RepairDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [client, setClient] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState([]);
  
  // Parts State
  const [partsSearch, setPartsSearch] = useState('');
  const [partsList, setPartsList] = useState([]);
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [selectedPartForAdd, setSelectedPartForAdd] = useState(null);
  const [addQuantity, setAddQuantity] = useState(1);

  // Invoice Wizard State
  const [showInvoiceWizard, setShowInvoiceWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [invoiceData, setInvoiceData] = useState({
    workPerformed: '',
    returnShippingCarrier: '',
    returnShippingCost: '',
    laborCost: ''
  });
  const [isEditingWork, setIsEditingWork] = useState(false);
  
  // Close Claim Modal State
  const [showCloseModal, setShowCloseModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [foundTicket, techList] = await Promise.all([
          getRepair(id),
          getTechnicians()
        ]);
        setTicket(foundTicket);
        setClient(foundTicket.client);
        setTechnicians(techList);
        // Initialize invoice data from ticket
        setInvoiceData({
          workPerformed: foundTicket.workPerformed || '',
          returnShippingCarrier: foundTicket.returnShippingCarrier || '',
          returnShippingCost: foundTicket.returnShippingCost || '',
          laborCost: foundTicket.laborCost || ''
        });
      } catch (error) {
        console.error("Failed to load repair:", error);
      }
      setLoading(false);
    };
    loadData();
  }, [id]);

  useEffect(() => {
    if (isAddingPart) {
      const searchParts = async () => {
        try {
          const results = await getParts(partsSearch);
          setPartsList(results);
        } catch (error) {
          console.error("Failed to search parts:", error);
        }
      };
      // Debounce could be added here, but direct call is okay for now
      const timeoutId = setTimeout(searchParts, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [partsSearch, isAddingPart]);

  const handleStatusChange = async (newStatus) => {
    try {
      await updateRepair(id, { status: newStatus });
      setTicket(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleTechnicianChange = async (newTech) => {
    try {
      await updateRepair(id, { technician: newTech });
      setTicket(prev => ({ ...prev, technician: newTech }));
    } catch (error) {
      console.error("Failed to update technician:", error);
    }
  };

  const addSystemNote = async (text) => {
    try {
      const author = user?.name || 'System';
      const note = await addRepairNote(id, { text, author });
      setTicket(prev => ({
        ...prev,
        notes: [...(prev.notes || []), note]
      }));
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  };

  const handleFeeToggle = async () => {
    try {
      const newStatus = !ticket.diagnosticFeeCollected;
      await updateRepair(id, { diagnosticFeeCollected: newStatus });
      setTicket(prev => ({ ...prev, diagnosticFeeCollected: newStatus }));
    } catch (error) {
      console.error("Failed to toggle fee:", error);
    }
  };

  const initiateAddPart = (part) => {
    setSelectedPartForAdd(part);
    setAddQuantity(1);
  };

  const confirmAddPart = async (e) => {
    e.preventDefault();
    if (!selectedPartForAdd) return;

    const quantity = parseInt(addQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    if (quantity > selectedPartForAdd.quantityInStock) {
      alert(`Cannot add ${quantity} items. Only ${selectedPartForAdd.quantityInStock} in stock.`);
      return;
    }

    try {
      await addRepairPart(id, selectedPartForAdd.id, quantity);
      // Re-fetch to get updated state
      const updatedTicket = await getRepair(id);
      setTicket(updatedTicket);
      
      // Reset state
      if (!showInvoiceWizard) {
        setIsAddingPart(false);
      }
      setPartsSearch('');
      setSelectedPartForAdd(null);
    } catch (error) {
      console.error("Failed to add part:", error);
      alert("Failed to add part: " + error.message);
    }
  };

  const cancelAddPart = () => {
    setSelectedPartForAdd(null);
    setAddQuantity(1);
  };

  const handleRemovePart = async (linkId) => {
    if (!window.confirm("Remove this part from the ticket?")) return;
    try {
      await removeRepairPart(id, linkId);
      setTicket(prev => ({
        ...prev,
        parts: prev.parts.filter(p => p.id !== linkId)
      }));
    } catch (error) {
      console.error("Failed to remove part:", error);
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const note = await addRepairNote(id, { text: newNote, author: user.name });
      setTicket(prev => ({
        ...prev,
        notes: [...(prev.notes || []), note]
      }));
      setNewNote('');
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  };

  // --- Invoice Wizard Logic ---

  const startInvoiceWizard = () => {
    setShowInvoiceWizard(true);
    setWizardStep(1);
    setIsAddingPart(true); // Auto-open parts search for convenience in step 1
  };

  const handleInvoiceNext = async () => {
    try {
      // Step 1: Parts (Already handled by standard part add/remove)
      if (wizardStep === 1) {
        setIsAddingPart(false); // Close search when leaving step 1
        setWizardStep(2);
        return;
      }

      // Step 2: Work Performed
      if (wizardStep === 2) {
        await updateRepair(id, { workPerformed: invoiceData.workPerformed });
        setTicket(prev => ({ ...prev, workPerformed: invoiceData.workPerformed }));
        
        // Skip shipping step if not shipped in
        if (ticket.isShippedIn) {
          setWizardStep(3);
        } else {
          setWizardStep(4);
        }
        return;
      }

      // Step 3: Return Shipping
      if (wizardStep === 3) {
        await updateRepair(id, { 
          returnShippingCarrier: invoiceData.returnShippingCarrier,
          returnShippingCost: parseFloat(invoiceData.returnShippingCost) || 0
        });
        setTicket(prev => ({ 
          ...prev, 
          returnShippingCarrier: invoiceData.returnShippingCarrier,
          returnShippingCost: parseFloat(invoiceData.returnShippingCost) || 0
        }));
        setWizardStep(4);
        return;
      }

      // Step 4: Labor & Finish
      if (wizardStep === 4) {
        await updateRepair(id, { laborCost: parseFloat(invoiceData.laborCost) || 0 });
        
        // Reload full ticket to ensure sync
        const updatedTicket = await getRepair(id);
        setTicket(updatedTicket);
        
        setShowInvoiceWizard(false);
        addSystemNote('Invoice details updated via wizard.');
      }
    } catch (error) {
      console.error("Failed to save invoice step:", error);
      alert(`Failed to save: ${error.message}`);
    }
  };

  const handleInvoiceChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData(prev => ({ ...prev, [name]: value }));
  };

  const saveWorkPerformed = async () => {
    try {
      await updateRepair(id, { workPerformed: invoiceData.workPerformed });
      setTicket(prev => ({ ...prev, workPerformed: invoiceData.workPerformed }));
      setIsEditingWork(false);
    } catch (error) {
      console.error("Failed to save work:", error);
    }
  };

  const handlePrintInvoice = () => {
    printRepairInvoice(ticket, client);
    if (ticket.status !== 'closed') {
      setShowCloseModal(true);
    }
  };

  const confirmCloseClaim = async () => {
    try {
      await updateRepair(id, { status: 'closed' });
      setTicket(prev => ({ ...prev, status: 'closed' }));
      setShowCloseModal(false);
      addSystemNote('Ticket closed after printing invoice.');
    } catch (error) {
      console.error("Failed to close ticket:", error);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading...</div>;
  if (!ticket) return <div className="p-8 text-zinc-500">Ticket not found.</div>;

  const partsTotal = ticket.parts?.reduce((sum, p) => sum + p.total, 0) || 0;
  const laborTotal = ticket.laborCost || 0;
  const shippingTotal = ticket.returnShippingCost || 0;
  
  const tax = (partsTotal + laborTotal) * 0.075;
  const total = partsTotal + laborTotal + shippingTotal + tax;
  
  const diagnosticFee = 89.00;
  const amountDue = ticket.diagnosticFeeCollected ? Math.max(0, total - diagnosticFee) : total;
  
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
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <span>
              <span className="text-amber-500 mr-3">#{ticket.claimNumber || ticket.id}</span>
              {ticket.brand} {ticket.model}
            </span>
            {ticket.isShippedIn && (
              <span className="bg-purple-900/50 text-purple-300 text-sm px-3 py-1 rounded-full border border-purple-800/50 font-medium">
                Shipped In
              </span>
            )}
          </h1>
          <div className="flex items-center gap-4 text-zinc-400">
            <span className="flex items-center gap-1"><User size={16} /> {client?.name}</span>
            <span className="flex items-center gap-1"><Clock size={16} /> In: {new Date(ticket.dateIn).toLocaleDateString()}</span>
            {ticket.unitType && <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs">{ticket.unitType}</span>}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
           <div className="flex items-center gap-2">
             <button
               onClick={startInvoiceWizard}
               className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors mr-2"
             >
               <FileText size={18} /> Invoice
             </button>

             <select 
                value={ticket.technician || 'Unassigned'} 
                onChange={(e) => handleTechnicianChange(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 text-zinc-300 px-3 py-2 rounded-lg focus:border-amber-500 outline-none text-sm"
              >
                <option value="Unassigned">Unassigned</option>
                {technicians.map(tech => (
                  <option key={tech} value={tech}>{tech}</option>
                ))}
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

          {/* Work Performed Section */}
          {(ticket.workPerformed || isEditingWork) && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-amber-500 font-semibold flex items-center gap-2">
                  <CheckCircle2 size={18} /> Work Performed
                </h3>
                {!isEditingWork && (
                  <button 
                    onClick={() => setIsEditingWork(true)}
                    className="text-zinc-500 hover:text-white"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
              
              {isEditingWork ? (
                <div>
                  <textarea
                    name="workPerformed"
                    value={invoiceData.workPerformed}
                    onChange={handleInvoiceChange}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-zinc-300 focus:border-amber-500 outline-none min-h-[100px]"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setIsEditingWork(false)} className="text-sm text-zinc-400 hover:text-white">Cancel</button>
                    <button onClick={saveWorkPerformed} className="text-sm bg-amber-600 text-white px-3 py-1 rounded">Save</button>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-300 whitespace-pre-wrap">{ticket.workPerformed}</p>
              )}
            </div>
          )}

          {/* Parts Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-amber-500 font-semibold flex items-center gap-2">
                Parts & Materials
              </h3>
              <button 
                onClick={() => setIsAddingPart(!isAddingPart)}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded flex items-center gap-1 transition-colors"
              >
                <Plus size={14} /> Add Part
              </button>
            </div>

            {isAddingPart && (
              <div className="mb-4 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search parts inventory..."
                  value={partsSearch}
                  onChange={(e) => setPartsSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white mb-2 focus:border-amber-500 outline-none"
                />
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {partsList.map(part => (
                    <div 
                      key={part.id} 
                      onClick={() => initiateAddPart(part)}
                      className="flex justify-between items-center p-2 hover:bg-zinc-800 rounded cursor-pointer text-sm"
                    >
                      <div>
                        <span className="text-zinc-300 block">{part.name}</span>
                        <span className={`text-xs ${part.quantityInStock > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          In Stock: {part.quantityInStock}
                        </span>
                      </div>
                      <span className="text-emerald-500">${part.retailPrice.toFixed(2)}</span>
                    </div>
                  ))}
                  {partsList.length === 0 && partsSearch && (
                    <div className="text-zinc-500 text-xs text-center py-2">No parts found.</div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {ticket.parts && ticket.parts.length > 0 ? (
                ticket.parts.map((part) => (
                  <div key={part.id} className="flex justify-between items-center bg-zinc-950/50 p-3 rounded border border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <Package size={16} className="text-zinc-600" />
                      <div>
                        <div className="text-sm text-zinc-200">{part.name}</div>
                        <div className="text-xs text-zinc-500">Qty: {part.quantity} × ${part.price.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-zinc-300">${part.total.toFixed(2)}</span>
                      <button 
                        onClick={() => handleRemovePart(part.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 text-sm italic text-center py-4 border border-dashed border-zinc-800 rounded">
                  No parts assigned to this repair.
                </div>
              )}
            </div>
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
          
          {/* Cost Breakdown */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-zinc-400 font-semibold text-sm uppercase tracking-wider mb-4">Cost Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Parts</span>
                <span className="text-zinc-200 font-mono">${partsTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Labor</span>
                <span className="text-zinc-200 font-mono">${laborTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Sales Tax (7.5%)</span>
                <span className="text-zinc-200 font-mono">${tax.toFixed(2)}</span>
              </div>
              {ticket.isShippedIn && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Return Shipping</span>
                  <span className="text-zinc-200 font-mono">${shippingTotal.toFixed(2)}</span>
                </div>
              )}
              {ticket.diagnosticFeeCollected && (
                <div className="flex justify-between text-sm text-green-500">
                  <span>Less: Diagnostic Fee</span>
                  <span className="font-mono">-${diagnosticFee.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-zinc-800 pt-3 mt-2">
                <div className="flex justify-between text-lg font-bold text-white">
                  <span>{ticket.diagnosticFeeCollected ? 'Amount Due' : 'Total'}</span>
                  <span>${amountDue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-zinc-400 font-semibold text-sm uppercase tracking-wider mb-4">Client Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-600 block">Name</label>
                <div className="text-zinc-200">{client?.name}</div>
              </div>
              {client?.companyName && (
                <div>
                  <label className="text-xs text-zinc-600 block">Company</label>
                  <div className="text-zinc-200">{client?.companyName}</div>
                </div>
              )}
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
              {ticket.modelVersion && (
                <div>
                  <label className="text-xs text-zinc-600 block">Model Version</label>
                  <div className="text-zinc-200">{ticket.modelVersion}</div>
                </div>
              )}
              {ticket.accessoriesIncluded && (
                <div>
                  <label className="text-xs text-zinc-600 block">Accessories</label>
                  <div className="text-zinc-200">{ticket.accessoriesIncluded}</div>
                </div>
              )}
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

          {ticket.isShippedIn && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
               <h3 className="text-zinc-400 font-semibold text-sm uppercase tracking-wider mb-4">Shipment Details</h3>
               <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-600 block">Inbound Carrier</label>
                  <div className="text-zinc-200">{ticket.shippingCarrier || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-xs text-zinc-600 block">Box Dimensions</label>
                  <div className="text-zinc-200 font-mono text-sm">
                    {ticket.boxLength || '?'}L x {ticket.boxWidth || '?'}W x {ticket.boxHeight || '?'}H
                  </div>
                </div>
                {ticket.returnShippingCarrier && (
                  <div>
                    <label className="text-xs text-zinc-600 block">Return Carrier</label>
                    <div className="text-zinc-200">{ticket.returnShippingCarrier}</div>
                  </div>
                )}
               </div>
            </div>
          )}

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
                onClick={handlePrintInvoice}
                className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 rounded-lg transition-colors border border-zinc-700"
              >
                <Printer size={18} />
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Part Quantity Modal */}
      {selectedPartForAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60]">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h3 className="text-lg font-bold text-white">Add Part</h3>
              <button onClick={cancelAddPart} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={confirmAddPart} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Part</label>
                <div className="text-white text-lg font-medium">{selectedPartForAdd.name}</div>
                <div className={`text-sm mt-1 ${selectedPartForAdd.quantityInStock > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  Available in Stock: {selectedPartForAdd.quantityInStock}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Quantity to Use</label>
                <input 
                  type="number" 
                  min="1"
                  max={selectedPartForAdd.quantityInStock}
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none text-lg font-mono"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={cancelAddPart}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={addQuantity > selectedPartForAdd.quantityInStock || addQuantity < 1}
                  className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium"
                >
                  Add to Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Wizard Modal */}
      {showInvoiceWizard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="text-blue-500" />
                Prepare Invoice
                <span className="text-sm font-normal text-zinc-500 ml-2">Step {wizardStep} of {ticket.isShippedIn ? 4 : 3}</span>
              </h3>
              <button onClick={() => setShowInvoiceWizard(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-white mb-2">Step 1: Review Parts</h4>
                  <p className="text-zinc-400 text-sm mb-4">Ensure all parts used are listed below. Add any missing parts.</p>
                  
                  {/* Re-use Parts Search UI */}
                  <div className="mb-4 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                    <input 
                      type="text" 
                      autoFocus
                      placeholder="Search parts inventory to add..."
                      value={partsSearch}
                      onChange={(e) => setPartsSearch(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white mb-2 focus:border-amber-500 outline-none"
                    />
                    {partsSearch && (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {partsList.map(part => (
                          <div 
                            key={part.id} 
                            onClick={() => initiateAddPart(part)}
                            className="flex justify-between items-center p-2 hover:bg-zinc-800 rounded cursor-pointer text-sm"
                          >
                            <div>
                              <span className="text-zinc-300 block">{part.name}</span>
                              <span className={`text-xs ${part.quantityInStock > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                In Stock: {part.quantityInStock}
                              </span>
                            </div>
                            <span className="text-emerald-500">${part.retailPrice.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {ticket.parts?.map(part => (
                      <div key={part.id} className="flex justify-between items-center bg-zinc-800/50 p-3 rounded border border-zinc-700">
                        <span className="text-zinc-200">{part.name} (x{part.quantity})</span>
                        <span className="text-zinc-300 font-mono">${part.total.toFixed(2)}</span>
                      </div>
                    ))}
                    {(!ticket.parts || ticket.parts.length === 0) && (
                      <div className="text-center text-zinc-500 py-4 italic">No parts added.</div>
                    )}
                  </div>
                  <div className="text-right text-lg font-bold text-white mt-4">
                    Parts Total: ${partsTotal.toFixed(2)}
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-white mb-2">Step 2: Repairs Made</h4>
                  <p className="text-zinc-400 text-sm mb-4">Describe the work performed for the final invoice.</p>
                  <textarea
                    name="workPerformed"
                    value={invoiceData.workPerformed}
                    onChange={handleInvoiceChange}
                    placeholder="e.g. Replaced capacitors in power supply, cleaned controls, calibrated bias..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-4 text-white focus:border-amber-500 outline-none h-40"
                  />
                </div>
              )}

              {wizardStep === 3 && ticket.isShippedIn && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-white mb-2">Step 3: Return Shipping</h4>
                  <p className="text-zinc-400 text-sm mb-4">Enter return shipping details.</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Carrier</label>
                      <input
                        name="returnShippingCarrier"
                        value={invoiceData.returnShippingCarrier}
                        onChange={handleInvoiceChange}
                        placeholder="e.g. UPS Ground"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Shipping Cost Quote ($)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-zinc-500">$</span>
                        <input
                          type="number"
                          name="returnShippingCost"
                          value={invoiceData.returnShippingCost}
                          onChange={handleInvoiceChange}
                          placeholder="0.00"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded pl-7 pr-3 py-2 text-white focus:border-amber-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(wizardStep === 4 || (wizardStep === 3 && !ticket.isShippedIn)) && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-white mb-2">Final Step: Labor Cost</h4>
                  <p className="text-zinc-400 text-sm mb-4">Enter the total labor charge.</p>
                  
                  <div className="max-w-xs">
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Labor Amount ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-zinc-500">$</span>
                      <input
                        type="number"
                        name="laborCost"
                        value={invoiceData.laborCost}
                        onChange={handleInvoiceChange}
                        placeholder="0.00"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded pl-7 pr-3 py-2 text-white focus:border-amber-500 outline-none text-lg"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-950 flex justify-end gap-3">
              {wizardStep > 1 && (
                <button 
                  onClick={() => setWizardStep(prev => prev - 1)}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Back
                </button>
              )}
              <button 
                onClick={handleInvoiceNext}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {(wizardStep === 4 || (wizardStep === 3 && !ticket.isShippedIn)) ? 'Finish & Save' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Claim Confirmation Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[70]">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-blue-500" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Close this Claim?</h3>
              
              {ticket.technician === 'Unassigned' ? (
                <div className="mb-6 text-left">
                   <p className="text-amber-500 text-sm mb-3 font-medium text-center">
                     ⚠️ Technician Required
                   </p>
                   <p className="text-zinc-400 text-sm mb-4 text-center">
                     Please select the technician who worked on this repair before closing the ticket.
                   </p>
                   <label className="block text-xs font-medium text-zinc-500 mb-1 ml-1">Assign Technician</label>
                   <select 
                      value={ticket.technician || 'Unassigned'} 
                      onChange={(e) => handleTechnicianChange(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                    >
                      <option value="Unassigned">Select Technician...</option>
                      {technicians.map(tech => (
                        <option key={tech} value={tech}>{tech}</option>
                      ))}
                    </select>
                </div>
              ) : (
                <p className="text-zinc-400 text-sm mb-6">
                  You just printed the invoice. Would you like to mark this repair ticket as <strong>Closed</strong> now?
                </p>
              )}
              
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  No, keep open
                </button>
                <button 
                  onClick={confirmCloseClaim}
                  disabled={ticket.technician === 'Unassigned'}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Yes, Close Claim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RepairDetail;

