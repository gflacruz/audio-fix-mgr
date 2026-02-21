import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, User, CheckCircle2, MessageSquare, Mail, Send, FileText, DollarSign, ClipboardCheck, StickyNote, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useError } from '@/context/ErrorContext';

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

  // Show model note alert when navigating from Intake
  useEffect(() => {
    if (location.state?.fromIntake && modelNote?.note?.trim()) {
      setShowModelNoteAlert(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.fromIntake, modelNote]);

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
          {isAtLeastSeniorTech && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={ticket.status === 'closed' ? undefined : notifications.handleSendEstimateEmail}
                disabled={ticket.status === 'closed'}
                className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium rounded transition-colors ${
                  ticket.status === 'closed'
                    ? 'opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700'
                    : client?.primaryNotification === 'Text'
                      ? 'bg-amber-100 dark:bg-amber-700/30 hover:bg-amber-200 dark:hover:bg-amber-700/40 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-600/50'
                      : 'bg-amber-50 dark:bg-amber-600/20 hover:bg-amber-100 dark:hover:bg-amber-600/30 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-600/30'
                }`}
                title={ticket.status === 'closed' ? "Repair status is closed — reopen to use this button" : client?.primaryNotification === 'Text' ? "Text Estimate" : "Email Estimate"}
              >
                {client?.primaryNotification === 'Text' ? <MessageSquare size={14} /> : <Mail size={14} />}
                {client?.primaryNotification === 'Text' ? "Text Estimate" : "Email Estimate"}
              </button>

              {(ticket.status === 'ready' || ticket.status === 'closed') && (
                <button
                  onClick={ticket.status === 'closed' ? undefined : notifications.handleSendPickupEmail}
                  disabled={ticket.status === 'closed'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium rounded transition-colors ${
                    ticket.status === 'closed'
                      ? 'opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700'
                      : client?.primaryNotification === 'Text'
                        ? 'bg-emerald-100 dark:bg-emerald-700/30 hover:bg-emerald-200 dark:hover:bg-emerald-700/40 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-600/50'
                        : 'bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-600 dark:text-emerald-500 border-emerald-200 dark:border-emerald-600/30'
                  }`}
                  title={ticket.status === 'closed' ? "Repair status is closed — reopen to use this button" : client?.primaryNotification === 'Text' ? "Text Ready for Pickup" : "Email Ready for Pickup"}
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
          <EditableTextSection title="Reported Issue" value={ticket.issue} onSave={updater.handleSaveIssue} icon={AlertCircle} />
          <EditableTextSection title="Work Performed" value={ticket.workPerformed} onSave={updater.saveWorkPerformed} icon={CheckCircle2} showWhenEmpty={false} readOnly={!isAtLeastSeniorTech} />
          <RepairPartsSection ticket={ticket} {...parts} />
          <ModelNotesCard
            brand={ticket.brand}
            model={ticket.model}
            modelNote={modelNote}
            onSave={(noteText) => handleSaveModelNote(noteText, user?.name)}
            loading={modelNoteLoading}
          />
          <NotesSection ticket={ticket} repairId={id} user={user} setTicket={setTicket} />
          <PhotosSection ticket={ticket} repairId={id} setTicket={setTicket} />
        </div>

        {/* Middle Column */}
        <div className="col-span-1 space-y-6">
          <RepairStatusCard
            ticket={ticket}
            technicians={technicians}
            onStatusChange={updater.handleStatusChange}
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

          <CostSummaryCard ticket={ticket} />

          {isAtLeastSeniorTech && (
            <button
              onClick={ticket.status === 'closed' ? undefined : () => setShowEstimateWizard(true)}
              disabled={ticket.status === 'closed'}
              title={ticket.status === 'closed' ? "Repair status is closed — reopen to use this button" : undefined}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-colors shadow-sm mb-4 ${
                ticket.status === 'closed'
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
