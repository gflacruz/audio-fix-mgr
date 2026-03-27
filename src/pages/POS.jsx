import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, CheckCircle, X, Barcode } from 'lucide-react';
import { chargeTerminal, getRepair } from '@/lib/api';

const calcAmountDue = (r) => {
  const tax = r.isTaxExempt ? 0 : ((r.partsCost || 0) + (r.laborCost || 0)) * 0.075;
  const total = (r.partsCost || 0) + (r.laborCost || 0) + (r.returnShippingCost || 0)
    + (r.onSiteFee || 0) + (r.rushFee || 0) + tax;
  const deposit = r.depositAmount
    ? parseFloat(r.depositAmount)
    : (r.diagnosticFee > 0 ? r.diagnosticFee : 89.00);
  return r.diagnosticFeeCollected ? Math.max(0, total - deposit) : total;
};

export default function POS() {
  const [amount, setAmount] = useState('');
  const [chargeState, setChargeState] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [scannedRepairs, setScannedRepairs] = useState([]);
  const [scanMsg, setScanMsg] = useState(null); // { type: 'ok'|'warn'|'err', text }
  const scanMsgTimer = useRef(null);

  const showScanMsg = (type, text) => {
    setScanMsg({ type, text });
    if (scanMsgTimer.current) clearTimeout(scanMsgTimer.current);
    scanMsgTimer.current = setTimeout(() => setScanMsg(null), 4000);
  };

  // Listen for barcode-scan events dispatched by useBarcodeScanner
  useEffect(() => {
    const handleScan = async (e) => {
      e.preventDefault(); // prevent Sidebar from navigating to /repair/:id
      const repairId = e.detail.id;

      if (scannedRepairs.some(r => String(r.id) === String(repairId))) {
        showScanMsg('warn', `Repair #${repairId} is already in this charge.`);
        return;
      }

      try {
        const repair = await getRepair(repairId);
        if (repair.status !== 'ready') {
          showScanMsg('err', `Repair #${repair.claimNumber} is not ready for pickup (${repair.status}).`);
          return;
        }
        const due = calcAmountDue(repair);
        setScannedRepairs(prev => [...prev, { ...repair, amountDue: due }]);
        setAmount(prev => (parseFloat(prev || 0) + due).toFixed(2));
        showScanMsg('ok', `Added #${repair.claimNumber} — ${repair.clientName} ($${due.toFixed(2)})`);
      } catch {
        showScanMsg('err', `Repair #${repairId} not found.`);
      }
    };

    window.addEventListener('barcode-scan', handleScan);
    return () => window.removeEventListener('barcode-scan', handleScan);
  }, [scannedRepairs]);

  useEffect(() => {
    return () => {
      if (scanMsgTimer.current) clearTimeout(scanMsgTimer.current);
    };
  }, []);

  const removeRepair = (repair) => {
    setScannedRepairs(prev => prev.filter(r => r.id !== repair.id));
    setAmount(prev => Math.max(0, parseFloat(prev || 0) - repair.amountDue).toFixed(2));
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(val)) {
      setAmount(val);
      setErrorMsg('');
    }
  };

  const handleCharge = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setErrorMsg('Enter a valid amount greater than $0.00.');
      return;
    }
    setChargeState('loading');
    setErrorMsg('');
    try {
      await chargeTerminal({ amount: parsed, repairId: 0 });
      setChargeState('success');
      setAmount('');
      setScannedRepairs([]);
      setScanMsg(null);
      setTimeout(() => setChargeState('idle'), 8000);
    } catch (err) {
      setErrorMsg(err.message || 'Terminal charge failed.');
      setChargeState('idle');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCharge();
  };

  const scanMsgColors = {
    ok: 'text-green-500 bg-green-500/10 border-green-500/20',
    warn: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    err: 'text-red-400 bg-red-400/10 border-red-400/20',
  };

  const repairsTotal = scannedRepairs.reduce((sum, r) => sum + r.amountDue, 0);

  return (
    <div className="flex-1 p-8 flex items-start justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
          <CreditCard className="text-amber-500" size={24} /> Point of Sale
        </h1>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 shadow-sm">
          <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
            Charge Amount
          </label>

          <div className="flex items-center border-2 border-zinc-300 dark:border-zinc-700 focus-within:border-amber-500 rounded-lg mb-4 transition-colors">
            <span className="text-3xl font-bold text-zinc-400 dark:text-zinc-500 pl-4">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              onKeyDown={handleKeyDown}
              placeholder="0.00"
              disabled={chargeState === 'loading'}
              className="flex-1 bg-transparent text-3xl font-bold text-zinc-900 dark:text-white py-4 px-2 outline-none placeholder-zinc-300 dark:placeholder-zinc-700 disabled:opacity-40"
            />
          </div>

          <p className="text-xs text-zinc-400 dark:text-zinc-600 flex items-center gap-1 mb-4">
            <Barcode size={13} /> Scan a repair barcode to add it to this charge
          </p>

          {scanMsg && (
            <div className={`text-sm px-3 py-2 rounded-lg border mb-4 ${scanMsgColors[scanMsg.type]}`}>
              {scanMsg.text}
            </div>
          )}

          {errorMsg && (
            <p className="text-red-500 text-sm mb-4">{errorMsg}</p>
          )}

          {scannedRepairs.length > 0 && (
            <div className="mb-6">
              <h2 className="text-amber-600 dark:text-amber-500 text-xs font-semibold uppercase tracking-wide mb-2">
                Scanned Repairs
              </h2>
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                {scannedRepairs.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0 border-zinc-200 dark:border-zinc-700"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                        #{r.claimNumber} — {r.clientName}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">
                        {r.brand} {r.model}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-green-500 shrink-0">
                      ${r.amountDue.toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeRepair(r)}
                      className="text-zinc-400 hover:text-red-400 transition-colors shrink-0 ml-1"
                      aria-label="Remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between items-center px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 text-xs font-semibold">
                  <span className="text-zinc-500 dark:text-zinc-400">Repairs Total</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-100">${repairsTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {chargeState === 'success' ? (
            <div className="flex items-center justify-center gap-2 text-green-500 py-3">
              <CheckCircle size={20} />
              <span className="font-medium">Payment sent to terminal</span>
            </div>
          ) : (
            <button
              onClick={handleCharge}
              disabled={chargeState === 'loading' || !amount}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              <CreditCard size={18} />
              {chargeState === 'loading' ? 'Sending to terminal...' : 'Charge Terminal'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
