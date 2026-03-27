import React, { useState } from 'react';
import { Calculator, CreditCard } from 'lucide-react';
import { chargeTerminal, getRepairs } from '@/lib/api';
import Modal from '@/components/Modal';

const calcAmountDue = (r) => {
  const tax = r.isTaxExempt ? 0 : ((r.partsCost || 0) + (r.laborCost || 0)) * 0.075;
  const total = (r.partsCost || 0) + (r.laborCost || 0) + (r.returnShippingCost || 0)
    + (r.onSiteFee || 0) + (r.rushFee || 0) + tax;
  const deposit = r.depositAmount
    ? parseFloat(r.depositAmount)
    : (r.diagnosticFee > 0 ? r.diagnosticFee : 89.00);
  return r.diagnosticFeeCollected ? Math.max(0, total - deposit) : total;
};

export default function CostSummaryCard({ ticket, isAtLeastSeniorTech, repairId }) {
  const partsTotal = ticket.parts?.reduce((sum, p) => sum + p.total, 0) || 0;
  const laborTotal = ticket.laborCost || 0;
  const shippingTotal = ticket.returnShippingCost || 0;
  const onSiteFee = ticket.onSiteFee || 0;
  const rushFee = ticket.rushFee || 0;

  const tax = ticket.isTaxExempt ? 0 : (partsTotal + laborTotal) * 0.075;
  const total = partsTotal + laborTotal + shippingTotal + onSiteFee + rushFee + tax;

  const diagnosticFee = ticket.depositAmount ? parseFloat(ticket.depositAmount) : (ticket.diagnosticFee > 0 ? ticket.diagnosticFee : 89.00);
  const amountDue = ticket.diagnosticFeeCollected ? Math.max(0, total - diagnosticFee) : total;

  const [chargeState, setChargeState] = useState('idle'); // idle | loading | success | error
  const [chargeError, setChargeError] = useState('');
  const [readyRepairs, setReadyRepairs] = useState([]);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const submitCharge = async (totalAmount) => {
    setShowPickupModal(false);
    setChargeState('loading');
    try {
      await chargeTerminal({ amount: totalAmount, repairId });
      setChargeState('success');
      setTimeout(() => setChargeState('idle'), 8000);
    } catch (err) {
      setChargeState('error');
      setChargeError(err.message || 'Terminal charge failed.');
    }
  };

  const handleCharge = async () => {
    setChargeState('loading');
    setChargeError('');
    try {
      const all = await getRepairs({ clientId: ticket.clientId });
      const others = all.filter(r => r.status === 'ready' && r.id !== Number(repairId));
      if (others.length > 0) {
        setReadyRepairs(others);
        setSelectedIds(new Set());
        setShowPickupModal(true);
        setChargeState('idle');
      } else {
        await submitCharge(amountDue);
      }
    } catch (err) {
      setChargeState('error');
      setChargeError(err.message || 'Failed to check repairs.');
    }
  };

  const extraTotal = readyRepairs
    .filter(r => selectedIds.has(r.id))
    .reduce((sum, r) => sum + calcAmountDue(r), 0);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 mb-4">
      <h3 className="text-amber-600 dark:text-amber-500 font-semibold mb-4 flex items-center gap-2">
        <Calculator size={18} /> Cost Summary
      </h3>
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
              <span className="text-zinc-800 dark:text-zinc-200 font-mono">${total.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-zinc-900 dark:text-white">
            <span>{ticket.diagnosticFeeCollected ? 'Amount Due' : 'Total'}</span>
            <span>${amountDue.toFixed(2)}</span>
          </div>
        </div>
        {isAtLeastSeniorTech && amountDue > 0 && (
          <div className="pt-2">
            {chargeState === 'success' ? (
              <div className="flex items-center gap-2 text-green-500 text-sm">
                <CreditCard size={16} />
                <span>Payment sent to terminal</span>
              </div>
            ) : (
              <button
                onClick={handleCharge}
                disabled={chargeState === 'loading'}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <CreditCard size={16} />
                {chargeState === 'loading' ? 'Checking repairs...' : `Charge $${amountDue.toFixed(2)} to Terminal`}
              </button>
            )}
            {chargeState === 'error' && (
              <p className="text-red-500 text-xs mt-1">{chargeError}</p>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={showPickupModal}
        onClose={() => { setShowPickupModal(false); setChargeState('idle'); }}
        title="Other Repairs Ready for Pickup"
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              onClick={() => submitCharge(amountDue)}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm"
            >
              Charge Current Only (${amountDue.toFixed(2)})
            </button>
            <button
              onClick={() => submitCharge(amountDue + extraTotal)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2"
            >
              <CreditCard size={15} />
              Charge ${(amountDue + extraTotal).toFixed(2)}
            </button>
          </>
        }
      >
        <p className="text-zinc-400 text-sm mb-4">
          This client has other repairs ready for pickup. Select any to include in this charge.
        </p>
        <div className="space-y-2">
          {readyRepairs.map(r => {
            const due = calcAmountDue(r);
            const checked = selectedIds.has(r.id);
            return (
              <label
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-zinc-700 hover:border-zinc-500 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      next.has(r.id) ? next.delete(r.id) : next.add(r.id);
                      return next;
                    });
                  }}
                  className="accent-green-500 w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">
                    #{r.claimNumber} — {r.brand} {r.model}
                  </div>
                  <div className="text-xs text-zinc-400 truncate">{r.issue}</div>
                </div>
                <span className="text-sm font-mono text-green-400 shrink-0">${due.toFixed(2)}</span>
              </label>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
