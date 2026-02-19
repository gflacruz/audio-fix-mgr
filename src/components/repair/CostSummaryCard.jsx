import React from 'react';
import { Calculator } from 'lucide-react';

export default function CostSummaryCard({ ticket }) {
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
      </div>
    </div>
  );
}
