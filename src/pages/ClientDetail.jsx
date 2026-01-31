import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClient, updateClient, getRepairs } from '@/lib/api';
import { ArrowLeft, Save, Mail, Phone, MapPin, Wrench, Copy } from 'lucide-react';

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
      setTickets(clientTickets);
    } catch (error) {
      console.error("Failed to load client data:", error);
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Back to Clients
      </button>

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{client.name}</h1>
          <p className="text-zinc-500 text-sm">Client since {new Date(client.dateAdded).toLocaleDateString()}</p>
        </div>
        <button
          onClick={() => isEditing ? document.getElementById('client-form').requestSubmit() : setIsEditing(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isEditing 
              ? 'bg-amber-600 hover:bg-amber-500 text-white' 
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
          }`}
        >
          {isEditing ? <><Save size={18} /> Save Changes</> : 'Edit Client'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Left Column: Client Info */}
        <div className="col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-zinc-400 font-semibold text-sm uppercase tracking-wider mb-6">Contact Info</h3>
            
            {isEditing ? (
              <form id="client-form" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Name</label>
                  <input name="name" value={formData.name} onChange={handleChange} 
                    className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm focus:border-amber-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Phone</label>
                  <input name="phone" value={formData.phone} onChange={handleChange} 
                    className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm focus:border-amber-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Email</label>
                  <input name="email" value={formData.email} onChange={handleChange} 
                    className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm focus:border-amber-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Street Address</label>
                  <input name="address" value={formData.address} onChange={handleChange} 
                    className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm focus:border-amber-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">City</label>
                    <input name="city" value={formData.city} onChange={handleChange} 
                      className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm focus:border-amber-500 outline-none" />
                  </div>
                  <div>
                     <label className="text-xs text-zinc-500 mb-1 block">State</label>
                     <input name="state" value={formData.state} onChange={handleChange} maxLength={2}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm focus:border-amber-500 outline-none" />
                  </div>
                </div>
                <div>
                   <label className="text-xs text-zinc-500 mb-1 block">Zip Code</label>
                   <input name="zip" value={formData.zip} onChange={handleChange} maxLength={5}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm focus:border-amber-500 outline-none" />
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start gap-3 group">
                  <Phone size={18} className="text-amber-600 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-zinc-200">{formatPhoneNumber(client.phone)}</div>
                      <button 
                        onClick={() => copyToClipboard(client.phone)}
                        className="text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                        title="Copy Phone Number"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <div className="text-xs text-zinc-600">Mobile</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 group">
                  <Mail size={18} className="text-amber-600 mt-0.5" />
                  <div className="break-all">
                    <div className="flex items-center gap-2">
                      <div className="text-zinc-200">{client.email || 'No email'}</div>
                      {client.email && (
                        <button 
                          onClick={() => copyToClipboard(client.email)}
                          className="text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                          title="Copy Email Address"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-zinc-600">Email</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-amber-600 mt-0.5" />
                  <div>
                    <div className="text-zinc-200">
                      {client.address && <div>{client.address}</div>}
                      {(client.city || client.state || client.zip) && (
                        <div>
                          {client.city}{client.city && client.state && ', '}
                          {client.state} {client.zip}
                        </div>
                      )}
                      {!client.address && !client.city && 'No address provided'}
                    </div>
                    <div className="text-xs text-zinc-600">Billing Address</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Repair History */}
        <div className="col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Wrench size={20} className="text-amber-500" />
                Repair History
              </h3>
              <span className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded text-xs font-medium">
                {tickets.length} Unit{tickets.length !== 1 && 's'}
              </span>
            </div>
            
            <div className="divide-y divide-zinc-800">
              {tickets.map(ticket => (
                <Link to={`/repair/${ticket.id}`} key={ticket.id} className="block p-4 hover:bg-zinc-800/50 transition-colors group">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-white group-hover:text-amber-500 transition-colors">
                         <span className="text-zinc-500 mr-2">#{ticket.claimNumber || ticket.id}</span>
                        {ticket.brand} {ticket.model}
                      </div>
                      <div className="text-sm text-zinc-500 mt-1">
                        In: {new Date(ticket.dateIn).toLocaleDateString()} • {ticket.issue.substring(0, 60)}...
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs uppercase font-bold tracking-wider 
                      ${ticket.status === 'ready' ? 'bg-green-900/30 text-green-500' : 
                        ticket.status === 'closed' ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-900/30 text-blue-500'}`}>
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
