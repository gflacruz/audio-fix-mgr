import React from 'react';
import { Link } from 'react-router-dom';

const formatPhoneNumber = (str) => {
  const cleaned = ('' + str).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  return match ? '(' + match[1] + ') ' + match[2] + '-' + match[3] : str;
};

export default function ClientDetailsCard({ client }) {
  return (
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
  );
}
