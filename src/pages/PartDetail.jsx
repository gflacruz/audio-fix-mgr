import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X, Edit, Trash2, MapPin, Package, Upload, DollarSign } from 'lucide-react';
import { getPart, updatePart, deletePart } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const PartDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    retailPrice: '',
    wholesalePrice: '',
    quantityInStock: '',
    aliases: '',
    location: '',
    description: '',
    image: null,
    previewUrl: null
  });

  useEffect(() => {
    loadPart();
  }, [id]);

  const loadPart = async () => {
    try {
      setLoading(true);
      const data = await getPart(id);
      setPart(data);
      initializeForm(data);
    } catch (error) {
      console.error('Failed to load part:', error);
      alert('Failed to load part details.');
      navigate('/inventory');
    } finally {
      setLoading(false);
    }
  };

  const initializeForm = (data) => {
    setFormData({
      name: data.name,
      retailPrice: data.retailPrice,
      wholesalePrice: data.wholesalePrice,
      quantityInStock: data.quantityInStock,
      aliases: data.aliases ? data.aliases.join(', ') : '',
      location: data.location || '',
      description: data.description || '',
      image: null,
      previewUrl: data.imageUrl || null
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        image: file,
        previewUrl: URL.createObjectURL(file)
      });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this part? This cannot be undone.')) return;
    try {
      await deletePart(id);
      navigate('/inventory');
    } catch (error) {
      alert('Failed to delete part: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('retailPrice', parseFloat(formData.retailPrice) || 0);
      data.append('wholesalePrice', parseFloat(formData.wholesalePrice) || 0);
      data.append('quantityInStock', parseInt(formData.quantityInStock) || 0);
      data.append('location', formData.location);
      data.append('description', formData.description);
      
      const aliasArray = formData.aliases.split(',').map(a => a.trim()).filter(a => a);
      data.append('aliases', JSON.stringify(aliasArray));

      if (formData.image) {
        data.append('image', formData.image);
      }

      const updatedPart = await updatePart(id, data);
      setPart(updatedPart);
      initializeForm(updatedPart);
      setIsEditing(false);
    } catch (error) {
      alert('Failed to save part: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center text-zinc-500">
        Loading part details...
      </div>
    );
  }

  if (!part) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto text-zinc-900 dark:text-zinc-100">
      <div className="mb-6">
        <button 
          onClick={() => navigate('/inventory')}
          className="flex items-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Inventory
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm dark:shadow-xl">
        {/* Header */}
        <div className="bg-zinc-50 dark:bg-zinc-950 px-8 py-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
              {isEditing ? 'Edit Part' : part.name}
            </h1>
            {!isEditing && (
              <div className="flex gap-4 mt-2 text-zinc-500 dark:text-zinc-400 text-sm">
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {part.location || 'No Location'}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  part.quantityInStock > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {part.quantityInStock} in stock
                </span>
              </div>
            )}
          </div>
          
          {isAdmin && !isEditing && (
            <div className="flex gap-3">
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm dark:shadow-none"
              >
                <Edit size={18} />
                Edit
              </button>
              <button 
                onClick={handleDelete}
                className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-red-200 dark:border-red-900/30"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-8">
          {isEditing ? (
            /* Edit Form */
            <form onSubmit={handleSubmit} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Image & Basic Info */}
                  <div className="space-y-6">
                     <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">Part Image</label>
                         <div className="space-y-3">
                            {formData.previewUrl ? (
                                <div className="relative w-full aspect-video bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden group">
                                     <img src={formData.previewUrl} alt="Preview" className="w-full h-full object-contain" />
                                     <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, image: null, previewUrl: null})}
                                        className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 text-white p-1.5 rounded-full transition-colors"
                                     >
                                        <X size={16} />
                                     </button>
                                </div>
                            ) : (
                                <div className="w-full aspect-video bg-zinc-50 dark:bg-zinc-950 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-lg flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500">
                                    <Package size={48} className="mb-2 opacity-20" />
                                    <span>No image selected</span>
                                </div>
                            )}
                            
                            <label className="flex items-center justify-center w-full px-4 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 rounded-lg cursor-pointer transition-colors text-sm text-zinc-900 dark:text-white shadow-sm dark:shadow-none">
                                <Upload size={16} className="mr-2" />
                                {formData.previewUrl ? 'Change Image' : 'Upload Image'}
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                         </div>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Part Name</label>
                        <input 
                          type="text" 
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                        />
                     </div>
                  </div>

                  {/* Right Column: Details */}
                  <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Location / Bin</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 dark:text-zinc-600" size={16} />
                            <input 
                              type="text" 
                              value={formData.location}
                              onChange={(e) => setFormData({...formData, location: e.target.value})}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Quantity</label>
                          <input 
                            type="number" 
                            min="0"
                            required
                            value={formData.quantityInStock}
                            onChange={(e) => setFormData({...formData, quantityInStock: e.target.value})}
                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Retail Price ($)</label>
                          <div className="relative">
                             <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 dark:text-zinc-600" size={14} />
                             <input 
                                type="number" 
                                step="0.01"
                                min="0"
                                value={formData.retailPrice}
                                onChange={(e) => setFormData({...formData, retailPrice: e.target.value})}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                              />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Wholesale Price ($)</label>
                          <div className="relative">
                             <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 dark:text-zinc-600" size={14} />
                             <input 
                                type="number" 
                                step="0.01"
                                min="0"
                                value={formData.wholesalePrice}
                                onChange={(e) => setFormData({...formData, wholesalePrice: e.target.value})}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                              />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Description</label>
                        <textarea 
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          rows="4"
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Aliases (comma separated)</label>
                        <input 
                          type="text"
                          value={formData.aliases}
                          onChange={(e) => setFormData({...formData, aliases: e.target.value})}
                          placeholder="e.g. Cap, Capacitor 10uF"
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                  </div>
               </div>

               <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <button 
                    type="button" 
                    onClick={() => {
                        setIsEditing(false);
                        initializeForm(part); // Reset changes
                    }}
                    className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium disabled:opacity-50"
                  >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
               </div>
            </form>
          ) : (
            /* View Details */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               {/* Left: Image */}
               <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex items-center justify-center min-h-[300px]">
                  {part.imageUrl ? (
                      <img src={part.imageUrl} alt={part.name} className="w-full h-auto object-contain max-h-[400px]" />
                  ) : (
                      <div className="flex flex-col items-center text-zinc-400 dark:text-zinc-600">
                          <Package size={64} className="mb-4 opacity-20" />
                          <span>No Image Available</span>
                      </div>
                  )}
               </div>

               {/* Right: Info */}
               <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none">
                          <div className="text-zinc-500 text-sm mb-1">Retail Price</div>
                          <div className="text-2xl font-mono text-emerald-600 dark:text-emerald-400">${part.retailPrice.toFixed(2)}</div>
                      </div>
                      <div className="bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none">
                          <div className="text-zinc-500 text-sm mb-1">Wholesale Price</div>
                          <div className="text-2xl font-mono text-zinc-700 dark:text-zinc-300">${part.wholesalePrice.toFixed(2)}</div>
                      </div>
                  </div>

                  <div>
                      <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Description</h3>
                      <div className="text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-950/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800/50 min-h-[100px]">
                          {part.description || 'No description provided.'}
                      </div>
                  </div>

                  {part.aliases && part.aliases.length > 0 && (
                      <div>
                          <h3 className="text-sm font-medium text-zinc-500 mb-3 uppercase tracking-wider">Aliases / Keywords</h3>
                          <div className="flex flex-wrap gap-2">
                              {part.aliases.map((alias, i) => (
                                  <span key={i} className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-sm">
                                      {alias}
                                  </span>
                              ))}
                          </div>
                      </div>
                  )}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartDetail;
