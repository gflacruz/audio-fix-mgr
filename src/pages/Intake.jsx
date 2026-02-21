import React, { useState, useEffect, useRef } from 'react';
import { getClients, getClient, createClient, updateClient, createRepair, sendOptInText } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { Save, Plus, Trash2, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const inputCls = "w-full bg-zinc-50 dark:bg-zinc-950 focus:bg-zinc-100 dark:focus:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-white focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400 focus:outline-none transition-colors";
const selectCls = inputCls;

const UNIT_TYPES = [
  'Receiver', 'Power Amp', 'Integrated Amp', 'Preamp', 'Turntable',
  'Speaker', 'Cassette Deck', 'Reel-to-Reel', 'Mixer', 'Effect Unit', 'Other'
];

const ComboSelect = ({ value, options, onChange, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="relative">
      <input
        type="text"
        value={open ? search : value}
        readOnly={!open}
        onChange={(e) => setSearch(e.target.value)}
        onBlur={() => setTimeout(() => { setOpen(false); setSearch(''); }, 150)}
        onClick={() => setOpen(prev => !prev)}
        className={`${inputCls} cursor-pointer pr-8 ${className}`}
      />
      <ChevronDown
        size={16}
        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      />
      {open && (
        <ul className="absolute z-30 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden">
          {filtered.map(opt => (
            <li
              key={opt}
              onMouseDown={() => { onChange(opt); setOpen(false); setSearch(''); }}
              className={`px-3 py-2 cursor-pointer text-sm transition-colors
                ${value === opt
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium'
                  : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
            >
              {opt}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-zinc-400 dark:text-zinc-500 italic">No matches</li>
          )}
        </ul>
      )}
    </div>
  );
};

const Intake = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const phoneInputRef = useRef(null);
  useEffect(() => {
    if (phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  }, []);

  const [formData, setFormData] = useState({
    clientName: '',
    companyName: '',
    phones: [{ number: '', type: 'Cell', extension: '' }],
    primaryNotification: 'Phone',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    brand: '',
    model: '',
    modelVersion: '',
    unitType: 'Receiver',
    serial: '',
    accessoriesIncluded: '',
    issue: '',
    priority: 'normal',
    isOnSite: false,
    isShippedIn: false,
    shippingCarrier: '',
    boxHeight: '',
    boxLength: '',
    boxWidth: '',
    poNumber: '',
    isTaxExempt: false
  });

  const [showFeeModal, setShowFeeModal] = useState(false);
  const [customFee, setCustomFee] = useState(89);
  const [clientSmsOptedIn, setClientSmsOptedIn] = useState(false);
  const [showOptInModal, setShowOptInModal] = useState(false);
  const [optInRepairId, setOptInRepairId] = useState(null);
  const [optInClientId, setOptInClientId] = useState(null);
  const [optInSending, setOptInSending] = useState(false);
  const [submittedOnce, setSubmittedOnce] = useState(false);

  const fieldError = (val) =>
    submittedOnce && !val?.trim() ? 'border-red-500 ring-1 ring-red-500' : '';

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
    if (phone.length >= 10) {
      try {
        const clients = await getClients(phone);
        if (clients.length > 0) {
          const client = clients[0];
          const fullClient = await getClient(client.id);
          setFormData(prev => ({
            ...prev,
            clientName: fullClient.name,
            companyName: fullClient.companyName || '',
            email: fullClient.email || '',
            primaryNotification: fullClient.primaryNotification || 'Phone',
            address: fullClient.address || '',
            city: fullClient.city || '',
            state: fullClient.state || '',
            zip: fullClient.zip || '',
            isTaxExempt: fullClient.taxExempt || false,
          }));
          setClientSmsOptedIn(fullClient.smsOptedIn || false);
        }
      } catch (error) {
        console.error("Error looking up client:", error);
      }
    }
  };

  const handlePhoneChange = (index, field, value) => {
    const newPhones = [...formData.phones];
    newPhones[index][field] = value;
    setFormData(prev => ({ ...prev, phones: newPhones }));
    if (field === 'number') {
      lookupClientByPhone(value);
    }
  };

  const addPhone = () => {
    setFormData(prev => ({
      ...prev,
      phones: [...prev.phones, { number: '', type: 'Cell', extension: '' }]
    }));
  };

  const removePhone = (index) => {
    if (formData.phones.length > 1) {
      setFormData(prev => ({
        ...prev,
        phones: prev.phones.filter((_, i) => i !== index)
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setFormData(prev => {
      const newData = { ...prev, [name]: val };
      if (name === 'email' && !val && prev.primaryNotification === 'Email') {
        newData.primaryNotification = 'Phone';
      }
      return newData;
    });

    if (name === 'zip') {
      fetchZipInfo(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmittedOnce(true);

    const missing =
      !formData.phones[0].number?.trim() ||
      !formData.clientName?.trim() ||
      !formData.address?.trim() ||
      !formData.zip?.trim() ||
      !formData.city?.trim() ||
      !formData.state?.trim() ||
      !formData.brand?.trim() ||
      !formData.model?.trim() ||
      !formData.issue?.trim();

    if (missing) return;

    if (formData.priority === 'normal' && !formData.isShippedIn && !formData.isOnSite) {
      setShowFeeModal(true);
      return;
    }

    await createTicket(false, 0);
  };

  const createTicket = async (feeCollected, feeAmount = 0) => {
    setShowFeeModal(false);
    try {
      let clientId;
      let clientName = formData.clientName;

      const primaryPhone = formData.phones[0].number;
      const existingClients = await getClients(primaryPhone);
      let client = existingClients.find(c => c.phone === primaryPhone) || existingClients[0];

      if (client) {
        clientId = client.id;
        await updateClient(client.id, {
          name: formData.clientName,
          companyName: formData.companyName,
          phones: formData.phones,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          primaryNotification: formData.primaryNotification
        });
      } else {
        const newClient = await createClient({
          name: formData.clientName,
          companyName: formData.companyName,
          phones: formData.phones,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          primaryNotification: formData.primaryNotification
        });
        clientId = newClient.id;
        clientName = newClient.name;
      }

      const repairData = {
        clientId: clientId,
        clientName: clientName,
        brand: formData.brand,
        model: formData.model,
        modelVersion: formData.modelVersion,
        unitType: formData.unitType,
        serial: formData.serial,
        accessoriesIncluded: formData.accessoriesIncluded,
        issue: formData.issue,
        status: 'queued',
        priority: formData.priority,
        technician: 'Unassigned',
        diagnosticFeeCollected: feeCollected,
        diagnosticFee: feeCollected ? feeAmount : 0,
        rushFee: formData.priority === 'rush' ? 100 : 0,
        onSiteFee: formData.isOnSite ? 125 : 0,
        isOnSite: formData.isOnSite,
        isShippedIn: formData.isShippedIn,
        shippingCarrier: formData.isShippedIn ? formData.shippingCarrier : null,
        boxHeight: formData.isShippedIn ? formData.boxHeight : null,
        boxLength: formData.isShippedIn ? formData.boxLength : null,
        boxWidth: formData.isShippedIn ? formData.boxWidth : null,
        checkedInBy: user?.name,
        poNumber: formData.poNumber || null,
        isTaxExempt: formData.isTaxExempt
      };

      const ticket = await createRepair(repairData);

      if (formData.primaryNotification === 'Text' && !clientSmsOptedIn) {
        setOptInRepairId(ticket.id);
        setOptInClientId(clientId);
        setShowOptInModal(true);
        return;
      }

      navigate(`/repair/${ticket.id}`, { state: { fromIntake: true } });
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert("Failed to create ticket. See console.");
    }
  };

  return (
    <div className="max-w-7xl">
      <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white">New Repair Intake</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">

          {/* ── Left Column: Client Information ── */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm dark:shadow-none space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-500">Client Information</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isTaxExempt"
                  checked={formData.isTaxExempt}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-amber-600 focus:ring-zinc-500"
                />
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">Tax Exempt</span>
              </label>
            </div>

            {/* Phone Numbers */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Phone Numbers <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addPhone}
                  className="text-xs flex items-center gap-1 text-amber-600 dark:text-amber-500 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                >
                  <Plus size={14} /> Add Phone
                </button>
              </div>
              {formData.phones.map((phone, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <input
                      ref={index === 0 ? phoneInputRef : null}
                      value={phone.number}
                      onChange={(e) => handlePhoneChange(index, 'number', e.target.value)}
                      placeholder={index === 0 ? "Enter phone to find client..." : "Additional phone number"}
                      className={`${inputCls} ${index === 0 ? (submittedOnce && !phone.number?.trim() ? 'border-red-500 ring-1 ring-red-500' : '') : ''}`}
                    />
                  </div>
                  <div className="w-24">
                    <ComboSelect
                      value={phone.type}
                      options={['Cell', 'Work', 'Home', 'Fax', 'Other']}
                      onChange={(val) => handlePhoneChange(index, 'type', val)}
                    />
                  </div>
                  <div className="w-20">
                    <input
                      value={phone.extension}
                      onChange={(e) => handlePhoneChange(index, 'extension', e.target.value)}
                      placeholder="Ext."
                      className={inputCls}
                    />
                  </div>
                  {formData.phones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePhone(index)}
                      className="text-zinc-500 hover:text-red-500 transition-colors px-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Company + Full Name side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Company (Optional)</label>
                <input name="companyName" value={formData.companyName} onChange={handleChange}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input name="clientName" value={formData.clientName} onChange={handleChange}
                  className={`${inputCls} ${fieldError(formData.clientName)}`} />
              </div>
            </div>

            {/* Email + Notification */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Email Address</label>
                <input name="email" value={formData.email} onChange={handleChange}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Notification</label>
                <ComboSelect
                  value={formData.primaryNotification}
                  options={['Phone', 'Text', ...(formData.email ? ['Email'] : [])]}
                  onChange={(val) => setFormData(prev => ({ ...prev, primaryNotification: val }))}
                />
              </div>
            </div>

            {/* Street Address */}
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input name="address" value={formData.address} onChange={handleChange} placeholder="123 Audio Lane"
                className={`${inputCls} ${fieldError(formData.address)}`} />
            </div>

            {/* Zip + City + State */}
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Zip <span className="text-red-500">*</span>
                </label>
                <input name="zip" value={formData.zip} onChange={handleChange} placeholder="90210" maxLength={5}
                  className={`${inputCls} ${fieldError(formData.zip)}`} />
              </div>
              <div className="col-span-3">
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input name="city" value={formData.city} onChange={handleChange}
                  className={`${inputCls} ${fieldError(formData.city)}`} />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <input name="state" value={formData.state} onChange={handleChange} maxLength={2}
                  className={`${inputCls} ${fieldError(formData.state)}`} />
              </div>
            </div>
          </div>

          {/* ── Right Column: Unit Details ── */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm dark:shadow-none space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-500">Unit Details</h3>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isOnSite"
                    checked={formData.isOnSite}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-amber-600 focus:ring-zinc-500"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">On Site</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isShippedIn"
                    checked={formData.isShippedIn}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-amber-600 focus:ring-zinc-500"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">Shipment</span>
                </label>
              </div>
            </div>

            {/* Shipment Details (conditional) */}
            {formData.isShippedIn && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-3">
                <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Shipment Details</h4>
                <div>
                  <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Carrier</label>
                  <input
                    name="shippingCarrier"
                    value={formData.shippingCarrier}
                    onChange={handleChange}
                    placeholder="e.g. UPS, FedEx, USPS"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Box Dimensions (inches)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" name="boxLength" value={formData.boxLength} onChange={handleChange} placeholder="Length" className={inputCls} />
                    <input type="number" name="boxWidth" value={formData.boxWidth} onChange={handleChange} placeholder="Width" className={inputCls} />
                    <input type="number" name="boxHeight" value={formData.boxHeight} onChange={handleChange} placeholder="Height" className={inputCls} />
                  </div>
                </div>
              </div>
            )}

            {/* Unit Type */}
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Unit Type</label>
              <ComboSelect
                value={formData.unitType}
                options={UNIT_TYPES}
                onChange={(val) => setFormData(prev => ({ ...prev, unitType: val }))}
              />
            </div>

            {/* Brand + Model */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Brand / Make <span className="text-red-500">*</span>
                </label>
                <input name="brand" value={formData.brand} onChange={handleChange} placeholder="e.g. Marantz"
                  className={`${inputCls} ${fieldError(formData.brand)}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Model <span className="text-red-500">*</span>
                </label>
                <input name="model" value={formData.model} onChange={handleChange} placeholder="e.g. 2270"
                  className={`${inputCls} ${fieldError(formData.model)}`} />
              </div>
            </div>

            {/* Model Version + Serial */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Model Version (Optional)</label>
                <input name="modelVersion" value={formData.modelVersion} onChange={handleChange} placeholder="e.g. MKII, Reissue"
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Serial Number</label>
                <input name="serial" value={formData.serial} onChange={handleChange}
                  className={inputCls} />
              </div>
            </div>

            {/* Accessories */}
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Accessories Included (Optional)</label>
              <input name="accessoriesIncluded" value={formData.accessoriesIncluded} onChange={handleChange}
                placeholder="e.g. Power Cord, Remote, Case"
                className={inputCls} />
            </div>

            {/* Reported Issue */}
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Reported Issue <span className="text-red-500">*</span>
              </label>
              <textarea name="issue" value={formData.issue} onChange={handleChange} rows={4}
                className={`${inputCls} ${fieldError(formData.issue)} resize-none`} />
            </div>

            {/* Priority + PO# */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Priority</label>
                <ComboSelect
                  value={formData.priority === 'normal' ? 'Normal' : formData.priority === 'rush' ? 'Rush (+Fee)' : 'Warranty'}
                  options={['Normal', 'Rush (+Fee)', 'Warranty']}
                  onChange={(val) => setFormData(prev => ({ ...prev, priority: val === 'Normal' ? 'normal' : val === 'Rush (+Fee)' ? 'rush' : 'warranty' }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">PO # (Optional)</label>
                <input name="poNumber" value={formData.poNumber} onChange={handleChange} placeholder="Purchase Order #"
                  className={inputCls} />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-5">
          <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors">
            <Save size={20} />
            Check In Unit
          </button>
        </div>
      </form>

      {/* SMS Opt-In Modal */}
      {showOptInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">SMS Opt-In</h3>
            <p className="text-zinc-600 dark:text-zinc-300 mb-6">
              This client prefers text notifications. Would you like to send an opt-in text to{' '}
              <span className="font-medium text-zinc-900 dark:text-white">{formData.phones[0]?.number}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowOptInModal(false);
                  navigate(`/repair/${optInRepairId}`, { state: { fromIntake: true } });
                }}
                disabled={optInSending}
                className="px-4 py-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={async () => {
                  setOptInSending(true);
                  try {
                    await sendOptInText(optInClientId);
                  } catch (err) {
                    console.error('Failed to send opt-in text:', err);
                  }
                  setOptInSending(false);
                  setShowOptInModal(false);
                  navigate(`/repair/${optInRepairId}`, { state: { fromIntake: true } });
                }}
                disabled={optInSending}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {optInSending ? 'Sending...' : 'Send Opt-In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fee Collection Modal */}
      {showFeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Collect Diagnostic Fee</h3>
            <p className="text-zinc-600 dark:text-zinc-300 mb-6">
              For normal priority repairs, a diagnostic fee is standard.
              Please confirm the amount and collection status.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Fee Amount ($)
              </label>
              <input
                type="number"
                value={customFee}
                onChange={(e) => setCustomFee(parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => createTicket(false, 0)}
                className="px-4 py-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                No, Not Collected
              </button>
              <button
                onClick={() => createTicket(true, customFee)}
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
