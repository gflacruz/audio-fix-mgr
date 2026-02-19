import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, Plus, Edit, Trash2, X, Save, Upload, Image as ImageIcon, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { getParts, createPart, updatePart, deletePart } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/Modal';

const Inventory = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [parts, setParts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debounceTimer = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, partId: null });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    nomenclature: '',
    category: '',
    retailPrice: '',
    wholesalePrice: '',
    quantityInStock: '',
    aliases: '',
    location: '',
    description: '',
    image: null,
    previewUrl: null
  });

  const loadParts = async (pageToLoad = 1) => {
    // If search is empty, do not fetch parts
    if (!search.trim()) {
        setParts([]);
        setTotalPages(1);
        setLoading(false);
        return;
    }

    try {
      setLoading(true);
      // If we are searching (and it's not a pagination click), we might want to reset page to 1
      // But here we pass pageToLoad explicitly.
      
      const response = await getParts(search, pageToLoad, 50);
      
      // Handle both old array format (safety) and new object format
      if (Array.isArray(response)) {
          setParts(response);
          setTotalPages(1);
      } else {
          setParts(response.data || []);
          setTotalPages(response.pagination?.totalPages || 1);
          setPage(response.pagination?.page || 1);
      }
    } catch (error) {
      console.error('Failed to load parts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce Search Effect
  useEffect(() => {
    if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
    }

    // If search is empty (initial load or cleared), load immediately
    if (!search.trim()) {
        loadParts(1);
        return;
    }

    debounceTimer.current = setTimeout(() => {
        loadParts(1); // Always reset to page 1 on new search
    }, 2000);

    return () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        loadParts(1);
    }
  };

  const handleOpenModal = (part = null) => {
    if (part) {
      setEditingPart(part);
      setFormData({
        name: part.name,
        nomenclature: part.nomenclature || '',
        category: part.category || '',
        retailPrice: part.retailPrice,
        wholesalePrice: part.wholesalePrice,
        quantityInStock: part.quantityInStock,
        aliases: part.aliases.map(a => typeof a === 'string' ? a : a.alias).join(', '),
        location: part.location || '',
        description: part.description || '',
        image: null,
        previewUrl: part.imageUrl || null
      });
    } else {
      setEditingPart(null);
      setFormData({
        name: '',
        nomenclature: '',
        category: '',
        retailPrice: '',
        wholesalePrice: '',
        quantityInStock: '',
        aliases: '',
        location: '',
        description: '',
        image: null,
        previewUrl: null
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPart(null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('nomenclature', formData.nomenclature);
      data.append('retailPrice', parseFloat(formData.retailPrice) || 0);
      data.append('wholesalePrice', parseFloat(formData.wholesalePrice) || 0);
      data.append('quantityInStock', parseInt(formData.quantityInStock) || 0);
      data.append('location', formData.location);
      data.append('description', formData.description);
      data.append('category', formData.category);

      const aliasArray = formData.aliases.split(',').map(a => a.trim()).filter(a => a);
      data.append('aliases', JSON.stringify(aliasArray));

      if (formData.image) {
        data.append('image', formData.image);
      }

      if (editingPart) {
        await updatePart(editingPart.id, data);
        loadParts(page);
      } else {
        await createPart(data);
        loadParts(1);
      }
      handleCloseModal();
    } catch (error) {
      alert('Failed to save part: ' + error.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.partId) return;
    try {
      await deletePart(deleteModal.partId);
      loadParts(page);
      setDeleteModal({ isOpen: false, partId: null });
    } catch (error) {
      alert('Failed to delete part: ' + error.message);
    }
  };

  const handleDelete = (id) => {
    setDeleteModal({ isOpen: true, partId: id });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto text-zinc-900 dark:text-zinc-100">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="text-amber-600 dark:text-amber-500" size={32} />
            Inventory Manager
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage parts, pricing, and aliases</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Add New Part
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
        <input 
          ref={searchInputRef}
          type="text"
          placeholder="Search parts by name or alias..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-amber-500 transition-colors shadow-sm dark:shadow-none"
        />
      </div>

      {/* Parts Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm dark:shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Part Name</th>
              <th className="px-6 py-4 font-medium">Category</th>
              <th className="px-6 py-4 font-medium">Location</th>
              <th className="px-6 py-4 font-medium">In Stock</th>
              <th className="px-6 py-4 font-medium">Retail Price</th>
              <th className="px-6 py-4 font-medium">Wholesale Price</th>
              <th className="px-6 py-4 font-medium">Aliases</th>
              {isAdmin && <th className="px-6 py-4 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading ? (
              <tr><td colSpan="7" className="px-6 py-8 text-center text-zinc-500">Loading inventory...</td></tr>
            ) : parts.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-zinc-500">
                    {!search.trim() ? "Enter a search term to find parts." : "No parts found matching your search."}
                </td>
              </tr>
            ) : (
              parts.map((part) => (
                <tr key={part.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">
                    <div 
                        className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-500 transition-colors group"
                        onClick={() => navigate(`/inventory/${part.id}`)}
                    >
                        <div className="group-hover:underline">{part.name}</div>
                        {(part.nomenclature || part.description) && (
                          <div className="text-xs text-zinc-500 truncate max-w-[200px]">
                            {part.nomenclature}
                            {part.nomenclature && part.description ? ' - ' : ''}
                            {part.description}
                          </div>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-sm">
                    {part.category ? (
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-xs">
                        {part.category}
                      </span>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-600 italic">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 font-mono text-sm">{part.location || '-'}</td>
                  <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300 font-mono">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      part.quantityInStock > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {part.quantityInStock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-mono">${part.retailPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-mono">${part.wholesalePrice.toFixed(2)}</td>
                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 text-sm">
                    {part.aliases && part.aliases.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {part.aliases.map((aliasObj, i) => {
                          const aliasText = typeof aliasObj === 'string' ? aliasObj : aliasObj.alias;
                          const linkedPartId = typeof aliasObj === 'string' ? null : aliasObj.linkedPartId;

                          return linkedPartId ? (
                            <span
                              key={i}
                              className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-xs border border-amber-300 dark:border-amber-700 cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/inventory/${linkedPartId}`);
                              }}
                              title="Go to linked part"
                            >
                              {aliasText}
                            </span>
                          ) : (
                            <span key={i} className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-xs border border-zinc-200 dark:border-zinc-700">
                              {aliasText}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-600 italic">None</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(part)}
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(part.id)}
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {parts.length > 0 && (
        <div className="flex justify-center items-center gap-4 mt-6 mb-8">
          <button
            onClick={() => loadParts(Math.max(1, page - 1))}
            disabled={page === 1 || loading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-zinc-600 dark:text-zinc-400 font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => loadParts(page + 1)}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Edit/Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                {editingPart ? 'Edit Part' : 'Add New Part'}
              </h2>
              <button onClick={handleCloseModal} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Nomenclature</label>
                  <input 
                    type="text" 
                    value={formData.nomenclature}
                    onChange={(e) => setFormData({...formData, nomenclature: e.target.value})}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  placeholder="e.g. Capacitors, Resistors, Connectors"
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Location / Bin</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 dark:text-zinc-600" size={16} />
                    <input 
                      type="text" 
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="e.g. Shelf A-2"
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Quantity in Stock</label>
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
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={formData.retailPrice}
                    onChange={(e) => setFormData({...formData, retailPrice: e.target.value})}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Wholesale Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={formData.wholesalePrice}
                    onChange={(e) => setFormData({...formData, wholesalePrice: e.target.value})}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Aliases (comma separated)</label>
                <textarea 
                  value={formData.aliases}
                  onChange={(e) => setFormData({...formData, aliases: e.target.value})}
                  placeholder="e.g. Cap, Capacitor 10uF, C102"
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none h-16 resize-none"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Part Image</label>
                <div className="flex items-start gap-4">
                    <div className="flex-1">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-300 dark:border-zinc-800 border-dashed rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-2 text-zinc-400 dark:text-zinc-500" />
                                <p className="text-sm text-zinc-500">Click to upload image</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                    </div>
                    {formData.previewUrl && (
                        <div className="w-32 h-32 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden flex items-center justify-center relative group">
                             <img src={formData.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                             <button 
                                type="button"
                                onClick={() => setFormData({...formData, image: null, previewUrl: null})}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                             >
                                <X size={24} />
                             </button>
                        </div>
                    )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 mt-2">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                >
                  <Save size={18} />
                  Save Part
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, partId: null })}
        title="Confirm Delete"
        footer={
          <>
            <button 
              onClick={() => setDeleteModal({ isOpen: false, partId: null })}
              className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Delete Part
            </button>
          </>
        }
      >
        <div className="p-4 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Trash2 className="text-red-600 dark:text-red-500" size={32} />
          </div>
          <p className="text-lg text-zinc-800 dark:text-zinc-200 mb-2">
            Are you sure you want to delete this part?
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            This action cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Inventory;
