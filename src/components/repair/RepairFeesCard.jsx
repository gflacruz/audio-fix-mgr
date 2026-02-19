import React, { useState } from 'react';
import { Edit2, CheckCircle2, X } from 'lucide-react';

function EditableFee({ value, onSave, onStartEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState('');

  const startEdit = () => {
    setTempValue(value || 0);
    setIsEditing(true);
    onStartEdit?.();
  };

  const handleSave = async () => {
    const success = await onSave(tempValue);
    if (success !== false) setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 ml-auto">
        <input
          type="number"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          className="w-16 px-1 py-0.5 text-xs text-right bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded focus:border-amber-500 outline-none"
          autoFocus
        />
        <button onClick={handleSave} className="text-green-600 hover:text-green-500"><CheckCircle2 size={14} /></button>
        <button onClick={() => setIsEditing(false)} className="text-red-500 hover:text-red-400"><X size={14} /></button>
      </div>
    );
  }

  return (
    <button onClick={startEdit} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
      <Edit2 size={12} />
    </button>
  );
}

export default function RepairFeesCard({
  ticket,
  onFeeToggle,
  onSaveFee,
  onShippedInToggle,
  onOnSiteToggle,
  onSaveOnSiteFee,
  onRushToggle,
  onSaveRushFee,
  onTaxExemptToggle,
}) {
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [tempFee, setTempFee] = useState('');

  const diagnosticFee = ticket.depositAmount ? parseFloat(ticket.depositAmount) : (ticket.diagnosticFee > 0 ? ticket.diagnosticFee : 89.00);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
      {/* Diagnostic Fee */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="feeCollected"
          checked={ticket.diagnosticFeeCollected || false}
          onChange={onFeeToggle}
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
            <button onClick={async () => { const ok = await onSaveFee(tempFee); if (ok !== false) setIsEditingFee(false); }} className="text-green-600 hover:text-green-500"><CheckCircle2 size={14} /></button>
            <button onClick={() => setIsEditingFee(false)} className="text-red-500 hover:text-red-400"><X size={14} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <label htmlFor="feeCollected" className="text-xs text-zinc-500 dark:text-zinc-400 select-none cursor-pointer">
              Deposit Amount Collected (${diagnosticFee.toFixed(2)})
            </label>
            <button
              onClick={() => { setTempFee(diagnosticFee); setIsEditingFee(true); }}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              <Edit2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Shipped In */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isShippedIn"
          checked={ticket.isShippedIn || false}
          onChange={onShippedInToggle}
          className="w-4 h-4 rounded border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-amber-600 focus:ring-amber-500 focus:ring-offset-zinc-900"
        />
        <label htmlFor="isShippedIn" className="text-xs text-zinc-500 dark:text-zinc-400 select-none cursor-pointer">
          Shipped In
        </label>
      </div>

      {/* On Site */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isOnSite"
          checked={ticket.isOnSite || false}
          onChange={onOnSiteToggle}
          className="w-4 h-4 rounded border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-amber-600 focus:ring-amber-500 focus:ring-offset-zinc-900"
        />
        <label htmlFor="isOnSite" className="text-xs text-zinc-500 dark:text-zinc-400 select-none cursor-pointer">
          On Site Service {ticket.onSiteFee ? `($${Number(ticket.onSiteFee).toFixed(2)})` : ''}
        </label>
        {ticket.isOnSite && (
          <EditableFee value={ticket.onSiteFee} onSave={onSaveOnSiteFee} />
        )}
      </div>

      {/* Rush Fee */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isRush"
          checked={ticket.priority === 'rush'}
          onChange={onRushToggle}
          className="w-4 h-4 rounded border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-amber-600 focus:ring-amber-500 focus:ring-offset-zinc-900"
        />
        <label htmlFor="isRush" className="text-xs text-zinc-500 dark:text-zinc-400 select-none cursor-pointer">
          Rush Fee ($100)
        </label>
        {ticket.priority === 'rush' && (
          <EditableFee value={ticket.rushFee} onSave={onSaveRushFee} />
        )}
      </div>

      {/* Tax Exempt */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isTaxExempt"
          checked={ticket.isTaxExempt || false}
          onChange={onTaxExemptToggle}
          className="w-4 h-4 rounded border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-amber-600 focus:ring-amber-500 focus:ring-offset-zinc-900"
        />
        <label htmlFor="isTaxExempt" className="text-xs text-zinc-500 dark:text-zinc-400 select-none cursor-pointer">
          Tax Exempt
        </label>
      </div>
    </div>
  );
}
