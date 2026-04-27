import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, User, CheckCircle2, MessageSquare, Mail, Send, FileText, DollarSign, ClipboardCheck, StickyNote, AlertCircle, History, Pencil, Link } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useError } from '@/context/ErrorContext';
import { CLOSED_STATUSES } from '@/lib/repairConstants';
import { askAIDiagnose, getRepairs } from '@/lib/api';

// Hooks
import { useRepairData } from '@/hooks/useRepairData';
import { useRepairUpdater } from '@/hooks/useRepairUpdater';
import { useRepairParts } from '@/hooks/useRepairParts';
import { useNotificationFlow } from '@/hooks/useNotificationFlow';
import { useEstimateActions } from '@/hooks/useEstimateActions';
import { useModelNote } from '@/hooks/useModelNote';

// Components
import UnitSpecsCard from '@/components/repair/UnitSpecsCard';
import EditableTextSection from '@/components/repair/EditableTextSection';
import RepairPartsSection from '@/components/repair/RepairPartsSection';
import NotesSection from '@/components/repair/NotesSection';
import PhotosSection from '@/components/repair/PhotosSection';
import RepairStatusCard from '@/components/repair/RepairStatusCard';
import RepairFeesCard from '@/components/repair/RepairFeesCard';
import CostSummaryCard from '@/components/repair/CostSummaryCard';
import EstimatesList from '@/components/repair/EstimatesList';
import ShipmentDetailsCard from '@/components/repair/ShipmentDetailsCard';
import ClientDetailsCard from '@/components/repair/ClientDetailsCard';
import DocumentsCard from '@/components/repair/DocumentsCard';
import AdminActionsCard from '@/components/repair/AdminActionsCard';
import InvoiceWizardModal from '@/components/repair/InvoiceWizardModal';
import NotificationModal from '@/components/repair/NotificationModal';
import EstimateWizard from '@/components/EstimateWizard';
import ModelNotesCard from '@/components/repair/ModelNotesCard';
import Modal from '@/components/Modal';

const RepairDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, isAtLeastSeniorTech } = useAuth();
  const { showError } = useError();

  // Core data
  const { ticket, setTicket, client, loading, technicians, estimates, loadEstimates } = useRepairData(id);

  // Field update handlers
  const updater = useRepairUpdater(id, ticket, setTicket, user, showError);

  // Parts management
  const parts = useRepairParts(id, ticket, setTicket);

  // Notification flow
  const notifications = useNotificationFlow(id, client, estimates, updater.addSystemNote, setTicket);

  // Estimate actions
  const estActions = useEstimateActions(id, estimates, loadEstimates, setTicket, updater.addSystemNote);

  // Model notes
  const { modelNote, modelNoteLoading, handleSaveModelNote } = useModelNote(ticket?.brand, ticket?.model);

  // Local modal toggles
  const [showInvoiceWizard, setShowInvoiceWizard] = useState(false);
  const [showEstimateWizard, setShowEstimateWizard] = useState(false);
  const [showModelNoteAlert, setShowModelNoteAlert] = useState(false);

  // Priority edit modal
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [pendingPriority, setPendingPriority] = useState(null);
  const [pendingRecalledFromId, setPendingRecalledFromId] = useState(null);
  const [pendingRecalledClaimNumber, setPendingRecalledClaimNumber] = useState(null);
  const [pastRepairs, setPastRepairs] = useState([]);
  const [pastRepairsLoading, setPastRepairsLoading] = useState(false);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (showInvoiceWizard) { setShowInvoiceWizard(false); return; }
      if (showEstimateWizard) { setShowEstimateWizard(false); return; }
      if (showModelNoteAlert) { setShowModelNoteAlert(false); return; }
      if (showPriorityModal) { setShowPriorityModal(false); return; }
      if (notifications.emailModal.isOpen) { notifications.closeEmailModal(); return; }
      navigate(-1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showInvoiceWizard, showEstimateWizard, showModelNoteAlert, showPriorityModal,
      notifications.emailModal.isOpen, notifications.closeEmailModal]);

  // Show model note alert when navigating from Intake
  useEffect(() => {
    if (location.state?.fromIntake && modelNote?.note?.trim()) {
      setShowModelNoteAlert(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.fromIntake, modelNote]);

  const openPriorityModal = useCallback(() => {
    setPendingPriority(ticket.priority || 'normal');
    setPendingRecalledFromId(ticket.recalledFromId || null);
    setPendingRecalledClaimNumber(ticket.recalledFromClaimNumber || null);
    setPastRepairs([]);
    setShowPriorityModal(true);
  }, [ticket]);

  useEffect(() => {
    if (!showPriorityModal || pendingPriority !== 'recall' || !ticket?.clientId) return;
    setPastRepairsLoading(true);
    getRepairs({ clientId: ticket.clientId, includeClosed: true })
      .then(repairs => setPastRepairs(repairs.filter(r => CLOSED_STATUSES.includes(r.status) && r.id !== ticket.id)))
      .catch(err => console.error('Error fetching past repairs:', err))
      .finally(() => setPastRepairsLoading(false));
  }, [showPriorityModal, pendingPriority, ticket?.clientId, ticket?.id]);

  const handleSavePriority = useCallback(async () => {
    const ok = await updater.handlePriorityChange(pendingPriority, pendingRecalledFromId, pendingRecalledClaimNumber);
    if (ok) setShowPriorityModal(false);
  }, [updater, pendingPriority, pendingRecalledFromId, pendingRecalledClaimNumber]);

  const handleStatusChangeWithNotify = useCallback(async (newStatus) => {
    const ok = await updater.handleStatusChange(newStatus);
    if (ok && newStatus === 'ready' &&
        (client?.primaryNotification === 'Email' || client?.primaryNotification === 'Text')) {
      notifications.handleSendPickupEmail();
    }
  }, [updater, client, notifications]);

  if (loading) return <div className="p-8 text-zinc-500">Loading...</div>;
  if (!ticket) return <div className="p-8 text-zinc-500">Ticket not found.</div>;

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
            {ticket.updated_at && (
              <span className="flex items-center gap-1 text-xs" title="Last updated">
                <Clock size={13} />
                {new Date(ticket.updated_at).toLocaleString([], { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
          </div>

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

          <div className="flex items-center gap-2 flex-wrap">
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
            {ticket.priority === 'recall' && !ticket.recalledFromId && (
              <span className="inline-flex items-center justify-center px-3 py-1 bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 text-sm rounded-full border border-orange-200 dark:border-orange-700/50 font-medium">
                Recall
              </span>
            )}
            {ticket.recalledFromId && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 text-sm rounded-full border border-orange-200 dark:border-orange-700/50 font-medium">
                <History size={14} />
                Recall of{' '}
                <button
                  onClick={() => navigate(`/repair/${ticket.recalledFromId}`)}
                  className="underline underline-offset-2 hover:text-orange-600 dark:hover:text-orange-200 transition-colors"
                >
                  #{ticket.recalledFromClaimNumber || ticket.recalledFromId}
                </button>
              </span>
            )}
            <button
              onClick={openPriorityModal}
              title="Edit priority"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <Pencil size={12} /> Priority
            </button>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 w-full xl:w-auto">
          {isAtLeastSeniorTech && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={CLOSED_STATUSES.includes(ticket.status) ? undefined : notifications.handleSendEstimateEmail}
                disabled={CLOSED_STATUSES.includes(ticket.status)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium rounded transition-colors ${
                  CLOSED_STATUSES.includes(ticket.status)
                    ? 'opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700'
                    : client?.primaryNotification === 'Text'
                      ? 'bg-amber-100 dark:bg-amber-700/30 hover:bg-amber-200 dark:hover:bg-amber-700/40 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-600/50'
                      : 'bg-amber-50 dark:bg-amber-600/20 hover:bg-amber-100 dark:hover:bg-amber-600/30 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-600/30'
                }`}
                title={CLOSED_STATUSES.includes(ticket.status) ? "Repair is closed — reopen to use this button" : client?.primaryNotification === 'Text' ? "Text Estimate" : "Email Estimate"}
              >
                {client?.primaryNotification === 'Text' ? <MessageSquare size={14} /> : <Mail size={14} />}
                {client?.primaryNotification === 'Text' ? "Text Estimate" : "Email Estimate"}
              </button>

              {(ticket.status === 'ready' || CLOSED_STATUSES.includes(ticket.status)) && (
                <button
                  onClick={CLOSED_STATUSES.includes(ticket.status) ? undefined : notifications.handleSendPickupEmail}
                  disabled={CLOSED_STATUSES.includes(ticket.status)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium rounded transition-colors ${
                    CLOSED_STATUSES.includes(ticket.status)
                      ? 'opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700'
                      : client?.primaryNotification === 'Text'
                        ? 'bg-emerald-100 dark:bg-emerald-700/30 hover:bg-emerald-200 dark:hover:bg-emerald-700/40 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-600/50'
                        : 'bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-600 dark:text-emerald-500 border-emerald-200 dark:border-emerald-600/30'
                  }`}
                  title={CLOSED_STATUSES.includes(ticket.status) ? "Repair is closed — reopen to use this button" : client?.primaryNotification === 'Text' ? "Text Ready for Pickup" : "Email Ready for Pickup"}
                >
                  {client?.primaryNotification === 'Text' ? <MessageSquare size={14} /> : <Send size={14} />}
                  {client?.primaryNotification === 'Text' ? "Text Ready" : "Email Ready"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Left Column: Details */}
        <div className="col-span-2 space-y-6">
          <UnitSpecsCard ticket={ticket} onSave={updater.handleSaveSpecs} />
          <EditableTextSection title="Reported Issue" value={ticket.issue} onSave={updater.handleSaveIssue} icon={AlertCircle} onAskAI={() => askAIDiagnose({ brand: ticket.brand, model: ticket.model, issue: ticket.issue })} />
          <EditableTextSection title="Work Performed" value={ticket.workPerformed} onSave={updater.saveWorkPerformed} icon={CheckCircle2} showWhenEmpty={false} readOnly={!isAtLeastSeniorTech} />
          <RepairPartsSection ticket={ticket} {...parts} isAtLeastSeniorTech={isAtLeastSeniorTech} />
          <ModelNotesCard
            brand={ticket.brand}
            model={ticket.model}
            modelNote={modelNote}
            onSave={(noteText) => handleSaveModelNote(noteText, user?.name)}
            loading={modelNoteLoading}
          />
          <NotesSection ticket={ticket} repairId={id} user={user} isAdmin={isAdmin} setTicket={setTicket} />
          <PhotosSection ticket={ticket} repairId={id} setTicket={setTicket} />
        </div>

        {/* Middle Column */}
        <div className="col-span-1 space-y-6">
          <RepairStatusCard
            ticket={ticket}
            technicians={technicians}
            onStatusChange={handleStatusChangeWithNotify}
            onTechnicianChange={updater.handleTechnicianChange}
          />

          <RepairFeesCard
            ticket={ticket}
            onFeeToggle={updater.handleFeeToggle}
            onSaveFee={updater.handleSaveFee}
            onShippedInToggle={updater.handleShippedInToggle}
            onOnSiteToggle={updater.handleOnSiteToggle}
            onSaveOnSiteFee={updater.handleSaveOnSiteFee}
            onRushToggle={updater.handleRushToggle}
            onSaveRushFee={updater.handleSaveRushFee}
            onTaxExemptToggle={updater.handleTaxExemptToggle}
          />

          {isAtLeastSeniorTech && (
            <button
              onClick={() => setShowInvoiceWizard(true)}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white px-4 py-3 rounded-xl font-bold transition-colors shadow-sm mb-4"
            >
              <FileText size={20} /> Invoice Wizard
            </button>
          )}

          <CostSummaryCard ticket={ticket} isAtLeastSeniorTech={isAtLeastSeniorTech} repairId={id} />

          {isAtLeastSeniorTech && (
            <button
              onClick={CLOSED_STATUSES.includes(ticket.status) ? undefined : () => setShowEstimateWizard(true)}
              disabled={CLOSED_STATUSES.includes(ticket.status)}
              title={CLOSED_STATUSES.includes(ticket.status) ? "Repair is closed — reopen to use this button" : undefined}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-colors shadow-sm mb-4 ${
                CLOSED_STATUSES.includes(ticket.status)
                  ? 'opacity-40 cursor-not-allowed bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                  : 'bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-500 text-white'
              }`}
            >
              <DollarSign size={20} /> Estimate Wizard
            </button>
          )}

          <EstimatesList
            estimates={estimates}
            repairId={id}
            {...estActions}
          />

          {ticket.isShippedIn && (
            <ShipmentDetailsCard ticket={ticket} onSave={updater.handleSaveShipment} />
          )}
        </div>

        {/* Right Column: Client & Admin */}
        <div className="col-span-1 space-y-6">
          <ClientDetailsCard client={client} />
          <DocumentsCard
            ticket={ticket}
            client={client}
            technicians={technicians}
            onTechnicianChange={updater.handleTechnicianChange}
            onClose={updater.confirmCloseClaim}
          />
          {isAdmin && (
            <AdminActionsCard repairId={id} onDeleted={() => navigate('/workbench')} />
          )}
        </div>
      </div>

      {/* Modals */}
      <InvoiceWizardModal
        isOpen={showInvoiceWizard}
        onClose={() => setShowInvoiceWizard(false)}
        ticket={ticket}
        repairId={id}
        setTicket={setTicket}
        partsSearch={parts.partsSearch}
        setPartsSearch={parts.setPartsSearch}
        partsList={parts.partsList}
        triggerPartsSearch={parts.triggerPartsSearch}
        initiateAddPart={parts.initiateAddPart}
        handleRemovePart={parts.handleRemovePart}
        setShowCustomPartModal={parts.setShowCustomPartModal}
        addSystemNote={updater.addSystemNote}
      />

      <NotificationModal
        emailModal={notifications.emailModal}
        closeEmailModal={notifications.closeEmailModal}
        proceedWithEmail={notifications.proceedWithEmail}
        setEmailModal={notifications.setEmailModal}
        client={client}
        estimates={estimates}
      />

      <EstimateWizard
        isOpen={showEstimateWizard}
        onClose={() => setShowEstimateWizard(false)}
        repairId={id}
        technicianName={user?.name || 'Technician'}
        onEstimateCreated={loadEstimates}
      />

      {/* Priority Edit Modal */}
      <Modal
        isOpen={showPriorityModal}
        onClose={() => setShowPriorityModal(false)}
        title="Edit Priority"
        footer={
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowPriorityModal(false)}
              className="px-4 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePriority}
              disabled={pendingPriority === 'recall' && !pendingRecalledFromId}
              className="px-4 py-2 text-sm rounded bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Priority selector */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'normal', label: 'Normal', color: 'zinc' },
              { value: 'rush', label: 'Rush', color: 'red' },
              { value: 'warranty', label: 'Warranty', color: 'emerald' },
              { value: 'recall', label: 'Recall', color: 'orange' },
            ].map(({ value, label, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setPendingPriority(value);
                  if (value !== 'recall') {
                    setPendingRecalledFromId(null);
                    setPendingRecalledClaimNumber(null);
                  }
                }}
                className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  pendingPriority === value
                    ? color === 'zinc'
                      ? 'bg-zinc-200 dark:bg-zinc-700 border-zinc-400 dark:border-zinc-500 text-zinc-900 dark:text-white'
                      : color === 'red'
                        ? 'bg-red-100 dark:bg-red-900/50 border-red-400 dark:border-red-600 text-red-800 dark:text-red-300'
                        : color === 'emerald'
                          ? 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300'
                          : 'bg-orange-100 dark:bg-orange-900/40 border-orange-400 dark:border-orange-600 text-orange-800 dark:text-orange-300'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Recall: past repair linker */}
          {pendingPriority === 'recall' && (
            <div className="border border-orange-200 dark:border-orange-700/50 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-700/50">
                <h4 className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider">
                  Link Original Repair
                </h4>
                {pendingRecalledFromId && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                    Linked: #{pendingRecalledClaimNumber || pendingRecalledFromId}
                    <button
                      type="button"
                      onClick={() => { setPendingRecalledFromId(null); setPendingRecalledClaimNumber(null); }}
                      className="ml-2 underline hover:no-underline"
                    >
                      clear
                    </button>
                  </p>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto">
                {pastRepairsLoading ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 px-3 py-3">Loading past repairs...</p>
                ) : pastRepairs.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 px-3 py-3">No closed repairs found for this client.</p>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {pastRepairs.map(r => (
                      <div
                        key={r.id}
                        className={`flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors ${
                          pendingRecalledFromId === r.id
                            ? 'bg-orange-50 dark:bg-orange-900/20'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <span className="text-zinc-700 dark:text-zinc-300 truncate">
                          <span className="font-medium text-orange-700 dark:text-orange-400">
                            #{r.claimNumber || r.id}
                          </span>
                          {' — '}{r.brand} {r.model}
                          {r.closedDate && (
                            <span className="text-zinc-400 dark:text-zinc-500 ml-1">
                              ({new Date(r.closedDate).toLocaleDateString()})
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingRecalledFromId(r.id);
                            setPendingRecalledClaimNumber(r.claimNumber || String(r.id));
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                            pendingRecalledFromId === r.id
                              ? 'bg-orange-500 text-white'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-orange-100 dark:hover:bg-orange-800/30 hover:text-orange-700 dark:hover:text-orange-400'
                          }`}
                        >
                          <Link size={12} />
                          {pendingRecalledFromId === r.id ? 'Linked' : 'Link'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showModelNoteAlert}
        onClose={() => setShowModelNoteAlert(false)}
        title={`${ticket.brand} ${ticket.model} — Model Notes`}
        footer={
          <button
            onClick={() => setShowModelNoteAlert(false)}
            className="bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-500 text-white px-4 py-2 rounded font-medium transition-colors"
          >
            Got it
          </button>
        }
      >
        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {modelNote?.note}
        </p>
        {modelNote?.updatedBy && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4">
            Last edited by {modelNote.updatedBy}
          </p>
        )}
      </Modal>
    </div>
  );
};

export default RepairDetail;
