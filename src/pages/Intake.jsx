import React, { useState } from 'react';
import { getDB, saveDB } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';

const Intake = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    clientName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    brand: '',
    model: '',
    unitType: 'Receiver',
    serial: '',
    issue: '',
    priority: 'normal'
  });

  const [showFeeModal, setShowFeeModal] = useState(false);

  const fetchZipInfo = async (zip) => {
    if (zip.length === 5) {
      try {
        const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
        if (response.ok) {
          const data = await response.json();
          if (data.places && data.places.length > 0) {
            setFormData(prev => ({
              ...prev,
              city: data.places[0]['place name'],
              state: data.places[0]['state abbreviation']
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching zip data:", error);
      }
    }
  };

  const lookupClientByPhone = async (phone) => {
    if (phone.length >= 7) { // Start searching after enough digits
      const db = await getDB();
      const client = db.clients.find(c => c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
      
      if (client) {
        setFormData(prev => ({
          ...prev,
          clientName: client.name,
          email: client.email || '',
          address: client.address || '',
          city: client.city || '',
          state: client.state || '',
          zip: client.zip || ''
        }));
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'zip') {
      fetchZipInfo(value);
    }
    if (name === 'phone') {
      lookupClientByPhone(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.priority === 'normal') {
      setShowFeeModal(true);
      return;
    }

    await createTicket(false);
  };

  const createTicket = async (feeCollected) => {
    const db = await getDB();
    
    // Create/Find Client
    let client = db.clients.find(c => c.name === formData.clientName);
    if (!client) {
      client = {
        id: Date.now().toString(),
        name: formData.clientName,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        dateAdded: new Date().toISOString()
      };
      db.clients.push(client);
    }

    // Calculate Next Claim Number
    const lastClaim = db.repairs.reduce((max, r) => {
      const claim = r.claimNumber || 0;
      return claim > max ? claim : max;
    }, 110999);
    
    const newClaimNumber = lastClaim + 1;

    // Create Repair Ticket
    const ticket = {
      id: newClaimNumber.toString(),
      claimNumber: newClaimNumber,
      clientId: client.id,
      clientName: client.name, // denormalized for easy display
      brand: formData.brand,
      model: formData.model,
      unitType: formData.unitType,
      serial: formData.serial,
      issue: formData.issue,
      priority: formData.priority,
      status: 'queued', // queued, diagnosing, parts, repairing, ready, closed
      technician: 'Unassigned',
      dateIn: new Date().toISOString(),
      diagnosticFeeCollected: feeCollected,
      notes: []
    };
    
    db.repairs.push(ticket);
    
    await saveDB(db);
    navigate(`/repair/${ticket.id}`);
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-6 text-white">New Repair Intake</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Info Section */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-amber-500 mb-4">Client Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Phone Number (Auto-lookup) <span className="text-red-500">*</span>
              </label>
              <input required name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter phone to find client..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-amber-500 focus:outline-none required:border-red-500/50" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input required name="clientName" value={formData.clientName} onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-amber-500 focus:outline-none required:border-red-500/50" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-1">Email Address</label>
              <input name="email" value={formData.email} onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-amber-500 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input required name="address" value={formData.address} onChange={handleChange} placeholder="123 Audio Lane"
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-amber-500 focus:outline-none required:border-red-500/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Zip Code <span className="text-red-500">*</span>
              </label>
              <input required name="zip" value={formData.zip} onChange={handleChange} placeholder="90210" maxLength={5}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-amber-500 focus:outline-none required:border-red-500/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input required name="city" value={formData.city} onChange={handleChange}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-amber-500 focus:outline-none required:border-red-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <input required name="state" value={formData.state} onChange={handleChange} maxLength={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-amber-500 focus:outline-none required:border-red-500/50" />
              </div>
            </div>
          </div>
        </div>

        {/* Unit Info Section */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-amber-500 mb-4">Unit Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
               <label className="block text-sm font-medium text-zinc-400 mb-1">Unit Type</label>
               <select name="unitType" value={formData.unitType} onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-amber-500 focus:outline-none">
                  <option value="Receiver">Receiver</option>
                  <option value="Power Amp">Power Amp</option>
                  <option value="Integrated Amp">Integrated Amp</option>
                  <option value="Preamp">Preamp</option>
                  <option value="Turntable">Turntable</option>
                  <option value="Speaker">Speaker</option>
                  <option value="Cassette Deck">Cassette Deck</option>
                  <option value="Reel-to-Reel">Reel-to-Reel</option>
                  <option value="Mixer">Mixer</option>
                  <option value="Effect Unit">Effect Unit</option>
                  <option value="Other">Other</option>
               </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Brand / Make <span className="text-red-500">*</span>
              </label>
              <input required name="brand" value={formData.brand} onChange={handleChange} placeholder="e.g. Fender"
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-amber-500 focus:outline-none required:border-red-500/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Model <span className="text-red-500">*</span>
              </label>
              <input required name="model" value={formData.model} onChange={handleChange} placeholder="e.g. Twin Reverb"
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-amber-500 focus:outline-none required:border-red-500/50" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-1">Serial Number</label>
              <input name="serial" value={formData.serial} onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-amber-500 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Reported Issue <span className="text-red-500">*</span>
              </label>
              <textarea required name="issue" value={formData.issue} onChange={handleChange} rows="3"
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-amber-500 focus:outline-none required:border-red-500/50" />
            </div>
            <div>
               <label className="block text-sm font-medium text-zinc-400 mb-1">Priority</label>
               <select name="priority" value={formData.priority} onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-amber-500 focus:outline-none">
                  <option value="normal">Normal</option>
                  <option value="rush">Rush (+Fee)</option>
                  <option value="warranty">Warranty</option>
               </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors">
            <Save size={20} />
            Check In Unit
          </button>
        </div>
      </form>

      {/* Fee Collection Modal */}
      {showFeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Collect Diagnostic Fee</h3>
            <p className="text-zinc-300 mb-6">
              For normal priority repairs, a <strong>$89 diagnostic fee</strong> is standard. 
              Has this fee been collected from the client?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => createTicket(false)}
                className="px-4 py-2 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                No, Not Collected
              </button>
              <button
                onClick={() => createTicket(true)}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-colors"
              >
                Yes, Fee Collected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Intake;
