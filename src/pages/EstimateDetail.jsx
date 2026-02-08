import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEstimate, updateEstimate, deleteEstimate } from '@/lib/api';
import { ArrowLeft, Save, Trash2, Edit2, X, CheckCircle2, DollarSign, FileText, List, User, Calendar } from 'lucide-react';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { useError } from '@/context/ErrorContext';

const EstimateDetail = () => {
  const { repairId, estimateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError } = useError();
  
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Edit State
  const [formData, setFormData] = useState({
    diagnosticNotes: '',
    workPerformed: '',
    laborCost: '',
    partsCost: '',
    status: ''
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getEstimate(estimateId);
        setEstimate(data);
        setFormData({
          diagnosticNotes: data.diagnosticNotes || '',
          workPerformed: data.workPerformed || '',
          laborCost: data.laborCost || 0,
          partsCost: data.partsCost || 0,
          status: data.status || 'pending'
        });
      } catch (error) {
        console.error("Failed to load estimate:", error);
        showError("Failed to load estimate details.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [estimateId, showError]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        diagnosticNotes: formData.diagnosticNotes,
        workPerformed: formData.workPerformed,
        laborCost: parseFloat(formData.laborCost),
        partsCost: parseFloat(formData.partsCost),
        status: formData.status
      };
      
      const updatedEstimate = await updateEstimate(estimateId, updates);
      setEstimate(updatedEstimate);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update estimate:", error);
      showError("Failed to update estimate: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteEstimate(estimateId);
      navigate(`/repair/${repairId}`);
    } catch (error) {
      console.error("Failed to delete estimate:", error);
      showError("Failed to delete estimate: " + error.message);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading estimate...</div>;
  if (!estimate) return <div className="p-8 text-zinc-500">Estimate not found.</div>;

  const totalCost = (parseFloat(formData.laborCost) || 0) + (parseFloat(formData.partsCost) || 0);

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <button 
        onClick={() => navigate(`/repair/${repairId}`)}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Back to Repair Ticket
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-3">
            <span>Estimate Details</span>
            <span className={`text-base font-normal px-3 py-1 rounded-full border ${
               estimate.status === 'approved' 
                 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800' 
                 : estimate.status === 'declined'
                 ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800'
                 : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
            }`}>
              {estimate.status.toUpperCase()}
            </span>
          </h1>
          <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 text-sm">
            <span className="flex items-center gap-1.5">
               <User size={14} /> Created by {estimate.createdTechnician || 'Technician'}
            </span>
            <span className="flex items-center gap-1.5">
               <Calendar size={14} /> {new Date(estimate.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
           {!isEditing ? (
             <>
               <button 
                 onClick={() => setIsEditing(true)}
                 className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
               >
                 <Edit2 size={16} /> Edit
               </button>
               <button 
                 onClick={handleDelete}
                 className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
               >
                 <Trash2 size={16} /> Delete
               </button>
             </>
           ) : (
             <>
               <button 
                 onClick={() => {
                   setIsEditing(false);
                   // Reset form to current estimate state
                   setFormData({
                      diagnosticNotes: estimate.diagnosticNotes,
                      workPerformed: estimate.workPerformed,
                      laborCost: estimate.laborCost,
                      partsCost: estimate.partsCost,
                      status: estimate.status
                   });
                 }}
                 className="flex items-center gap-2 px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleSave}
                 disabled={saving}
                 className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm transition-colors"
               >
                 {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
               </button>
             </>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Diagnostic Notes */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
             <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
               <FileText className="text-amber-600 dark:text-amber-500" size={20} />
               Diagnostic Findings
             </h3>
             {isEditing ? (
               <textarea
                 value={formData.diagnosticNotes}
                 onChange={(e) => setFormData(prev => ({ ...prev, diagnosticNotes: e.target.value }))}
                 className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 text-zinc-900 dark:text-white focus:border-amber-500 outline-none h-40"
                 placeholder="Enter diagnostic notes..."
               />
             ) : (
               <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                 {estimate.diagnosticNotes || <span className="text-zinc-400 italic">No diagnostic notes provided.</span>}
               </p>
             )}
          </div>

          {/* Scope of Work */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
             <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
               <List className="text-blue-600 dark:text-blue-500" size={20} />
               Scope of Work
             </h3>
             {isEditing ? (
               <textarea
                 value={formData.workPerformed}
                 onChange={(e) => setFormData(prev => ({ ...prev, workPerformed: e.target.value }))}
                 className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 text-zinc-900 dark:text-white focus:border-amber-500 outline-none h-40 font-mono text-sm"
                 placeholder="- Replace..."
               />
             ) : (
               <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                 {estimate.workPerformed || <span className="text-zinc-400 italic">No scope of work defined.</span>}
               </p>
             )}
          </div>
        </div>

        {/* Right Column: Costs & Status */}
        <div className="space-y-6">
          
          {/* Cost Breakdown */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
             <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
               Estimated Costs
             </h3>
             
             <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <label className="text-zinc-600 dark:text-zinc-400">Labor</label>
                 {isEditing ? (
                   <div className="relative w-32">
                     <span className="absolute left-3 top-2 text-zinc-500">$</span>
                     <input
                       type="number"
                       value={formData.laborCost}
                       onChange={(e) => setFormData(prev => ({ ...prev, laborCost: e.target.value }))}
                       className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded pl-6 pr-2 py-1.5 text-right font-mono text-sm focus:border-amber-500 outline-none"
                     />
                   </div>
                 ) : (
                   <span className="text-zinc-900 dark:text-white font-mono">${parseFloat(formData.laborCost).toFixed(2)}</span>
                 )}
               </div>

               <div className="flex justify-between items-center">
                 <label className="text-zinc-600 dark:text-zinc-400">Parts</label>
                 {isEditing ? (
                   <div className="relative w-32">
                     <span className="absolute left-3 top-2 text-zinc-500">$</span>
                     <input
                       type="number"
                       value={formData.partsCost}
                       onChange={(e) => setFormData(prev => ({ ...prev, partsCost: e.target.value }))}
                       className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded pl-6 pr-2 py-1.5 text-right font-mono text-sm focus:border-amber-500 outline-none"
                     />
                   </div>
                 ) : (
                   <span className="text-zinc-900 dark:text-white font-mono">${parseFloat(formData.partsCost).toFixed(2)}</span>
                 )}
               </div>

               <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-2 flex justify-between items-center">
                 <span className="font-bold text-zinc-900 dark:text-white text-lg">Total</span>
                 <span className="font-bold text-zinc-900 dark:text-white text-xl font-mono">
                   ${totalCost.toFixed(2)}
                 </span>
               </div>
             </div>
          </div>

          {/* Status Control (Only in Edit Mode or if Admin) */}
          {isEditing && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                Update Status
              </h3>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          )}

        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Estimate"
        footer={
          <>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-zinc-700 dark:text-zinc-300">
          Are you sure you want to delete this estimate? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default EstimateDetail;
