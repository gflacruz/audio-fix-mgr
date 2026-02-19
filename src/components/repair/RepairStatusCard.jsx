import React from 'react';

export default function RepairStatusCard({ ticket, technicians, onStatusChange, onTechnicianChange }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium ml-1">Assigned Technician</label>
        <select
          value={ticket.technician || 'Unassigned'}
          onChange={(e) => onTechnicianChange(e.target.value)}
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
          onChange={(e) => onStatusChange(e.target.value)}
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
  );
}
