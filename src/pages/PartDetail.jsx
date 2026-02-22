import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, X, Edit2, Trash2, MapPin, Package, Upload,
  Tag, TrendingUp, FileText, MessageSquare, Hash, Truck
} from 'lucide-react';
import { getPart, updatePart, deletePart } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/Modal';
import { format } from 'date-fns';

const PartDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    nomenclature: '',
    category: '',
    retailPrice: '',
    wholesalePrice: '',
    quantityInStock: '',
    lowLimit: '',
    onOrder: '',
    aliases: '',
    location: '',
    description: '',
    bestPriceQuality: '',
    unitOfIssue: '',
    lastSupplier: '',
    supplySource: '',
    remarks: '',
    issuedLifetime: '',
    lastUsedDate: '',
    image: null,
    previewUrl: null,
  });

  useEffect(() => { loadPart(); }, [id]);

  const loadPart = async () => {
    try {
      setLoading(true);
      const data = await getPart(id);
      setPart(data);
      initializeForm(data);
    } catch (err) {
      console.error('Failed to load part:', err);
      alert('Failed to load part details.');
      navigate('/inventory');
    } finally {
      setLoading(false);
    }
  };

  const initializeForm = (data) => {
    setFormData({
      name: data.name,
      nomenclature: data.nomenclature || '',
      category: data.category || '',
      retailPrice: data.retailPrice,
      wholesalePrice: data.wholesalePrice,
      quantityInStock: data.quantityInStock,
      lowLimit: data.lowLimit || 0,
      onOrder: data.onOrder || 0,
      aliases: data.aliases ? data.aliases.map(a => typeof a === 'string' ? a : a.alias).join(', ') : '',
      location: data.location || '',
      description: data.description || '',
      bestPriceQuality: data.bestPriceQuality || '',
      unitOfIssue: data.unitOfIssue || '',
      lastSupplier: data.lastSupplier || '',
      supplySource: data.supplySource || '',
      remarks: data.remarks || '',
      issuedLifetime: data.issuedLifetime ?? 0,
      lastUsedDate: data.lastUsedDate ? format(new Date(data.lastUsedDate), 'yyyy-MM-dd') : '',
      image: null,
      previewUrl: data.imageUrl || null,
    });
  };

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setFormData(prev => ({ ...prev, image: file, previewUrl: URL.createObjectURL(file) }));
  };

  const handleDelete = async () => {
    try {
      await deletePart(id);
      navigate('/inventory');
    } catch (err) {
      alert('Failed to delete part: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('nomenclature', formData.nomenclature);
      data.append('retailPrice', parseFloat(formData.retailPrice) || 0);
      data.append('wholesalePrice', parseFloat(formData.wholesalePrice) || 0);
      data.append('quantityInStock', parseInt(formData.quantityInStock) || 0);
      data.append('lowLimit', parseInt(formData.lowLimit) || 0);
      data.append('onOrder', parseInt(formData.onOrder) || 0);
      data.append('location', formData.location);
      data.append('description', formData.description);
      data.append('bestPriceQuality', formData.bestPriceQuality);
      data.append('unitOfIssue', formData.unitOfIssue);
      data.append('lastSupplier', formData.lastSupplier);
      data.append('supplySource', formData.supplySource);
      data.append('remarks', formData.remarks);
      data.append('category', formData.category);
      data.append('issuedLifetime', formData.issuedLifetime !== '' ? parseInt(formData.issuedLifetime) : '');
      data.append('lastUsedDate', formData.lastUsedDate || '');
      const aliasArray = formData.aliases.split(',').map(a => a.trim()).filter(a => a);
      data.append('aliases', JSON.stringify(aliasArray));
      if (formData.image) data.append('image', formData.image);

      const updatedPart = await updatePart(id, data);
      setPart(updatedPart);
      initializeForm(updatedPart);
      setIsEditing(false);
    } catch (err) {
      alert('Failed to save part: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Shared style helpers
  const lbl = "block text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1";
  const inp = "w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-1.5 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none text-sm transition-colors duration-200";

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-zinc-500 text-sm">
        <span className="animate-pulse">▋</span> Loading part...
      </div>
    );
  }

  if (!part) return null;

  const isLowStock = part.quantityInStock <= part.lowLimit && part.lowLimit > 0;
  const isOutOfStock = part.quantityInStock === 0;

  return (
    <div className="p-6 max-w-6xl mx-auto pb-24">
      {/* Back nav */}
      <div className="mb-5">
        <button
          onClick={() => navigate('/inventory')}
          className="flex items-center gap-2 text-zinc-500 hover:text-amber-500 transition-colors text-sm"
        >
          <ArrowLeft size={16} /> Back to Inventory
        </button>
      </div>

      {/* Main panel */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm dark:shadow-xl">

        {/* ── Header ── */}
        <div className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            {/* Title block */}
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => set('name', e.target.value)}
                  className="text-2xl font-bold bg-transparent border-b-2 border-amber-500 text-zinc-900 dark:text-white focus:outline-none w-full pb-0.5"
                                 />
              ) : (
                <h1
                  className="text-2xl font-bold text-zinc-900 dark:text-white"
                                 >
                  {part.name}
                </h1>
              )}
              <div className="flex items-center flex-wrap gap-2 mt-2">
                {/* Nomenclature */}
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.nomenclature}
                    onChange={(e) => set('nomenclature', e.target.value)}
                    placeholder="NOMENCLATURE-CODE"
                    className="text-xs bg-transparent border-b border-zinc-400 dark:border-zinc-600 focus:border-amber-500 focus:outline-none text-zinc-600 dark:text-zinc-400 uppercase tracking-widest pb-0.5 w-44"
                                     />
                ) : (
                  part.nomenclature && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-300 uppercase tracking-widest">{part.nomenclature}</span>
                  )
                )}

                {/* Category */}
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => set('category', e.target.value)}
                    placeholder="Category"
                    className="text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded px-2 py-0.5 text-amber-700 dark:text-amber-400 focus:outline-none focus:border-amber-500 w-32"
                  />
                ) : (
                  part.category && (
                    <span className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-xs font-medium">
                      {part.category}
                    </span>
                  )
                )}

                {/* Stock status badge — view only */}
                {!isEditing && (
                  <span className={`px-2 py-0.5 rounded text-xs border ${
                    isOutOfStock
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400'
                      : isLowStock
                        ? 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800/60 text-yellow-600 dark:text-yellow-400'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'IN STOCK'}
                  </span>
                )}
              </div>
            </div>

            {/* Admin action buttons */}
            {isAdmin && (
              <div className="flex gap-2 shrink-0">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setIsEditing(false); initializeForm(part); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded text-sm transition-colors"
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      form="part-form"
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded text-sm font-semibold transition-colors"
                    >
                      <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 rounded text-sm transition-colors"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDeleteConfirmText(''); setShowDeleteModal(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded text-sm transition-colors"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <form id="part-form" onSubmit={handleSubmit}>
          <div className="p-6 flex gap-6">

            {/* ── Left Column ── */}
            <div className="w-56 lg:w-64 shrink-0 space-y-4">

              {/* Image panel */}
              <div className="relative bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden aspect-square">
                {formData.previewUrl ? (
                  <img src={formData.previewUrl} alt={part.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-400">
                    <Package size={44} className="mb-2 opacity-50" />
                    <span className="text-xs">NO IMAGE</span>
                  </div>
                )}
                {isEditing && (
                  <>
                    <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 cursor-pointer opacity-0 hover:opacity-100 transition-opacity gap-1">
                      <Upload size={22} className="text-amber-400" />
                      <span className="text-xs text-amber-400">UPLOAD</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                    {formData.previewUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image: null, previewUrl: null }))}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-red-700 text-white p-1 rounded transition-colors"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Aliases */}
              <div className="border-l-2 border-amber-500 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-r-lg pl-3 pr-3 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag size={11} className="text-amber-500" />
                  <span className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-500 font-bold">Aliases</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.aliases}
                    onChange={(e) => set('aliases', e.target.value)}
                    placeholder="cap, 100uf, elcap..."
                    className={inp}
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {part.aliases && part.aliases.length > 0 ? (
                      part.aliases.map((aliasObj, i) => {
                        const text = typeof aliasObj === 'string' ? aliasObj : aliasObj.alias;
                        const linkedId = typeof aliasObj === 'string' ? null : aliasObj.linkedPartId;
                        return linkedId ? (
                          <span
                            key={i}
                            onClick={() => navigate(`/inventory/${linkedId}`)}
                            className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-xs cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
                            title="Go to linked part"
                          >
                            {text}
                          </span>
                        ) : (
                          <span key={i} className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-200 px-2 py-0.5 rounded text-xs">
                            {text}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-600 text-xs italic">none</span>
                    )}
                  </div>
                )}
              </div>

              {/* Usage Stats */}
              <div className="border-l-2 border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-r-lg pl-3 pr-3 py-3 space-y-3">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={11} className="text-zinc-500" />
                  <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-300 font-bold">Usage Stats</span>
                </div>
                <div>
                  <div className={lbl}>Issued Lifetime</div>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={formData.issuedLifetime}
                      onChange={(e) => set('issuedLifetime', e.target.value)}
                      className={inp}
                    />
                  ) : (
                    <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {part.issuedLifetime}
                      <span className="text-xs text-zinc-500 ml-1 font-normal">{part.unitOfIssue || 'qty'}</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className={lbl}>Last Used</div>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.lastUsedDate}
                      onChange={(e) => set('lastUsedDate', e.target.value)}
                      className={inp}
                    />
                  ) : (
                    <div className="text-sm text-zinc-700 dark:text-zinc-100">
                      {part.lastUsedDate
                        ? format(new Date(part.lastUsedDate), 'MMM d, yyyy')
                        : <span className="text-zinc-400 dark:text-zinc-500 italic text-xs">Never used</span>
                      }
                    </div>
                  )}
                </div>
              </div>

            </div>{/* end left column */}

            {/* ── Right Column ── */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* INVENTORY & PRICING */}
              <div className="border-l-2 border-amber-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-r-lg overflow-hidden">
                <div className="bg-amber-50/60 dark:bg-amber-950/20 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                  <Package size={13} className="text-amber-600 dark:text-amber-500" />
                  <span className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-500 font-bold">Inventory & Pricing</span>
                </div>
                <div className="p-4 space-y-4">

                  {/* 5-col stat strip */}
                  <div className="grid grid-cols-5 divide-x divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-950">
                    {/* QTY */}
                    <div className="p-3">
                      <div className={lbl}>Quantity</div>
                      {isEditing ? (
                        <input
                          type="number" min="0" required
                          value={formData.quantityInStock}
                          onChange={(e) => set('quantityInStock', e.target.value)}
                          className="w-full bg-transparent border-b border-zinc-400 dark:border-zinc-600 focus:border-amber-500 focus:outline-none text-zinc-900 dark:text-white text-xl font-bold text-center pb-0.5"
                        />
                      ) : (
                        <div className={`text-2xl font-bold ${
                          isOutOfStock ? 'text-red-500 dark:text-red-400' : isLowStock ? 'text-yellow-600 dark:text-yellow-400' : 'text-zinc-900 dark:text-white'
                        }`}>
                          {part.quantityInStock}
                        </div>
                      )}
                    </div>
                    {/* LOW LIMIT */}
                    <div className="p-3">
                      <div className={lbl}>Low Limit</div>
                      {isEditing ? (
                        <input
                          type="number" min="0"
                          value={formData.lowLimit}
                          onChange={(e) => set('lowLimit', e.target.value)}
                          className="w-full bg-transparent border-b border-zinc-400 dark:border-zinc-600 focus:border-amber-500 focus:outline-none text-zinc-900 dark:text-white text-xl font-bold text-center pb-0.5"
                        />
                      ) : (
                        <div className={`text-2xl font-bold ${isLowStock ? 'text-red-500 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-300'}`}>
                          {part.lowLimit}
                        </div>
                      )}
                    </div>
                    {/* ON ORDER */}
                    <div className="p-3">
                      <div className={lbl}>On Order</div>
                      {isEditing ? (
                        <input
                          type="number" min="0"
                          value={formData.onOrder}
                          onChange={(e) => set('onOrder', e.target.value)}
                          className="w-full bg-transparent border-b border-zinc-400 dark:border-zinc-600 focus:border-amber-500 focus:outline-none text-blue-600 dark:text-blue-400 text-xl font-bold text-center pb-0.5"
                        />
                      ) : (
                        <div className={`text-2xl font-bold ${part.onOrder > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-600'}`}>
                          {part.onOrder}
                        </div>
                      )}
                    </div>
                    {/* UNIT OF ISSUE */}
                    <div className="p-3">
                      <div className={lbl}>Unit of Issue</div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.unitOfIssue}
                          placeholder="ea"
                          onChange={(e) => set('unitOfIssue', e.target.value)}
                          className="w-full bg-transparent border-b border-zinc-400 dark:border-zinc-600 focus:border-amber-500 focus:outline-none text-zinc-700 dark:text-zinc-300 text-sm text-center pb-0.5"
                        />
                      ) : (
                        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-100 pt-1">
                          {part.unitOfIssue || <span className="text-zinc-400 dark:text-zinc-500 font-normal">ea</span>}
                        </div>
                      )}
                    </div>
                    {/* BEST SOURCE */}
                    <div className="p-3">
                      <div className={lbl}>Best Source</div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.bestPriceQuality}
                          placeholder="—"
                          onChange={(e) => set('bestPriceQuality', e.target.value)}
                          className="w-full bg-transparent border-b border-zinc-400 dark:border-zinc-600 focus:border-amber-500 focus:outline-none text-zinc-700 dark:text-zinc-300 text-xs text-center pb-0.5"
                        />
                      ) : (
                        <div className="text-xs text-amber-600 dark:text-amber-300 pt-1 truncate">
                          {part.bestPriceQuality || <span className="text-zinc-400 dark:text-zinc-500">—</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                      <div className={lbl}>Retail Price</div>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-400 dark:text-zinc-500">$</span>
                          <input
                            type="number" step="0.01" min="0"
                            value={formData.retailPrice}
                            onChange={(e) => set('retailPrice', e.target.value)}
                            className="bg-transparent border-b border-zinc-400 dark:border-zinc-600 focus:border-amber-500 focus:outline-none text-emerald-600 dark:text-emerald-400 text-2xl font-bold flex-1 text-right pb-0.5"
                          />
                        </div>
                      ) : (
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          ${parseFloat(part.retailPrice).toFixed(2)}
                          <span className="text-xs text-zinc-400 ml-1 font-normal font-sans">/{part.unitOfIssue || 'ea'}</span>
                        </div>
                      )}
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                      <div className={lbl}>Wholesale</div>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-400 dark:text-zinc-500">$</span>
                          <input
                            type="number" step="0.01" min="0"
                            value={formData.wholesalePrice}
                            onChange={(e) => set('wholesalePrice', e.target.value)}
                            className="bg-transparent border-b border-zinc-400 dark:border-zinc-600 focus:border-amber-500 focus:outline-none text-zinc-700 dark:text-zinc-300 text-2xl font-bold flex-1 text-right pb-0.5"
                          />
                        </div>
                      ) : (
                        <div className="text-2xl font-bold text-zinc-700 dark:text-zinc-100">
                          ${parseFloat(part.wholesalePrice).toFixed(2)}
                          <span className="text-xs text-zinc-400 ml-1 font-normal font-sans">/{part.unitOfIssue || 'ea'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* LOCATION & SUPPLY */}
              <div className="border-l-2 border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-r-lg overflow-hidden">
                <div className="bg-zinc-50 dark:bg-zinc-950/80 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                  <MapPin size={13} className="text-zinc-500" />
                  <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-300 font-bold">Location & Supply</span>
                </div>
                <div className="p-4 grid grid-cols-3 gap-4">
                  <div>
                    <div className={lbl}>
                      <MapPin size={10} className="inline mr-0.5 mb-0.5" /> Bin / Location
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.location}
                        placeholder="A-12"
                        onChange={(e) => set('location', e.target.value)}
                        className={inp}
                      />
                    ) : (
                      <div className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm">
                        {part.location || <span className="text-zinc-400 dark:text-zinc-500 font-normal">—</span>}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className={lbl}>
                      <Truck size={10} className="inline mr-0.5 mb-0.5" /> Last Supplier
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.lastSupplier}
                        onChange={(e) => set('lastSupplier', e.target.value)}
                        className={inp}
                      />
                    ) : (
                      <div className="text-zinc-800 dark:text-zinc-100 text-sm">
                        {part.lastSupplier || <span className="text-zinc-400 dark:text-zinc-500">—</span>}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className={lbl}>
                      <Hash size={10} className="inline mr-0.5 mb-0.5" /> Supply Source
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.supplySource}
                        onChange={(e) => set('supplySource', e.target.value)}
                        className={inp}
                      />
                    ) : (
                      <div className="text-zinc-800 dark:text-zinc-100 text-sm">
                        {part.supplySource || <span className="text-zinc-400 dark:text-zinc-500">—</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div className="border-l-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-r-lg overflow-hidden">
                <div className="bg-zinc-50 dark:bg-zinc-950/80 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                  <FileText size={13} className="text-zinc-400" />
                  <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-300 font-bold">Description</span>
                </div>
                <div className="p-4">
                  {isEditing ? (
                    <textarea
                      value={formData.description}
                      onChange={(e) => set('description', e.target.value)}
                      rows={4}
                      placeholder="Part description..."
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 text-zinc-700 dark:text-zinc-300 text-sm focus:border-amber-500 focus:outline-none resize-none transition-colors duration-200"
                    />
                  ) : (
                    <p className="text-zinc-700 dark:text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
                      {part.description || <span className="text-zinc-400 dark:text-zinc-500 italic">No description provided.</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* REMARKS */}
              <div className="border-l-2 border-yellow-500/60 dark:border-yellow-700/60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-r-lg overflow-hidden">
                <div className="bg-yellow-50/60 dark:bg-yellow-950/20 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                  <MessageSquare size={13} className="text-yellow-600" />
                  <span className="text-xs uppercase tracking-wider text-yellow-700 dark:text-yellow-600 font-bold">Remarks</span>
                </div>
                <div className="p-4">
                  {isEditing ? (
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => set('remarks', e.target.value)}
                      rows={3}
                      placeholder="Notes, warnings, special handling..."
                      className="w-full bg-yellow-50/30 dark:bg-yellow-950/10 border border-yellow-200 dark:border-yellow-900/40 rounded px-3 py-2 text-zinc-700 dark:text-zinc-300 text-sm focus:border-yellow-500 focus:outline-none resize-none transition-colors duration-200 italic"
                    />
                  ) : (
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap italic ${
                      part.remarks ? 'text-zinc-700 dark:text-yellow-100/80' : 'text-zinc-400 dark:text-zinc-500'
                    }`}>
                      {part.remarks || 'No remarks.'}
                    </p>
                  )}
                </div>
              </div>

            </div>{/* end right column */}
          </div>

        </form>
      </div>
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Part"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteConfirmText !== 'DELETE'}
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-sm font-semibold transition-colors"
            >
              <Trash2 size={15} /> Delete Part
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
            <Trash2 size={18} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold">This action cannot be undone.</p>
              <p className="text-zinc-400 text-sm mt-0.5">
                <span className="text-white font-medium">{part.name}</span> will be permanently deleted from inventory.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">
              Type <span className="text-white font-bold">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && deleteConfirmText === 'DELETE' && handleDelete()}
              placeholder="DELETE"
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white focus:border-red-500 focus:outline-none text-sm"
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PartDetail;
