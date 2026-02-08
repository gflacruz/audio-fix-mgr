import React, { useState, useEffect, useRef } from 'react';
import Modal from '@/components/Modal';
import { ArrowLeft, ArrowRight, Save, Plus, DollarSign, List, FileText, CheckCircle2 } from 'lucide-react';
import { createEstimate } from '@/lib/api';

const EstimateWizard = ({ isOpen, onClose, repairId, technicianName, onEstimateCreated }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    diagnosticNotes: '',
    workPerformed: '',
    laborCost: '',
    partsCost: ''
  });
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Refs for focus management
  const noteInputRef = useRef(null);
  const workInputRef = useRef(null);
  const laborInputRef = useRef(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormData({
        diagnosticNotes: '',
        workPerformed: '- ',
        laborCost: '',
        partsCost: ''
      });
      setShowSuccessModal(false);
    }
  }, [isOpen]);

  // Focus management on step change
  useEffect(() => {
    if (!isOpen) return;
    
    // Small timeout to allow render
    const timer = setTimeout(() => {
      if (step === 1 && noteInputRef.current) {
        noteInputRef.current.focus();
      } else if (step === 2 && workInputRef.current) {
        workInputRef.current.focus();
        // Move cursor to end if needed, though simple focus usually puts it at end for textareas in some browsers, 
        // standard behavior often selects all or start. 
        // For "- ", we want end.
        const val = workInputRef.current.value;
        workInputRef.current.setSelectionRange(val.length, val.length);
      } else if (step === 3 && laborInputRef.current) {
        laborInputRef.current.focus();
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [step, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNoteKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      nextStep();
    }
  };

  const handleWorkKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        e.preventDefault();
        const { selectionStart, selectionEnd, value } = e.target;
        // Insert newline and dash
        const newValue = value.substring(0, selectionStart) + '\n- ' + value.substring(selectionEnd);
        setFormData(prev => ({ ...prev, workPerformed: newValue }));
        
        setTimeout(() => {
          e.target.selectionStart = selectionStart + 3;
          e.target.selectionEnd = selectionStart + 3;
        }, 0);
      } else {
        e.preventDefault();
        nextStep();
      }
    }
  };

  const handleCostKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(false);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async (addAnother = false) => {
    setLoading(true);
    try {
      const payload = {
        repairId,
        diagnosticNotes: formData.diagnosticNotes,
        workPerformed: formData.workPerformed,
        laborCost: formData.laborCost || 0,
        partsCost: formData.partsCost || 0,
        createdTechnician: technicianName
      };

      await createEstimate(payload);
      
      if (onEstimateCreated) {
        onEstimateCreated();
      }

      if (addAnother) {
        setSuccessMessage("Estimate saved! You can now modify details for the next proposal.");
        setShowSuccessModal(true);
        setStep(1); 
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Failed to create estimate:", error);
      alert("Failed to create estimate: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
      setShowSuccessModal(false);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-sm flex items-start gap-2">
              <FileText size={16} className="mt-0.5" />
              <p>Step 1: Enter your diagnostic findings. Press Enter to Continue (Shift+Enter for new line).</p>
            </div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Diagnostic Notes</label>
            <textarea
              ref={noteInputRef}
              name="diagnosticNotes"
              value={formData.diagnosticNotes}
              onChange={handleChange}
              onKeyDown={handleNoteKeyDown}
              className="w-full h-40 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 focus:border-amber-500 outline-none"
              placeholder="e.g. Unit powers on but no audio output..."
            />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-sm flex items-start gap-2">
              <List size={16} className="mt-0.5" />
              <p>Step 2: List work to be performed. Press Enter to Continue. Shift+Enter for new bullet point.</p>
            </div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Scope of Work</label>
            <textarea
              ref={workInputRef}
              name="workPerformed"
              value={formData.workPerformed}
              onChange={handleChange}
              onKeyDown={handleWorkKeyDown}
              className="w-full h-40 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 focus:border-amber-500 outline-none font-mono text-sm"
              placeholder="- Replace capacitors..."
            />
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-sm flex items-start gap-2">
              <DollarSign size={16} className="mt-0.5" />
              <p>Step 3: Estimate the costs. Press Enter to Submit.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Labor Estimate ($)</label>
                <input
                  ref={laborInputRef}
                  type="number"
                  name="laborCost"
                  value={formData.laborCost}
                  onChange={handleChange}
                  onKeyDown={handleCostKeyDown}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded p-2 focus:border-amber-500 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Parts Estimate ($)</label>
                <input
                  type="number"
                  name="partsCost"
                  value={formData.partsCost}
                  onChange={handleChange}
                  onKeyDown={handleCostKeyDown}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded p-2 focus:border-amber-500 outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex justify-between items-center">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">Total Estimated Cost</span>
              <span className="text-xl font-bold text-zinc-900 dark:text-white">
                ${((parseFloat(formData.laborCost) || 0) + (parseFloat(formData.partsCost) || 0)).toFixed(2)}
              </span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const footer = (
    <>
      {step > 1 && (
        <button 
          onClick={prevStep}
          className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </button>
      )}
      <div className="flex-1" />
      {step < 3 ? (
        <button 
          onClick={nextStep}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded flex items-center gap-2"
        >
          Next <ArrowRight size={16} />
        </button>
      ) : (
        <div className="flex gap-2">
           <button 
            onClick={() => handleSubmit(true)}
            disabled={loading}
            className="px-4 py-2 border border-amber-600 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded flex items-center gap-2"
            title="Save this estimate and start a new one with the same details (e.g. for Option B)"
          >
            <Plus size={16} /> Add Another Option
          </button>
          <button 
            onClick={() => handleSubmit(false)}
            disabled={loading}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded flex items-center gap-2"
          >
            {loading ? 'Saving...' : <><Save size={16} /> Submit Estimate</>}
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Create Repair Estimate"
        footer={footer}
        maxWidth="max-w-2xl"
      >
        {renderStep()}
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccess}
        title="Success"
        footer={
          <button 
            onClick={handleCloseSuccess}
            className="bg-zinc-700 hover:bg-zinc-600 text-zinc-900 dark:text-white px-4 py-2 rounded-lg font-medium"
          >
            Close
          </button>
        }
      >
        <div className="flex flex-col items-center p-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-500" size={32} />
            </div>
            <p className="text-lg text-zinc-800 dark:text-zinc-200 mb-2">Estimate Saved!</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {successMessage}
            </p>
          </div>
      </Modal>
    </>
  );
};

export default EstimateWizard;

