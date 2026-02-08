import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getRepair, updateRepair, deleteRepair, getRepairNotes, addRepairNote, getTechnicians, getParts, addRepairPart, removeRepairPart, addCustomRepairPart, uploadRepairPhoto, deleteRepairPhoto, sendEstimateEmail, sendPickupEmail, sendEstimateText, sendPickupText, getEstimates } from '@/lib/api';
import { printDiagnosticReceipt, printRepairInvoice } from '@/lib/printer';
import Modal from '@/components/Modal';
import EstimateWizard from '@/components/EstimateWizard';
import { ArrowLeft, ArrowRight, Save, Clock, User, CheckCircle2, MessageSquare, ThumbsUp, Printer, Package, Plus, Trash2, X, FileText, DollarSign, Truck, Edit2, Camera, Image as ImageIcon, Loader2, Mail, Send, ClipboardCheck, StickyNote } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useError } from '@/context/ErrorContext';

const RepairDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { showError } = useError();
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
  
  // Custom Part State
  const [showCustomPartModal, setShowCustomPartModal] = useState(false);
  const [customPartData, setCustomPartData] = useState({ name: '', price: '', quantity: 1 });

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

  // Estimate State
  const [showEstimateWizard, setShowEstimateWizard] = useState(false);
  const [estimates, setEstimates] = useState([]);

  // Photo State
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Email State
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailModal, setEmailModal] = useState({
    isOpen: false,
    type: null, // 'estimate' or 'pickup'
    method: 'email', // 'email' or 'text'
    step: 'idle', // 'confirm', 'sending', 'success', 'error'
    error: null
  });

  // Delete Repair State
  const [showDeleteRepairModal, setShowDeleteRepairModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Diagnostic Fee Edit State
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [tempFee, setTempFee] = useState('');
  
  // Rush Fee Edit State
  const [isEditingRushFee, setIsEditingRushFee] = useState(false);
  const [tempRushFee, setTempRushFee] = useState('');

  // On-Site Fee Edit State
  const [isEditingOnSiteFee, setIsEditingOnSiteFee] = useState(false);
  const [tempOnSiteFee, setTempOnSiteFee] = useState('');

  // Issue Edit State
  const [isEditingIssue, setIsEditingIssue] = useState(false);
  const [tempIssue, setTempIssue] = useState('');

  // Specs Edit State
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [tempSpecs, setTempSpecs] = useState({ unitType: '', brand: '', model: '', serial: '', priority: 'normal', accessoriesIncluded: '' });

  // Shipment Edit State
  const [isEditingShipment, setIsEditingShipment] = useState(false);
  const [tempShipment, setTempShipment] = useState({ 
    shippingCarrier: '', 
    boxLength: '', 
    boxWidth: '', 
    boxHeight: '',
    returnShippingCarrier: '' 
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load ticket first (critical)
        const foundTicket = await getRepair(id);
        setTicket(foundTicket);
        setClient(foundTicket.client);
        
        // Initialize invoice data from ticket
        setInvoiceData({
          workPerformed: foundTicket.workPerformed || '',
          returnShippingCarrier: foundTicket.returnShippingCarrier || '',
          returnShippingCost: foundTicket.returnShippingCost || '',
          laborCost: foundTicket.laborCost || ''
        });

        // Load technicians separately (non-critical)
        try {
          const techList = await getTechnicians();
          setTechnicians(techList);
        } catch (techError) {
          console.warn("Failed to load technicians:", techError);
          // Don't fail the whole page if just techs fail
        }

      } catch (error) {
        console.error("Failed to load repair:", error);
      }
      setLoading(false);
    };
    loadData();
  }, [id]);

  // Load Estimates
  const loadEstimates = async () => {
    try {
      const data = await getEstimates(id);
      setEstimates(data);
    } catch (error) {
      console.error("Failed to load estimates:", error);
    }
  };

  useEffect(() => {
    if (id) {
      loadEstimates();
    }
  }, [id]);

  // Real-time Notes Polling
  useEffect(() => {
    if (!id) return;

    const pollNotes = async () => {
      try {
        const notes = await getRepairNotes(id);
        setTicket(prev => {
          if (!prev) return prev;
          
          // Simple check to avoid unnecessary re-renders
          if (JSON.stringify(prev.notes) === JSON.stringify(notes)) {
            return prev;
          }

          return { ...prev, notes };
        });
      } catch (error) {
        // Silent fail for polling to avoid console spam
        // console.error("Failed to poll notes:", error);
      }
    };

    // Initial delay to avoid double-fetch on mount, then poll every 5s
    const intervalId = setInterval(pollNotes, 5000);
    return () => clearInterval(intervalId);
  }, [id]);

  const triggerPartsSearch = async () => {
    if (!partsSearch.trim()) {
        setPartsList([]);
        return;
    }
    
    try {
      // When adding parts to a repair, we don't paginate, just get the first 50 matches
      const response = await getParts(partsSearch, 1, 50);
      
      if (Array.isArray(response)) {
         setPartsList(response);
      } else {
         setPartsList(response.data || []);
      }
    } catch (error) {
      console.error("Failed to search parts:", error);
    }
  };

  const handlePartsSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        triggerPartsSearch();
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const updatedTicket = await updateRepair(id, { status: newStatus });
      
      setTicket(prev => {
        const newState = {
          ...prev,
          ...updatedTicket,
          // Preserve complex objects
          client: prev.client,
          parts: prev.parts,
          notes: prev.notes
        };

        // Map snake_case dates from backend if present
        if (updatedTicket.completed_date) {
           newState.completedDate = updatedTicket.completed_date;
        }
        if (updatedTicket.closed_date) {
           newState.closedDate = updatedTicket.closed_date;
        }
        
        return newState;
      });
      
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
      const updates = { diagnosticFeeCollected: newStatus };
      
      // If turning ON, ensure we have a valid fee amount
      if (newStatus) {
        // If there's already a deposit amount, keep it. 
        // If not, use existing fee or default to 89.
        if (!ticket.depositAmount || ticket.depositAmount === 0) {
           updates.depositAmount = ticket.diagnosticFee > 0 ? ticket.diagnosticFee : 89.00;
        }
      }

      await updateRepair(id, updates);
      setTicket(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error("Failed to toggle fee:", error);
    }
  };

  const handleSaveFee = async () => {
    try {
      const newFee = parseFloat(tempFee);
      if (isNaN(newFee) || newFee < 0) {
        alert("Please enter a valid fee amount.");
        return;
      }

      // Update both for backward compatibility, but rely on depositAmount
      await updateRepair(id, { 
        depositAmount: newFee,
        diagnosticFee: newFee 
      });
      
      setTicket(prev => ({ 
        ...prev, 
        depositAmount: newFee,
        diagnosticFee: newFee 
      }));
      setIsEditingFee(false);
    } catch (error) {
      console.error("Failed to update fee:", error);
      alert("Failed to update fee.");
    }
  };

  const handleSaveIssue = async () => {
    try {
      await updateRepair(id, { issue: tempIssue });
      setTicket(prev => ({ ...prev, issue: tempIssue }));
      setIsEditingIssue(false);
    } catch (error) {
      console.error("Failed to update issue:", error);
      alert("Failed to update issue.");
    }
  };

  const handleSaveSpecs = async () => {
    try {
      await updateRepair(id, tempSpecs);
      setTicket(prev => ({ ...prev, ...tempSpecs }));
      setIsEditingSpecs(false);
    } catch (error) {
      console.error("Failed to update specs:", error);
      showError("Failed to update specs: " + error.message);
    }
  };

  const handleSaveShipment = async () => {
    try {
      // Convert empty strings to null for integer fields
      const sanitizedShipment = {
        ...tempShipment,
        boxLength: tempShipment.boxLength === '' ? null : parseInt(tempShipment.boxLength),
        boxWidth: tempShipment.boxWidth === '' ? null : parseInt(tempShipment.boxWidth),
        boxHeight: tempShipment.boxHeight === '' ? null : parseInt(tempShipment.boxHeight),
      };

      await updateRepair(id, sanitizedShipment);
      setTicket(prev => ({ ...prev, ...sanitizedShipment }));
      setIsEditingShipment(false);
    } catch (error) {
      console.error("Failed to update shipment:", error);
      showError("Failed to update shipment: " + error.message);
    }
  };

  const handleOnSiteToggle = async () => {
    try {
      const newStatus = !ticket.isOnSite;
      const newOnSiteFee = newStatus ? 125.00 : 0.00;

      await updateRepair(id, { 
        isOnSite: newStatus,
        onSiteFee: newOnSiteFee
      });
      setTicket(prev => ({ 
        ...prev, 
        isOnSite: newStatus,
        onSiteFee: newOnSiteFee 
      }));
    } catch (error) {
      console.error("Failed to toggle on site:", error);
    }
  };

  const handleShippedInToggle = async () => {
    try {
      const newStatus = !ticket.isShippedIn;
      await updateRepair(id, { isShippedIn: newStatus });
      setTicket(prev => ({ ...prev, isShippedIn: newStatus }));
    } catch (error) {
      console.error("Failed to toggle shipped in:", error);
    }
  };

  const handleTaxExemptToggle = async () => {
    try {
      const newStatus = !ticket.isTaxExempt;
      await updateRepair(id, { isTaxExempt: newStatus });
      setTicket(prev => ({ ...prev, isTaxExempt: newStatus }));
    } catch (error) {
      console.error("Failed to toggle tax exempt:", error);
    }
  };

  const handleRushToggle = async () => {
    try {
      const newPriority = ticket.priority === 'rush' ? 'normal' : 'rush';
      // If switching TO rush, set default $100. If switching OFF, set $0.
      const newRushFee = newPriority === 'rush' ? 100.00 : 0.00;
      
      await updateRepair(id, { 
        priority: newPriority,
        rushFee: newRushFee
      });
      setTicket(prev => ({ 
        ...prev, 
        priority: newPriority,
        rushFee: newRushFee
      }));
    } catch (error) {
      console.error("Failed to toggle rush priority:", error);
    }
  };

  const handleSaveRushFee = async () => {
    try {
      const newFee = parseFloat(tempRushFee);
      if (isNaN(newFee) || newFee < 0) {
        alert("Please enter a valid rush fee.");
        return;
      }
      
      await updateRepair(id, { rushFee: newFee });
      setTicket(prev => ({ ...prev, rushFee: newFee }));
      setIsEditingRushFee(false);
    } catch (error) {
      console.error("Failed to save rush fee:", error);
    }
  };

  const handleSaveOnSiteFee = async () => {
    try {
      const newFee = parseFloat(tempOnSiteFee);
      if (isNaN(newFee) || newFee < 0) {
        alert("Please enter a valid on-site fee.");
        return;
      }
      
      await updateRepair(id, { onSiteFee: newFee });
      setTicket(prev => ({ ...prev, onSiteFee: newFee }));
      setIsEditingOnSiteFee(false);
    } catch (error) {
      console.error("Failed to save on-site fee:", error);
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
      // Always override price to 0 for inventory parts (Inventory/Warranty mode)
      // Custom parts are handled via handleCustomPartSubmit
      const priceOverride = 0;

      await addRepairPart(id, selectedPartForAdd.id, quantity, priceOverride);
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

  const handleCustomPartSubmit = async (e) => {
    e.preventDefault();
    if (!customPartData.name || !customPartData.price) {
      alert("Name and Price are required.");
      return;
    }
    
    try {
      await addCustomRepairPart(id, {
        name: customPartData.name,
        price: parseFloat(customPartData.price),
        quantity: parseInt(customPartData.quantity, 10) || 1
      });
      
      const updatedTicket = await getRepair(id);
      setTicket(updatedTicket);
      
      setShowCustomPartModal(false);
      setCustomPartData({ name: '', price: '', quantity: 1 });
      setIsAddingPart(false);
    } catch (error) {
      console.error("Failed to add custom part:", error);
      alert("Failed to add custom part: " + error.message);
    }
  };

  const [deletePartModal, setDeletePartModal] = useState({
    isOpen: false,
    linkId: null
  });

  const confirmDeletePart = async () => {
    if (!deletePartModal.linkId) return;
    
    try {
      await removeRepairPart(id, deletePartModal.linkId);
      setTicket(prev => ({
        ...prev,
        parts: prev.parts.filter(p => p.id !== deletePartModal.linkId)
      }));
      setDeletePartModal({ isOpen: false, linkId: null });
    } catch (error) {
      console.error("Failed to remove part:", error);
      alert("Failed to remove part.");
    }
  };

  const handleRemovePart = (linkId) => {
    setDeletePartModal({ isOpen: true, linkId });
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
  };

  const handleInvoiceNext = async () => {
    try {
      // Step 1: Parts (Already handled by standard part add/remove)
      if (wizardStep === 1) {
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

  const handleWizardKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInvoiceNext();
    }
  };

  const handleWizardSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent wizard step navigation
      if (e.shiftKey) {
        triggerPartsSearch();
      }
    }
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
      // Ensure completedDate is set to now if it's not already set, or just sync it
      const now = new Date().toISOString();
      const updatedTicket = await updateRepair(id, { 
        status: 'closed',
        completedDate: now 
      });
      
      setTicket(prev => ({ 
        ...prev, 
        status: 'closed',
        // Map the closed_date if returned from backend
        closedDate: updatedTicket.closed_date || updatedTicket.closedDate || now,
        completedDate: updatedTicket.completed_date || updatedTicket.completedDate || now
      }));
      
      setShowCloseModal(false);
      addSystemNote(`Ticket closed by ${user?.name || 'Technician'}.`);
    } catch (error) {
      console.error("Failed to close ticket:", error);
    }
  };

  const formatPhoneNumber = (str) => {
    const cleaned = ('' + str).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    return match ? '(' + match[1] + ') ' + match[2] + '-' + match[3] : str;
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const newPhoto = await uploadRepairPhoto(id, file);
      setTicket(prev => ({
        ...prev,
        photos: [newPhoto, ...(prev.photos || [])]
      }));
    } catch (error) {
      console.error("Failed to upload photo:", error);
      alert("Failed to upload photo: " + error.message);
    } finally {
      setIsUploadingPhoto(false);
      // Reset input
      e.target.value = null;
    }
  };

  const handlePhotoDelete = async (photoId) => {
    if (!window.confirm("Delete this photo?")) return;
    try {
      await deleteRepairPhoto(id, photoId);
      setTicket(prev => ({
        ...prev,
        photos: prev.photos.filter(p => p.id !== photoId)
      }));
    } catch (error) {
      console.error("Failed to delete photo:", error);
      alert("Failed to delete photo.");
    }
  };

  const handleSendEstimateEmail = async () => {
    const method = client?.primaryNotification === 'Text' ? 'text' : 'email';
    setEmailModal({
      isOpen: true,
      type: 'estimate',
      method,
      step: 'confirm',
      error: null
    });
  };

  const handleSendPickupEmail = async () => {
    const method = client?.primaryNotification === 'Text' ? 'text' : 'email';
    setEmailModal({
      isOpen: true,
      type: 'pickup',
      method,
      step: 'confirm',
      error: null
    });
  };
  
  const proceedWithEmail = async () => {
    if (!emailModal.type) return;
    
    setEmailModal(prev => ({ ...prev, step: 'sending', error: null }));
    
    try {
      if (emailModal.method === 'text') {
         if (emailModal.type === 'estimate') {
           await sendEstimateText(id);
           addSystemNote('Text sent: Estimate Available');
         } else if (emailModal.type === 'pickup') {
           await sendPickupText(id);
           addSystemNote('Text sent: Ready for Pickup');
         }
      } else {
         // Default to Email
         if (emailModal.type === 'estimate') {
           await sendEstimateEmail(id);
           addSystemNote('Email sent: Estimate Available');
         } else if (emailModal.type === 'pickup') {
           await sendPickupEmail(id);
           addSystemNote('Email sent: Ready for Pickup');
         }
      }
      
      setEmailModal(prev => ({ ...prev, step: 'success' }));
    } catch (error) {
      console.error("Failed to send notification:", error);
      setEmailModal(prev => ({ 
        ...prev, 
        step: 'error', 
        error: error.message || 'Failed to send notification'
      }));
    }
  };

  const closeEmailModal = () => {
    setEmailModal(prev => ({ ...prev, isOpen: false, step: 'idle' }));
  };

  const handleDeleteRepair = async () => {
    if (deleteConfirmation !== 'DELETE') {
      alert("Please type 'DELETE' to confirm.");
      return;
    }

    try {
      await deleteRepair(id);
      navigate('/workbench'); // or wherever is appropriate
    } catch (error) {
      console.error("Failed to delete repair:", error);
      showError("Failed to delete repair: " + error.message);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading...</div>;
  if (!ticket) return <div className="p-8 text-zinc-500">Ticket not found.</div>;

  const partsTotal = ticket.parts?.reduce((sum, p) => sum + p.total, 0) || 0;
  const laborTotal = ticket.laborCost || 0;
  const shippingTotal = ticket.returnShippingCost || 0;
  const onSiteFee = ticket.onSiteFee || 0;
  const rushFee = ticket.rushFee || 0;
  
  const tax = ticket.isTaxExempt ? 0 : (partsTotal + laborTotal) * 0.075;
  const total = partsTotal + laborTotal + shippingTotal + onSiteFee + rushFee + tax;
  
  const diagnosticFee = ticket.depositAmount ? parseFloat(ticket.depositAmount) : (ticket.diagnosticFee > 0 ? ticket.diagnosticFee : 89.00);
  const amountDue = ticket.diagnosticFeeCollected ? Math.max(0, total - diagnosticFee) : total;
  
  return (
    <div className="max-w-7xl mx-auto pb-10">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Back to Workbench
      </button>

      {/* Header / Title */}
      <div className="flex flex-col xl:flex-row justify-between items-start gap-6 mb-8">
        <div className="w-full xl:w-auto">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-3">
            <span>
              <span className="text-amber-600 dark:text-amber-500 mr-3">#{ticket.claimNumber || ticket.id}</span>
              {ticket.brand} {ticket.model}
            </span>
          </h1>
          
          <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="flex items-center gap-1"><User size={16} /> {client?.name}</span>
            {ticket.unitType && <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">{ticket.unitType}</span>}
          </div>

          {client?.remarks && (
            <div className="mb-3 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-2 rounded border border-amber-200 dark:border-amber-800/50 flex items-start gap-2 max-w-lg">
              <StickyNote size={14} className="shrink-0 mt-0.5" />
              <span className="whitespace-pre-wrap font-medium">{client.remarks}</span>
            </div>
          )}

          <div className="flex items-center gap-x-6 gap-y-2 text-zinc-500 dark:text-zinc-400 mb-3 overflow-x-auto no-scrollbar">
            {ticket.checkedInBy && (
              <span className="flex items-center gap-1.5 whitespace-nowrap" title="Checked In By">
                <ClipboardCheck size={22} className="shrink-0" /> 
                <span>By: {ticket.checkedInBy}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Clock size={22} className="shrink-0" /> 
              <span>In: {new Date(ticket.dateIn).toLocaleDateString()}</span>
            </span>
            {ticket.completedDate && (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 whitespace-nowrap" title="Completed Date">
                <CheckCircle2 size={22} className="shrink-0" /> 
                <span>Done: {new Date(ticket.completedDate).toLocaleDateString()}</span>
              </span>
            )}
            {ticket.closedDate && (
              <span className="flex items-center gap-1.5 text-zinc-500 whitespace-nowrap" title="Closed Date">
                <Clock size={22} className="shrink-0" /> 
                <span>Closed: {new Date(ticket.closedDate).toLocaleDateString()}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
             {ticket.isShippedIn && (
               <span className="inline-flex items-center justify-center px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-sm rounded-full border border-purple-200 dark:border-purple-800/50 font-medium">
                 Shipped In
               </span>
             )}
             {ticket.isOnSite && (
               <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-sm rounded-full border border-blue-200 dark:border-blue-800/50 font-medium">
                 On Site
               </span>
             )}
             {ticket.priority === 'rush' && (
               <span className="inline-flex items-center justify-center px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 text-sm rounded-full border border-red-200 dark:border-red-800/50 font-medium">
                 Rush
               </span>
             )}
             {ticket.priority === 'warranty' && (
               <span className="inline-flex items-center justify-center px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-sm rounded-full border border-emerald-200 dark:border-emerald-800/50 font-medium">
                 Warranty
               </span>
             )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 w-full xl:w-auto">
           {/* Main Actions moved to Right Sidebar */}
           
           {/* Estimate & Notification Actions */}
           <div className="flex gap-2 mt-2">
             <button
               onClick={handleSendEstimateEmail}
               className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium rounded transition-colors disabled:opacity-50 ${
                 client?.primaryNotification === 'Text'
                   ? 'bg-amber-100 dark:bg-amber-700/30 hover:bg-amber-200 dark:hover:bg-amber-700/40 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-600/50'
                   : 'bg-amber-50 dark:bg-amber-600/20 hover:bg-amber-100 dark:hover:bg-amber-600/30 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-600/30'
               }`}
               title={client?.primaryNotification === 'Text' ? "Text Estimate" : "Email Estimate"}
             >
               {client?.primaryNotification === 'Text' ? <MessageSquare size={14} /> : <Mail size={14} />}
               {client?.primaryNotification === 'Text' ? "Text Estimate" : "Email Estimate"}
             </button>
             <button
               onClick={() => addSystemNote('Client has been notified of estimate.')}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium rounded transition-colors"
               title="Log that client was notified"
             >
               <MessageSquare size={14} /> Notified
             </button>
             <button
               onClick={() => addSystemNote('Client has approved estimate.')}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 hover:bg-green-900/50 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-900/50 text-xs font-medium rounded transition-colors"
               title="Log client approval"
             >
               <ThumbsUp size={14} /> Approved
              </button>

              {/* Pickup Notification Button - Only show if ready or closed */}
              {(ticket.status === 'ready' || ticket.status === 'closed') && (
                <button
                  onClick={handleSendPickupEmail}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium rounded transition-colors disabled:opacity-50 ${
                    client?.primaryNotification === 'Text' 
                      ? 'bg-emerald-100 dark:bg-emerald-700/30 hover:bg-emerald-200 dark:hover:bg-emerald-700/40 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-600/50'
                      : 'bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-600 dark:text-emerald-500 border-emerald-200 dark:border-emerald-600/30'
                  }`}
                  title={client?.primaryNotification === 'Text' ? "Text Ready for Pickup" : "Email Ready for Pickup"}
                >
                  {client?.primaryNotification === 'Text' ? <MessageSquare size={14} /> : <Send size={14} />}
                  {client?.primaryNotification === 'Text' ? "Text Ready" : "Email Ready"}
                </button>
              )}
               </div>
            </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Left Column: Details */}
        <div className="col-span-2 space-y-6">
          
          {/* Unit Specs */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-zinc-500 dark:text-zinc-400 font-semibold text-sm uppercase tracking-wider">Unit Specs</h3>
               {!isEditingSpecs && (
                 <button 
                   onClick={() => {
                    setTempSpecs({
                        unitType: ticket.unitType || 'Receiver',
                        brand: ticket.brand || '',
                        model: ticket.model || '',
                        serial: ticket.serial || '',
                        priority: ticket.priority || 'normal',
                        accessoriesIncluded: ticket.accessoriesIncluded || ''
                      });
                     setIsEditingSpecs(true);
                   }}
                   className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                 >
                   <Edit2 size={14} />
                 </button>
               )}
             </div>

             {isEditingSpecs ? (
               <div className="space-y-4">
                 <div className="grid grid-cols-5 gap-4">
                   <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Unit Type</label>
                      <select
                       value={tempSpecs.unitType}
                       onChange={(e) => setTempSpecs(prev => ({ ...prev, unitType: e.target.value }))}
                       className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                      >
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
                     <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Make / Brand</label>
                     <input
                       type="text"
                       value={tempSpecs.brand}
                       onChange={(e) => setTempSpecs(prev => ({ ...prev, brand: e.target.value }))}
                       className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Model</label>
                     <input
                       type="text"
                       value={tempSpecs.model}
                       onChange={(e) => setTempSpecs(prev => ({ ...prev, model: e.target.value }))}
                       className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Serial Number</label>
                     <input
                       type="text"
                       value={tempSpecs.serial}
                       onChange={(e) => setTempSpecs(prev => ({ ...prev, serial: e.target.value }))}
                       className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none font-mono"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Priority</label>
                     <select
                       value={tempSpecs.priority}
                       onChange={(e) => setTempSpecs(prev => ({ ...prev, priority: e.target.value }))}
                       className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                     >
                       <option value="normal">Normal</option>
                       <option value="rush">Rush</option>
                       <option value="warranty">Warranty</option>
                     </select>
                   </div>
                 </div>

                 <div className="pt-2">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Accessories Included</label>
                    <input
                       type="text"
                       value={tempSpecs.accessoriesIncluded}
                       onChange={(e) => setTempSpecs(prev => ({ ...prev, accessoriesIncluded: e.target.value }))}
                       placeholder="e.g. Power Cord, Remote, Original Box"
                       className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                     />
                 </div>

                 <div className="flex justify-end gap-2 pt-2">
                   <button onClick={() => setIsEditingSpecs(false)} className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Cancel</button>
                   <button onClick={handleSaveSpecs} className="text-xs bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-500 text-white px-3 py-1 rounded">Save</button>
                 </div>
               </div>
             ) : (
               <div className="space-y-4">
                 <div className="grid grid-cols-5 gap-4">
                    <div>
                     <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Unit Type</label>
                     <div className="text-zinc-800 dark:text-zinc-200 truncate" title={ticket.unitType}>{ticket.unitType || 'N/A'}</div>
                   </div>
                   <div>
                     <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Make</label>
                     <div className="text-zinc-800 dark:text-zinc-200 truncate" title={ticket.brand}>{ticket.brand || 'N/A'}</div>
                   </div>
                   <div>
                     <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Model</label>
                     <div className="text-zinc-800 dark:text-zinc-200 truncate" title={ticket.model}>{ticket.model || 'N/A'}</div>
                   </div>
                    <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Serial Number</label>
                      <div className="text-zinc-800 dark:text-zinc-200 font-mono" title={ticket.serial}>{ticket.serial || 'N/A'}</div>
                    </div>
                   <div>
                     <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Priority</label>
                     <div className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase ${
                       ticket.priority === 'rush' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500' : 
                       ticket.priority === 'warranty' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                     }`}>
                       {ticket.priority}
                     </div>
                   </div>
                 </div>

                 {ticket.modelVersion && (
                   <div>
                     <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Model Version</label>
                     <div className="text-zinc-800 dark:text-zinc-200">{ticket.modelVersion}</div>
                   </div>
                 )}
                 {ticket.accessoriesIncluded && (
                   <div>
                     <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Accessories</label>
                     <div className="text-zinc-800 dark:text-zinc-200">{ticket.accessoriesIncluded}</div>
                   </div>
                 )}
               </div>
             )}
           </div>
           
           {/* Issue Description */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-amber-600 dark:text-amber-500 font-semibold">Reported Issue</h3>
              {!isEditingIssue && (
                <button 
                  onClick={() => {
                    setTempIssue(ticket.issue || '');
                    setIsEditingIssue(true);
                  }}
                  className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                >
                  <Edit2 size={16} />
                </button>
              )}
            </div>
            
            {isEditingIssue ? (
              <div>
                <textarea
                  value={tempIssue}
                  onChange={(e) => setTempIssue(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 text-zinc-700 dark:text-zinc-300 focus:border-amber-500 outline-none min-h-[100px]"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setIsEditingIssue(false)} className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Cancel</button>
                  <button onClick={handleSaveIssue} className="text-sm bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-500 text-white px-3 py-1 rounded">Save</button>
                </div>
              </div>
            ) : (
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{ticket.issue}</p>
            )}
          </div>

          {/* Work Performed Section */}
          {(ticket.workPerformed || isEditingWork) && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-amber-600 dark:text-amber-500 font-semibold flex items-center gap-2">
                  <CheckCircle2 size={18} /> Work Performed
                </h3>
                {!isEditingWork && (
                  <button 
                    onClick={() => setIsEditingWork(true)}
                    className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
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
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 text-zinc-700 dark:text-zinc-300 focus:border-amber-500 outline-none min-h-[100px]"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setIsEditingWork(false)} className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Cancel</button>
                    <button onClick={saveWorkPerformed} className="text-sm bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-500 text-white px-3 py-1 rounded">Save</button>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{ticket.workPerformed}</p>
              )}
            </div>
          )}

          {/* Parts Section */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-amber-600 dark:text-amber-500 font-semibold flex items-center gap-2">
                Parts & Materials
              </h3>
              <button 
                onClick={() => setIsAddingPart(!isAddingPart)}
                className="text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded flex items-center gap-1 transition-colors"
              >
                <Plus size={14} /> Add Part
              </button>
            </div>

            {isAddingPart && (
              <div className="mb-4 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Search parts inventory... (Press Enter)"
                    value={partsSearch}
                    onChange={(e) => setPartsSearch(e.target.value)}
                    onKeyDown={handlePartsSearchKeyDown}
                    className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                  />
                  {/* Cancel Button */}
                  <button
                    onClick={() => {
                      setIsAddingPart(false);
                      setPartsSearch('');
                    }}
                    className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 px-3 rounded transition-colors"
                    title="Cancel Adding Part"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {partsList.map(part => (
                    <div 
                      key={part.id} 
                      onClick={() => initiateAddPart(part)}
                      className="flex justify-between items-center p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded cursor-pointer text-sm"
                    >
                      <div>
                        <span className="text-zinc-700 dark:text-zinc-300 block">{part.name}</span>
                        <span className={`text-xs ${part.quantityInStock > 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                          In Stock: {part.quantityInStock}
                        </span>
                      </div>
                      <span className="text-zinc-400 dark:text-zinc-500 text-xs mr-2">${part.retailPrice.toFixed(2)}</span>
                      <span className="text-emerald-600 dark:text-emerald-500">$0.00</span>
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
                  <div key={part.id} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-50/50 dark:bg-zinc-950/50 p-3 rounded border border-zinc-200 dark:border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <Package size={16} className="text-zinc-500 dark:text-zinc-400" />
                      <div>
                        <div className="text-sm text-zinc-800 dark:text-zinc-200">{part.name}</div>
                        <div className="text-xs text-zinc-500">Qty: {part.quantity} × ${part.price.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {part.total > 0 ? (
                        <span className="text-sm font-mono text-zinc-700 dark:text-zinc-300">${part.total.toFixed(2)}</span>
                      ) : (
                        <div className="flex flex-col items-end">
                          {part.retailPrice > 0 && (
                            <span className="text-[10px] text-zinc-400">
                              Retail: ${part.retailPrice.toFixed(2)}
                            </span>
                          )}
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                            Cost: ${part.wholesalePrice ? part.wholesalePrice.toFixed(2) : '0.00'}
                          </span>
                        </div>
                      )}
                      <button 
                        onClick={() => handleRemovePart(part.id)}
                        className="text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-zinc-500 dark:text-zinc-400 text-sm italic text-center py-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded">
                  No parts assigned to this repair.
                </div>
              )}
            </div>
          </div>

          {/* Notes System */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <h3 className="text-amber-600 dark:text-amber-500 font-semibold mb-4 flex items-center gap-2">
              Technician Notes 
              <span className="text-zinc-500 dark:text-zinc-400 text-sm font-normal">({ticket.notes?.length || 0})</span>
            </h3>

            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
              {ticket.notes && [...ticket.notes].sort((a, b) => new Date(b.date) - new Date(a.date)).map((note) => (
                <div key={note.id} className="bg-zinc-50 dark:bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-zinc-500 uppercase">{note.author}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(note.date).toLocaleString()}</span>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 text-sm whitespace-pre-wrap">{note.text}</p>
                </div>
              ))}
              {(!ticket.notes || ticket.notes.length === 0) && (
                <div className="text-zinc-500 dark:text-zinc-400 text-sm italic text-center py-4">No notes added yet.</div>
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
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-4 pr-12 py-3 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none min-h-[80px]"
              />
              <button 
                type="submit" 
                disabled={!newNote.trim()}
                className="absolute bottom-3 right-3 text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} />
              </button>
            </form>
          </div>

          {/* Photos Section */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-amber-600 dark:text-amber-500 font-semibold flex items-center gap-2">
                <ImageIcon size={18} /> Photos
              </h3>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploadingPhoto}
                />
                <button 
                  className={`text-xs bg-zinc-100 dark:bg-zinc-800 group-hover:bg-blue-600 group-hover:text-white text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded flex items-center gap-2 transition-colors ${isUploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  {isUploadingPhoto ? 'Uploading...' : 'Add Photo'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {ticket.photos?.map(photo => (
                <div key={photo.id} className="group relative aspect-square bg-zinc-50 dark:bg-zinc-950 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
                  <a href={photo.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                    <img 
                      src={photo.url} 
                      alt="Repair" 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </a>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handlePhotoDelete(photo.id);
                    }}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-red-600/90 text-zinc-900 dark:text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete Photo"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-zinc-700 dark:text-zinc-300 text-center">
                      {new Date(photo.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!ticket.photos || ticket.photos.length === 0) && (
                <div className="col-span-full py-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400 text-sm">
                  <Camera size={24} className="mx-auto mb-2 opacity-50" />
                  No photos uploaded yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Info Card */}
        <div className="col-span-1 space-y-6">
          {/* Status & Tech Assignment */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-4">
             <div className="flex flex-col gap-1">
               <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium ml-1">Assigned Technician</label>
               <select 
                  value={ticket.technician || 'Unassigned'} 
                  onChange={(e) => handleTechnicianChange(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-3 py-2 rounded-lg focus:border-amber-500 outline-none text-sm"
                >
                  <option value="Unassigned">Unassigned</option>
                  {technicians.map(tech => (
                    <option key={tech} value={tech}>{tech}</option>
                  ))}
                </select>
             </div>

             <div className="flex flex-col gap-1">
               <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium ml-1">Repair Status</label>
               <select 
                  value={ticket.status} 
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white px-3 py-2 rounded-lg focus:border-amber-500 outline-none text-sm"
                >
                  <option value="queued">Queued</option>
                  <option value="diagnosing">Diagnosing</option>
                  <option value="estimate">Awaiting Estimate</option>
                  <option value="parts">Waiting for Parts</option>
                  <option value="shipping">Shipping</option>
                  <option value="repairing">Repairing</option>
                  <option value="testing">Testing</option>
                  <option value="ready">Ready for Pickup</option>
                  <option value="closed">Closed</option>
                </select>
             </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
               <div className="flex items-center gap-2">
                 <input 
                   type="checkbox" 
                   id="feeCollected"
                   checked={ticket.diagnosticFeeCollected || false}
                   onChange={handleFeeToggle}
                   className="w-4 h-4 rounded border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-amber-600 focus:ring-amber-500 focus:ring-offset-zinc-900"
                 />
                 
                 {isEditingFee ? (
                   <div className="flex items-center gap-2">
                     <input
                       type="number"
                       value={tempFee}
                       onChange={(e) => setTempFee(e.target.value)}
                       className="w-20 px-2 py-0.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded focus:border-amber-500 outline-none"
                       autoFocus
                     />
                     <button onClick={handleSaveFee} className="text-green-600 hover:text-green-500"><CheckCircle2 size={14} /></button>
                     <button onClick={() => setIsEditingFee(false)} className="text-red-500 hover:text-red-400"><X size={14} /></button>
                   </div>
                 ) : (
                   <div className="flex items-center gap-2">
                     <label htmlFor="feeCollected" className="text-xs text-zinc-500 dark:text-zinc-400 select-none cursor-pointer">
                        Deposit Amount Collected (${diagnosticFee.toFixed(2)})
                     </label>
                     <button 
                       onClick={() => {
                         setTempFee(diagnosticFee);
                         setIsEditingFee(true);
                       }}
                       className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                     >
                       <Edit2 size={12} />
                     </button>
                   </div>
                 )}
              </div>
               <div className="flex items-center gap-2">
                 <input 
                   type="checkbox" 
                   id="isShippedIn"
                   checked={ticket.isShippedIn || false}
                   onChange={handleShippedInToggle}
                   className="w-4 h-4 rounded border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-amber-600 focus:ring-amber-500 focus:ring-offset-zinc-900"
                 />
                 <label htmlFor="isShippedIn" className="text-xs text-zinc-500 dark:text-zinc-400 select-none cursor-pointer">
                   Shipped In
                 </label>
              </div>
               <div className="flex items-center gap-2">
                 <input 
                   type="checkbox" 
                   id="isOnSite"
                   checked={ticket.isOnSite || false}
                   onChange={handleOnSiteToggle}
                   className="w-4 h-4 rounded border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-amber-600 focus:ring-amber-500 focus:ring-offset-zinc-900"
                 />
                 <label htmlFor="isOnSite" className="text-xs text-zinc-500 dark:text-zinc-400 select-none cursor-pointer">
                   On Site Service ($125)
                 </label>
                 
                 {ticket.isOnSite && (
                   <>
                     {!isEditingOnSiteFee && (
                       <button 
                         onClick={() => {
                           setTempOnSiteFee(ticket.onSiteFee || 0);
                           setIsEditingOnSiteFee(true);
                         }}
                         className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                       >
                         <Edit2 size={12} />
                       </button>
                     )}
                     
                     {isEditingOnSiteFee && (
                       <div className="flex items-center gap-1 ml-auto">
                          <input
                            type="number"
                            value={tempOnSiteFee}
                            onChange={(e) => setTempOnSiteFee(e.target.value)}
                            className="w-16 px-1 py-0.5 text-xs text-right bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded focus:border-amber-500 outline-none"
                            autoFocus
                          />
                          <button onClick={handleSaveOnSiteFee} className="text-green-600 hover:text-green-500"><CheckCircle2 size={14} /></button>
                          <button onClick={() => setIsEditingOnSiteFee(false)} className="text-red-500 hover:text-red-400"><X size={14} /></button>
                       </div>
                     )}
                   </>
                 )}
              </div>
              <div className="flex items-center gap-2">
                 <input 
                   type="checkbox" 
                   id="isRush"
                   checked={ticket.priority === 'rush'}
                   onChange={handleRushToggle}
                   className="w-4 h-4 rounded border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-amber-600 focus:ring-amber-500 focus:ring-offset-zinc-900"
                 />
                 <label htmlFor="isRush" className="text-xs text-zinc-500 dark:text-zinc-400 select-none cursor-pointer">
                   Rush Fee ($100)
                 </label>

                 {ticket.priority === 'rush' && (
                   <>
                     {!isEditingRushFee && (
                       <button 
                         onClick={() => {
                           setTempRushFee(ticket.rushFee || 0);
                           setIsEditingRushFee(true);
                         }}
                         className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                       >
                         <Edit2 size={12} />
                       </button>
                     )}
                     
                     {isEditingRushFee && (
                       <div className="flex items-center gap-1 ml-auto">
                          <input
                            type="number"
                            value={tempRushFee}
                            onChange={(e) => setTempRushFee(e.target.value)}
                            className="w-16 px-1 py-0.5 text-xs text-right bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded focus:border-amber-500 outline-none"
                            autoFocus
                          />
                          <button onClick={handleSaveRushFee} className="text-green-600 hover:text-green-500"><CheckCircle2 size={14} /></button>
                          <button onClick={() => setIsEditingRushFee(false)} className="text-red-500 hover:text-red-400"><X size={14} /></button>
                       </div>
                     )}
                   </>
                 )}
              </div>
              <div className="flex items-center gap-2">
                 <input 
                   type="checkbox" 
                   id="isTaxExempt"
                   checked={ticket.isTaxExempt || false}
                   onChange={handleTaxExemptToggle}
                   className="w-4 h-4 rounded border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-amber-600 focus:ring-amber-500 focus:ring-offset-zinc-900"
                 />
                 <label htmlFor="isTaxExempt" className="text-xs text-zinc-500 dark:text-zinc-400 select-none cursor-pointer">
                   Tax Exempt
                 </label>
              </div>
          </div>

           <button
             onClick={() => setShowEstimateWizard(true)}
             className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-500 text-white px-4 py-3 rounded-xl font-bold transition-colors shadow-sm mb-4"
           >
             <DollarSign size={20} /> Estimate Wizard
           </button>

           {/* Estimates List */}
           {estimates.length > 0 && (
             <div className="mb-6 space-y-2">
               <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Estimates</h4>
               {estimates.map((est, index) => (
                 <div 
                   key={est.id} 
                   onClick={() => navigate(`/repair/${id}/estimate/${est.id}`)}
                   className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg shadow-sm cursor-pointer hover:border-amber-500 dark:hover:border-amber-500 transition-all group"
                 >
                   <div className="flex justify-between items-start mb-1">
                     <span className="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">
                       Proposal #{estimates.length - index}
                     </span>
                     <span className={`text-xs px-2 py-0.5 rounded-full ${
                       est.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                       est.status === 'declined' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                       'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                     }`}>
                       {est.status}
                     </span>
                   </div>
                   <div className="flex justify-between text-xs text-zinc-500 mb-2">
                     <span>{new Date(est.createdAt).toLocaleDateString()}</span>
                     <span>by {est.createdTechnician}</span>
                   </div>
                   <div className="flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800 pt-2">
                     <span className="font-bold text-zinc-900 dark:text-white">${est.totalCost.toFixed(2)}</span>
                     <ArrowRight size={14} className="text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors" />
                   </div>
                 </div>
               ))}
             </div>
           )}

           <button
             onClick={startInvoiceWizard}
             className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white px-4 py-3 rounded-xl font-bold transition-colors shadow-sm"
           >
             <FileText size={20} /> Invoice Wizard
           </button>

           {/* Cost Breakdown */}
           <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
             <h3 className="text-zinc-500 dark:text-zinc-400 font-semibold text-sm uppercase tracking-wider mb-4">Cost Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Parts</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-mono">${partsTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Labor</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-mono">${laborTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Sales Tax (7.5%)</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-mono">${tax.toFixed(2)}</span>
              </div>
               {ticket.isOnSite && (
                 <div className="flex justify-between text-sm">
                   <span className="text-zinc-500 dark:text-zinc-400">On Site Service Fee</span>
                   <span className="text-zinc-800 dark:text-zinc-200 font-mono">${onSiteFee.toFixed(2)}</span>
                 </div>
               )}
               {ticket.priority === 'rush' && (
                 <div className="flex justify-between text-sm">
                   <span className="text-zinc-500 dark:text-zinc-400">Rush Service Fee</span>
                   <span className="text-zinc-800 dark:text-zinc-200 font-mono">${rushFee.toFixed(2)}</span>
                 </div>
               )}
              {ticket.isShippedIn && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">Return Shipping</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-mono">${shippingTotal.toFixed(2)}</span>
                </div>
              )}
              {ticket.diagnosticFeeCollected && (
                <div className="flex justify-between text-sm text-green-500">
                  <span>Less: Deposit Amount</span>
                  <span className="font-mono">-${diagnosticFee.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 mt-2">
                {ticket.diagnosticFeeCollected && (
                   <div className="flex justify-between text-sm mb-2">
                     <span className="text-zinc-500 dark:text-zinc-400">Total Cost</span>
                     <span className="text-zinc-800 dark:text-zinc-200 font-mono">${(total + diagnosticFee).toFixed(2)}</span>
                   </div>
                )}
                <div className="flex justify-between text-lg font-bold text-zinc-900 dark:text-white">
                  <span>{ticket.diagnosticFeeCollected ? 'Amount Due' : 'Total'}</span>
                  <span>${amountDue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>





           {ticket.isShippedIn && (
             <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-zinc-500 dark:text-zinc-400 font-semibold text-sm uppercase tracking-wider">Shipment Details</h3>
                  {!isEditingShipment && (
                    <button 
                      onClick={() => {
                        setTempShipment({
                          shippingCarrier: ticket.shippingCarrier || '',
                          boxLength: ticket.boxLength || '',
                          boxWidth: ticket.boxWidth || '',
                          boxHeight: ticket.boxHeight || '',
                          returnShippingCarrier: ticket.returnShippingCarrier || ''
                        });
                        setIsEditingShipment(true);
                      }}
                      className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>

                {isEditingShipment ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Inbound Carrier</label>
                      <input
                        type="text"
                        value={tempShipment.shippingCarrier}
                        onChange={(e) => setTempShipment(prev => ({ ...prev, shippingCarrier: e.target.value }))}
                        placeholder="e.g. UPS, FedEx, USPS"
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Box Dimensions (L x W x H)</label>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          value={tempShipment.boxLength}
                          onChange={(e) => setTempShipment(prev => ({ ...prev, boxLength: e.target.value }))}
                          placeholder="L"
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                        />
                        <input
                          type="number"
                          value={tempShipment.boxWidth}
                          onChange={(e) => setTempShipment(prev => ({ ...prev, boxWidth: e.target.value }))}
                          placeholder="W"
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                        />
                        <input
                          type="number"
                          value={tempShipment.boxHeight}
                          onChange={(e) => setTempShipment(prev => ({ ...prev, boxHeight: e.target.value }))}
                          placeholder="H"
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Return Carrier</label>
                      <input
                        type="text"
                        value={tempShipment.returnShippingCarrier}
                        onChange={(e) => setTempShipment(prev => ({ ...prev, returnShippingCarrier: e.target.value }))}
                        placeholder="e.g. UPS Ground"
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => setIsEditingShipment(false)} className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Cancel</button>
                      <button onClick={handleSaveShipment} className="text-xs bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-500 text-white px-3 py-1 rounded">Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Inbound Carrier</label>
                      <div className="text-zinc-800 dark:text-zinc-200">{ticket.shippingCarrier || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Box Dimensions</label>
                      <div className="text-zinc-800 dark:text-zinc-200 font-mono text-sm">
                        {ticket.boxLength || '?'}L x {ticket.boxWidth || '?'}W x {ticket.boxHeight || '?'}H
                      </div>
                    </div>
                    {ticket.returnShippingCarrier && (
                      <div>
                        <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Return Carrier</label>
                        <div className="text-zinc-800 dark:text-zinc-200">{ticket.returnShippingCarrier}</div>
                      </div>
                    )}
                  </div>
                )}
             </div>
           )}

        </div>

        {/* Right Column: Client & Admin */}
        <div className="col-span-1 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <h3 className="text-zinc-500 dark:text-zinc-400 font-semibold text-sm uppercase tracking-wider mb-4">Client Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Name</label>
                <Link to={`/client/${client?.id}`} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
                  {client?.name}
                </Link>
              </div>
              {client?.companyName && (
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Company</label>
                  <div className="text-zinc-800 dark:text-zinc-200">{client?.companyName}</div>
                </div>
              )}
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Phone Numbers</label>
                {(client?.phones && client.phones.length > 0) ? (
                  <div className="space-y-1 mt-1">
                    {client.phones.map((phone, idx) => (
                      <div key={idx} className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className={`text-zinc-800 dark:text-zinc-200 ${phone.isPrimary ? 'font-medium' : ''}`}>
                            {formatPhoneNumber(phone.number)}
                          </span>
                          {phone.extension && <span className="text-zinc-500 text-xs">x{phone.extension}</span>}
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-300 dark:border-zinc-700">
                            {phone.type}
                          </span>
                          {phone.isPrimary && <span className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">Primary</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-zinc-800 dark:text-zinc-200">{formatPhoneNumber(client?.phone)}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Email</label>
                <div className="text-zinc-800 dark:text-zinc-200 truncate" title={client?.email}>{client?.email || '-'}</div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Primary Notification</label>
                <div className="text-zinc-800 dark:text-zinc-200">{client?.primaryNotification || 'Phone'}</div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Address</label>
                <div className="text-zinc-800 dark:text-zinc-200 text-sm">
                  {client?.address && <div>{client.address}</div>}
                  {(client?.city || client?.state || client?.zip) && (
                    <div>
                      {client.city}{client.city && client.state && ', '}
                      {client.state} {client.zip}
                    </div>
                  )}
                  {!client?.address && !client?.city && '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <h3 className="text-zinc-500 dark:text-zinc-400 font-semibold text-sm uppercase tracking-wider mb-4">Documents</h3>
            <div className="space-y-3">
              <button 
                onClick={() => printDiagnosticReceipt(ticket, client)}
                className="w-full flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 py-2.5 rounded-lg transition-colors border border-zinc-300 dark:border-zinc-700"
              >
                <Printer size={18} />
                Print Fee Receipt
              </button>
              <button 
                onClick={handlePrintInvoice}
                className="w-full flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 py-2.5 rounded-lg transition-colors border border-zinc-300 dark:border-zinc-700"
              >
                <Printer size={18} />
                Print Invoice
              </button>
            </div>
          </div>

          {isAdmin && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-6">
              <h3 className="text-red-600 dark:text-red-500 font-semibold text-sm uppercase tracking-wider mb-4">Admin Actions</h3>
              <button 
                onClick={() => setShowDeleteRepairModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 py-2.5 rounded-lg transition-colors border border-red-200 dark:border-red-800"
              >
                <Trash2 size={18} />
                Delete Repair Ticket
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Part Quantity Modal */}
      {selectedPartForAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Add Part</h3>
              <button onClick={cancelAddPart} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={confirmAddPart} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Part</label>
                <div className="text-zinc-900 dark:text-white text-lg font-medium">{selectedPartForAdd.name}</div>
                <div className={`text-sm mt-1 ${selectedPartForAdd.quantityInStock > 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                  Available in Stock: {selectedPartForAdd.quantityInStock}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Quantity to Use</label>
                <input 
                  type="number" 
                  min="1"
                  max={selectedPartForAdd.quantityInStock}
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none text-lg font-mono"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={cancelAddPart}
                  className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={addQuantity > selectedPartForAdd.quantityInStock || addQuantity < 1}
                  className="bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium"
                >
                  Add to Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Part Modal */}
      {showCustomPartModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[80]">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Add Custom Item</h3>
              <button onClick={() => setShowCustomPartModal(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCustomPartSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Item Name / Description</label>
                <input 
                  type="text" 
                  value={customPartData.name}
                  onChange={(e) => setCustomPartData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  autoFocus
                  placeholder="e.g. Vintage Capacitor Kit"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={customPartData.price}
                    onChange={(e) => setCustomPartData(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Quantity</label>
                  <input 
                    type="number" 
                    min="1"
                    value={customPartData.quantity}
                    onChange={(e) => setCustomPartData(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowCustomPartModal(false)}
                  className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Wizard Modal */}
      {showInvoiceWizard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <FileText className="text-blue-600 dark:text-blue-500" />
                Prepare Invoice
                <span className="text-sm font-normal text-zinc-500 ml-2">Step {wizardStep} of {ticket.isShippedIn ? 4 : 3}</span>
              </h3>
              <button onClick={() => setShowInvoiceWizard(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Step 1: Review Parts</h4>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Ensure all parts used are listed below. Add any missing parts.</p>
                  
                  {/* Re-use Parts Search UI */}
                  <div className="mb-4 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <div className="flex gap-2 mb-2">
                      <input 
                        type="text" 
                        autoFocus
                        placeholder="Search parts inventory... (Shift+Enter to Search)"
                        value={partsSearch}
                        onChange={(e) => setPartsSearch(e.target.value)}
                        onKeyDown={handleWizardSearchKeyDown}
                        className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                      />
                      <button
                        onClick={() => setShowCustomPartModal(true)}
                        className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-3 rounded border border-zinc-300 dark:border-zinc-700 transition-colors flex items-center gap-2 text-xs font-medium"
                        title="Add Custom Item"
                      >
                        <Plus size={14} /> Custom Item
                      </button>
                    </div>
                    {partsSearch && (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {partsList.map(part => (
                          <div 
                            key={part.id} 
                            onClick={() => initiateAddPart(part)}
                            className="flex justify-between items-center p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded cursor-pointer text-sm"
                          >
                            <div>
                              <span className="text-zinc-700 dark:text-zinc-300 block">{part.name}</span>
                              <span className={`text-xs ${part.quantityInStock > 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                                In Stock: {part.quantityInStock}
                              </span>


    </div>
                            <span className="text-emerald-600 dark:text-emerald-500">${part.retailPrice.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {ticket.parts?.map(part => (
                      <div key={part.id} className="flex justify-between items-center bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded border border-zinc-300 dark:border-zinc-700">
                        <span className="text-zinc-800 dark:text-zinc-200">{part.name} (x{part.quantity})</span>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-end">
                            {part.total > 0 ? (
                              <span className="text-zinc-700 dark:text-zinc-300 font-mono">${part.total.toFixed(2)}</span>
                            ) : (
                              <>
                                {part.retailPrice > 0 && (
                                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                    Retail: ${part.retailPrice.toFixed(2)}
                                  </span>
                                )}
                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                                  Cost: ${part.wholesalePrice ? part.wholesalePrice.toFixed(2) : '0.00'}
                                </span>
                              </>
                            )}
                          </div>
                          <button 
                            onClick={() => handleRemovePart(part.id)}
                            className="text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!ticket.parts || ticket.parts.length === 0) && (
                      <div className="text-center text-zinc-500 py-4 italic">No parts added.</div>
                    )}
                  </div>
                  <div className="text-right text-lg font-bold text-zinc-900 dark:text-white mt-4">
                    Parts Total: ${partsTotal.toFixed(2)}
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Step 2: Repairs Made</h4>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Describe the work performed for the final invoice.</p>
                  <textarea
                    name="workPerformed"
                    value={invoiceData.workPerformed}
                    onChange={handleInvoiceChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (e.shiftKey || e.ctrlKey) {
                          // Allow new line
                          return;
                        }
                        e.preventDefault();
                        handleInvoiceNext();
                      }
                    }}
                    autoFocus
                    placeholder="e.g. Replaced capacitors in power supply, cleaned controls, calibrated bias..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 text-zinc-900 dark:text-white focus:border-amber-500 outline-none h-40"
                  />
                </div>
              )}

              {wizardStep === 3 && ticket.isShippedIn && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Step 3: Return Shipping</h4>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Enter return shipping details.</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Carrier</label>
                      <input
                        name="returnShippingCarrier"
                        value={invoiceData.returnShippingCarrier}
                        onChange={handleInvoiceChange}
                        onKeyDown={handleWizardKeyDown}
                        placeholder="e.g. UPS Ground"
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Shipping Cost Quote ($)</label>
              <div className="relative group">
                        <span className="absolute left-3 top-2 text-zinc-500">$</span>
                        <input
                          type="number"
                          name="returnShippingCost"
                          value={invoiceData.returnShippingCost}
                          onChange={handleInvoiceChange}
                          onKeyDown={handleWizardKeyDown}
                          placeholder="0.00"
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded pl-7 pr-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(wizardStep === 4 || (wizardStep === 3 && !ticket.isShippedIn)) && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Final Step: Labor Cost</h4>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Enter the total labor charge.</p>
                  
                  <div className="max-w-xs">
                    <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Labor Amount ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-zinc-500">$</span>
                      <input
                        type="number"
                        name="laborCost"
                        value={invoiceData.laborCost}
                        onChange={handleInvoiceChange}
                        onKeyDown={handleWizardKeyDown}
                        placeholder="0.00"
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded pl-7 pr-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 outline-none text-lg"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end gap-3">
              {wizardStep > 1 && (
                <button 
                  onClick={() => setWizardStep(prev => prev - 1)}
                  className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Back
                </button>
              )}
              <button 
                onClick={handleInvoiceNext}
                className="bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
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
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-blue-600 dark:text-blue-500" size={24} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Close this Claim?</h3>
              
              {ticket.technician === 'Unassigned' ? (
                <div className="mb-6 text-left">
                   <p className="text-amber-600 dark:text-amber-500 text-sm mb-3 font-medium text-center">
                     ⚠️ Technician Required
                   </p>
                   <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4 text-center">
                     Please select the technician who worked on this repair before closing the ticket.
                   </p>
                   <label className="block text-xs font-medium text-zinc-500 mb-1 ml-1">Assign Technician</label>
                   <select 
                      value={ticket.technician || 'Unassigned'} 
                      onChange={(e) => handleTechnicianChange(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                    >
                      <option value="Unassigned">Select Technician...</option>
                      {technicians.map(tech => (
                        <option key={tech} value={tech}>{tech}</option>
                      ))}
                    </select>
                </div>
              ) : (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                  You just printed the invoice. Would you like to mark this repair ticket as <strong>Closed</strong> now?
                </p>
              )}
              
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  No, keep open
                </button>
                <button 
                  onClick={confirmCloseClaim}
                  disabled={ticket.technician === 'Unassigned'}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 dark:text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Yes, Close Claim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Confirmation Modal */}
      <Modal
        isOpen={emailModal.isOpen}
        onClose={closeEmailModal}
        title={emailModal.step === 'success' ? 'Success' : emailModal.step === 'error' ? 'Error' : `Confirm ${emailModal.method === 'text' ? 'Text' : 'Email'}`}
        footer={
          emailModal.step === 'confirm' ? (
            <>
              <button 
                onClick={closeEmailModal}
                className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={proceedWithEmail}
                className="bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Send {emailModal.method === 'text' ? 'Text' : 'Email'}
              </button>
            </>
          ) : emailModal.step === 'success' || emailModal.step === 'error' ? (
            <button 
              onClick={closeEmailModal}
              className="bg-zinc-700 hover:bg-zinc-600 text-zinc-900 dark:text-white px-4 py-2 rounded-lg font-medium"
            >
              Close
            </button>
          ) : null
        }
      >
        {emailModal.step === 'confirm' && (
          <div className="flex flex-col items-center p-4 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
              {emailModal.method === 'text' ? <MessageSquare className="text-amber-600 dark:text-amber-500" size={32} /> : <Mail className="text-amber-600 dark:text-amber-500" size={32} />}
            </div>
            <p className="text-lg text-zinc-800 dark:text-zinc-200 mb-2">
              Send "{emailModal.type === 'estimate' ? 'Estimate Available' : 'Ready for Pickup'}" {emailModal.method === 'text' ? 'text' : 'email'}?
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              This will notify <strong>{client?.name}</strong> at <strong>{emailModal.method === 'text' ? (client?.phone || 'Unknown Phone') : (client?.email || 'Unknown Email')}</strong>.
            </p>
          </div>
        )}

        {emailModal.step === 'sending' && (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 size={48} className="animate-spin text-amber-600 dark:text-amber-500" />
            <p className="text-zinc-700 dark:text-zinc-300">Sending {emailModal.method === 'text' ? 'text' : 'email'}...</p>
          </div>
        )}

        {emailModal.step === 'success' && (
          <div className="flex flex-col items-center p-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-500" size={32} />
            </div>
            <p className="text-lg text-zinc-800 dark:text-zinc-200 mb-2">{emailModal.method === 'text' ? 'Text' : 'Email'} Sent Successfully</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              The client has been notified.
            </p>
          </div>
        )}

        {emailModal.step === 'error' && (
          <div className="flex flex-col items-center p-4 text-center">
             <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <X className="text-red-600 dark:text-red-500" size={32} />
            </div>
            <p className="text-lg text-red-400 mb-2">Failed to Send {emailModal.method === 'text' ? 'Text' : 'Email'}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-3 rounded border border-zinc-200 dark:border-zinc-800 w-full break-words">
              {emailModal.error}
            </p>
          </div>
        )}
      </Modal>

      {/* Delete Part Confirmation Modal */}
      <Modal
        isOpen={deletePartModal.isOpen}
        onClose={() => setDeletePartModal({ isOpen: false, linkId: null })}
        title="Confirm Remove Part"
        footer={
          <>
            <button 
              onClick={() => setDeletePartModal({ isOpen: false, linkId: null })}
              className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={confirmDeletePart}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Remove Part
            </button>
          </>
        }
      >
        <div className="p-4 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Trash2 className="text-red-600 dark:text-red-500" size={32} />
          </div>
          <p className="text-lg text-zinc-800 dark:text-zinc-200 mb-2">
            Are you sure you want to remove this part?
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            This action will remove the part from the ticket and restore inventory quantity.
          </p>
        </div>
      </Modal>

      {/* Estimate Wizard Modal */}
      <EstimateWizard
        isOpen={showEstimateWizard}
        onClose={() => setShowEstimateWizard(false)}
        repairId={id}
        technicianName={user?.name || 'Technician'}
        onEstimateCreated={loadEstimates}
      />

      {/* Delete Repair Confirmation Modal */}
      <Modal
        isOpen={showDeleteRepairModal}
        onClose={() => setShowDeleteRepairModal(false)}
        title="Delete Repair Ticket"
        footer={
          <>
            <button 
              onClick={() => setShowDeleteRepairModal(false)}
              className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleDeleteRepair}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Delete Permanently
            </button>
          </>
        }
      >
        <div className="p-4">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="text-red-600 dark:text-red-500" size={32} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Delete Repair Ticket?</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              This action cannot be undone. This will permanently delete the repair ticket, all associated notes, and photos.
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default RepairDetail;

