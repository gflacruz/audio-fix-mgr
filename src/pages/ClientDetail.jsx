import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClient, updateClient, getRepairs } from '@/lib/api';
import { ArrowLeft, Save, Mail, Phone, MapPin, Wrench, Copy, Plus, Trash2, Building2, MessageSquare } from 'lucide-react';

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [foundClient, clientTickets] = await Promise.all([
        getClient(id),
        getRepairs({ clientId: id })
      ]);
      setClient(foundClient);
      setFormData(foundClient);
      
      // Sort: Non-closed first, then by date (newest first)
      const sortedTickets = clientTickets.sort((a, b) => {
        const isClosedA = a.status === 'closed';
        const isClosedB = b.status === 'closed';
        
        if (isClosedA !== isClosedB) {
          return isClosedA ? 1 : -1;
        }
        return new Date(b.dateIn) - new Date(a.dateIn);
      });
      
      setTickets(sortedTickets);
    } catch (error) {
      console.error("Failed to load client data:", error);
    }
    setLoading(false);
  };

  const handlePhoneChange = (index, field, value) => {
    const newPhones = [...(formData.phones || [])];
    newPhones[index] = { ...newPhones[index], [field]: value };
    setFormData(prev => ({ ...prev, phones: newPhones }));
  };

  const addPhone = () => {
    setFormData(prev => ({
      ...prev,
      phones: [...(prev.phones || []), { number: '', type: 'Cell', extension: '' }]
    }));
  };

  const removePhone = (index) => {
    if ((formData.phones || []).length > 1) {
      setFormData(prev => ({
        ...prev,
        phones: prev.phones.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSave = async (e) => {    e.preventDefault();
    try {
      await updateClient(id, formData);
      // No need to update tickets manually as they link by ID
      setClient(prev => ({ ...prev, ...formData }));
      setIsEditing(false);
      loadData();
    } catch (error) {
      console.error("Failed to update client:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Logic to revert notification preference if email is cleared
      if (name === 'email' && !value && prev.primaryNotification === 'Email') {
        newData.primaryNotification = 'Phone';
      }
      
      return newData;
    });
  };

  const copyToClipboard = (text) => {
    if (text) {
      navigator.clipboard.writeText(text);
    }
  };

  const formatPhoneNumber = (str) => {
    const cleaned = ('' + str).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    return match ? '(' + match[1] + ') ' + match[2] + '-' + match[3] : str;
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading...</div>;
  if (!client) return <div className="p-8 text-zinc-500">Client not found.</div>;

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <button 
        onClick={() => navigate('/clients')} 
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Back to Clients
      </button>

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          {client.companyName ? (
            <>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">{client.companyName}</h1>
              <div className="text-xl text-amber-600 dark:text-amber-500 font-medium mb-2">{client.name}</div>
            </>
          ) : (
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">{client.name}</h1>
          )}
          <div className="flex items-center gap-4 text-sm mt-1">
            <p className="text-zinc-500">Client since {new Date(client.dateAdded).toLocaleDateString()}</p>
            <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
            <p className="text-zinc-500 dark:text-zinc-400">
              Total Spent: <span className="text-green-600 dark:text-green-500 font-medium">${(client.totalSpent || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => isEditing ? document.getElementById('client-form').requestSubmit() : setIsEditing(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isEditing 
              ? 'bg-amber-600 hover:bg-amber-500 text-white' 
              : 'bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-sm dark:shadow-none'
          }`}
        >
          {isEditing ? <><Save size={18} /> Save Changes</> : 'Edit Client'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Left Column: Client Info */}
        <div className="col-span-1">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
            <h3 className="text-zinc-500 dark:text-zinc-400 font-semibold text-sm uppercase tracking-wider mb-6">Contact Info</h3>
            
            {isEditing ? (
              <form id="client-form" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Name</label>
                  <input name="name" value={formData.name} onChange={handleChange} 
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2 text-zinc-900 dark:text-white text-sm focus:border-amber-500 outline-none" />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Company</label>
                  <input name="companyName" value={formData.companyName || ''} onChange={handleChange} 
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2 text-zinc-900 dark:text-white text-sm focus:border-amber-500 outline-none" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-zinc-500 block">Phone Numbers</label>
                    <button type="button" onClick={addPhone} className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1 hover:text-amber-500 dark:hover:text-amber-400">
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  <div className="space-y-2">
                        {(formData.phones || []).map((phone, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="flex-1">
                           <input
                            value={phone.number}
                            onChange={(e) => handlePhoneChange(index, 'number', e.target.value)}
                            placeholder="Number"
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2 text-zinc-900 dark:text-white text-sm focus:border-amber-500 outline-none"
                          />
                        </div>
                        <div className="w-20">
                          <select
                            value={phone.type}
                            onChange={(e) => handlePhoneChange(index, 'type', e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2 text-zinc-900 dark:text-white text-sm focus:border-amber-500 outline-none"
                          >
                            <option value="Cell">Cell</option>
                            <option value="Work">Work</option>
                            <option value="Home">Home</option>
                            <option value="Fax">Fax</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="w-16">
                           <input
                            value={phone.extension || ''}
                            onChange={(e) => handlePhoneChange(index, 'extension', e.target.value)}
                            placeholder="Ext"
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2 text-zinc-900 dark:text-white text-sm focus:border-amber-500 outline-none"
                          />
                        </div>
                        {(formData.phones || []).length > 1 && (
                          <button type="button" onClick={() => removePhone(index)} className="text-zinc-500 hover:text-red-500">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Email</label>
                    <input name="email" value={formData.email || ''} onChange={handleChange} 
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2 text-zinc-900 dark:text-white text-sm focus:border-amber-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Notification Pref</label>
                    <select 
                      name="primaryNotification" 
                      value={formData.primaryNotification || 'Phone'} 
                      onChange={handleChange}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2 text-zinc-900 dark:text-white text-sm focus:border-amber-500 outline-none"
                    >
                      <option value="Phone">Phone</option>
                      <option value="Text">Text</option>
                      <option value="Email" disabled={!formData.email}>Email</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Street Address</label>
                  <input name="address" value={formData.address} onChange={handleChange} 
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2 text-zinc-900 dark:text-white text-sm focus:border-amber-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">City</label>
                    <input name="city" value={formData.city} onChange={handleChange} 
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2 text-zinc-900 dark:text-white text-sm focus:border-amber-500 outline-none" />
                  </div>
                  <div>
                     <label className="text-xs text-zinc-500 mb-1 block">State</label>
                     <input name="state" value={formData.state} onChange={handleChange} maxLength={2}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2 text-zinc-900 dark:text-white text-sm focus:border-amber-500 outline-none" />
                  </div>
                </div>
                <div>
                   <label className="text-xs text-zinc-500 mb-1 block">Zip Code</label>
                   <input name="zip" value={formData.zip} onChange={handleChange} maxLength={5}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded p-2 text-zinc-900 dark:text-white text-sm focus:border-amber-500 outline-none" />
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  {client.companyName && (
                    <div className="flex items-start gap-3 group">
                      <Building2 size={18} className="text-amber-600 dark:text-amber-600 mt-0.5" />
                      <div>
                        <div className="text-zinc-900 dark:text-zinc-200 font-medium">{client.companyName}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-600">Company</div>
                      </div>
                    </div>
                  )}

                        {(client.phones && client.phones.length > 0) ? (
                    client.phones.map((phone, idx) => (
                      <div key={idx} className="flex items-start gap-3 group">
                        <Phone size={18} className={`mt-0.5 ${phone.isPrimary ? 'text-amber-600' : 'text-zinc-400 dark:text-zinc-600'}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`text-zinc-900 dark:text-zinc-200 ${phone.isPrimary ? 'font-medium' : ''}`}>
                              {formatPhoneNumber(phone.number)}
                              {phone.extension && <span className="text-zinc-500 ml-2 text-sm">x{phone.extension}</span>}
                            </div>
                            <button 
                              onClick={() => copyToClipboard(phone.number)}
                              className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-600 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                              title="Copy Phone Number"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-600 flex items-center gap-2">
                            {phone.type}
                            {phone.isPrimary && <span className="text-amber-600 dark:text-amber-500/80 bg-amber-100 dark:bg-amber-500/10 px-1.5 rounded text-[10px]">Primary</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                     /* Fallback for legacy clients if any (shouldn't be needed due to migration) */
                     <div className="flex items-start gap-3 group">
                       <Phone size={18} className="text-amber-600 mt-0.5" />
                       <div>
                         <div className="flex items-center gap-2">
                           <div className="text-zinc-900 dark:text-zinc-200">{formatPhoneNumber(client.phone)}</div>
                         </div>
                         <div className="text-xs text-zinc-500 dark:text-zinc-600">Primary</div>
                       </div>
                     </div>
                  )}
                </div>

                <div className="flex items-start gap-3 group">
                  <div className="text-zinc-400 dark:text-zinc-600 mt-0.5">
                    <Mail size={18} />
                  </div>
                  <div className="break-all">
                    <div className="flex items-center gap-2">
                      <div className="text-zinc-900 dark:text-zinc-200">{client.email || 'No email'}</div>
                      {client.email && (
                        <button 
                          onClick={() => copyToClipboard(client.email)}
                          className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-600 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                          title="Copy Email Address"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-600 flex items-center gap-2">
                      Email
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-zinc-400 dark:text-zinc-600 mt-0.5">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <div className="text-zinc-900 dark:text-zinc-200">
                      {client.primaryNotification || 'Phone'}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-600">Preferred Contact Method</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-amber-600 mt-0.5" />
                  <div>
                    <div className="text-zinc-900 dark:text-zinc-200">
                      {client.address && <div>{client.address}</div>}
                      {(client.city || client.state || client.zip) && (
                        <div>
                          {client.city}{client.city && client.state && ', '}
                          {client.state} {client.zip}
                        </div>
                      )}
                      {!client.address && !client.city && 'No address provided'}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-600">Billing Address</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Repair History */}
        <div className="col-span-2">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-zinc-900 dark:text-white font-bold flex items-center gap-2">
                <Wrench size={20} className="text-amber-500" />
                Repair History
              </h3>
              <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded text-xs font-medium">
                {tickets.length} Unit{tickets.length !== 1 && 's'}
              </span>
            </div>
            
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {tickets.map(ticket => (
                <Link to={`/repair/${ticket.id}`} key={ticket.id} className="block p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">
                         <span className="text-zinc-500 mr-2">#{ticket.claimNumber || ticket.id}</span>
                        {ticket.brand} {ticket.model}
                      </div>
                      <div className="text-sm text-zinc-500 mt-1">
                        In: {new Date(ticket.dateIn).toLocaleDateString()} • {ticket.issue.substring(0, 60)}...
                        {ticket.diagnosticFee > 0 && (
                          <span className="ml-2 text-green-600 dark:text-green-500 font-medium text-xs">
                             (Paid: ${ticket.diagnosticFee.toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs uppercase font-bold tracking-wider
                      ${ticket.status === 'ready' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-500' : 
                        ticket.status === 'closed' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-500'}`}>
                      {ticket.status}
                    </div>
                  </div>
                </Link>
              ))}
              {tickets.length === 0 && (
                <div className="p-8 text-center text-zinc-500">
                  No repair history found for this client.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetail;
