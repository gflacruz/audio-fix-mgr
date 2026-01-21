export const printDiagnosticReceipt = (ticket, client) => {
  const printWindow = window.open('', '_blank');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt #${ticket.claimNumber || ticket.id}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .shop-name { font-size: 24px; font-weight: bold; color: #000; margin-bottom: 5px; }
        .doc-title { font-size: 18px; text-transform: uppercase; letter-spacing: 2px; color: #666; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .label { font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 4px; }
        .value { font-size: 16px; font-weight: 500; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        .table th { text-align: left; padding: 12px; border-bottom: 2px solid #000; font-size: 14px; text-transform: uppercase; }
        .table td { padding: 12px; border-bottom: 1px solid #eee; }
        .total-section { text-align: right; }
        .total-row { display: inline-block; min-width: 200px; }
        .grand-total { font-size: 20px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
        .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #888; }
        .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .paid { background: #dcfce7; color: #166534; }
        .unpaid { background: #fee2e2; color: #991b1b; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">AudioFix Manager</div>
        <div class="doc-title">Diagnostic Fee Receipt</div>
      </div>

      <div class="info-grid">
        <div>
          <div class="label">Client</div>
          <div class="value">${client?.name || 'N/A'}</div>
          <div style="font-size: 14px; color: #666; margin-top: 4px;">
            ${client?.phone || ''}<br>
            ${client?.email || ''}
          </div>
        </div>
        <div style="text-align: right;">
          <div class="label">Receipt Date</div>
          <div class="value">${new Date().toLocaleDateString()}</div>
          <div class="label" style="margin-top: 10px;">Ticket #</div>
          <div class="value">${ticket.claimNumber || ticket.id}</div>
        </div>
      </div>

      <div style="margin-bottom: 40px;">
        <div class="label">Unit Details</div>
        <div class="value">${ticket.brand} ${ticket.model}</div>
        <div style="font-size: 14px; color: #666;">Serial: ${ticket.serial || 'N/A'}</div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Diagnostic Fee - Standard Rate
              <div style="font-size: 12px; color: #888; margin-top: 4px;">Assessment and troubleshooting service</div>
            </td>
            <td style="text-align: right;">$89.00</td>
          </tr>
        </tbody>
      </table>

      <div class="total-section">
        <div class="total-row">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Subtotal:</span>
            <span>$89.00</span>
          </div>
          <div class="grand-total" style="display: flex; justify-content: space-between;">
            <span>Total:</span>
            <span>$89.00</span>
          </div>
          <div style="margin-top: 20px; text-align: right;">
            <span class="status-badge ${ticket.diagnosticFeeCollected ? 'paid' : 'unpaid'}">
              ${ticket.diagnosticFeeCollected ? 'PAID IN FULL' : 'PAYMENT DUE'}
            </span>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Thank you for your business!</p>
      </div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export const printRepairInvoice = (ticket, client) => {
  const printWindow = window.open('', '_blank');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice #${ticket.claimNumber || ticket.id}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .shop-name { font-size: 24px; font-weight: bold; color: #000; margin-bottom: 5px; }
        .doc-title { font-size: 18px; text-transform: uppercase; letter-spacing: 2px; color: #666; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .label { font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 4px; }
        .value { font-size: 16px; font-weight: 500; }
        .section-title { font-size: 14px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; text-transform: uppercase; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        .table th { text-align: left; padding: 12px; border-bottom: 2px solid #000; font-size: 14px; text-transform: uppercase; }
        .table td { padding: 12px; border-bottom: 1px solid #eee; }
        .line-input { border-bottom: 1px solid #ccc; display: inline-block; width: 100px; }
        .total-section { text-align: right; margin-top: 40px; }
        .total-row { display: flex; justify-content: flex-end; margin-bottom: 10px; font-size: 14px; }
        .total-label { width: 150px; text-align: right; padding-right: 20px; color: #666; }
        .total-value { width: 120px; text-align: right; font-weight: 500; }
        .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 15px; margin-top: 15px; }
        .notes-box { background: #f9f9f9; padding: 15px; border-radius: 4px; font-size: 14px; line-height: 1.5; margin-bottom: 30px; }
        .footer { margin-top: 60px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #888; }
        .signature-line { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
        .sig-box { border-top: 1px solid #333; padding-top: 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">AudioFix Manager</div>
        <div class="doc-title">Repair Invoice</div>
      </div>

      <div class="info-grid">
        <div>
          <div class="label">Bill To</div>
          <div class="value">${client?.name || 'N/A'}</div>
          <div style="font-size: 14px; color: #666; margin-top: 4px;">
            ${client?.address || ''}<br>
            ${client?.city ? client.city + ', ' : ''} ${client?.state || ''} ${client?.zip || ''}<br>
            ${client?.phone || ''}
          </div>
        </div>
        <div style="text-align: right;">
          <div class="label">Invoice Date</div>
          <div class="value">${new Date().toLocaleDateString()}</div>
          <div class="label" style="margin-top: 10px;">Ticket #</div>
          <div class="value">${ticket.claimNumber || ticket.id}</div>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <div class="section-title">Unit Information</div>
        <div style="display: flex; gap: 40px;">
          <div>
            <div class="label">Brand/Model</div>
            <div class="value">${ticket.brand} ${ticket.model}</div>
          </div>
          <div>
            <div class="label">Serial Number</div>
            <div class="value">${ticket.serial || 'N/A'}</div>
          </div>
          <div>
            <div class="label">Type</div>
            <div class="value">${ticket.unitType || 'Unit'}</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <div class="section-title">Service Notes</div>
        <div class="notes-box">
          <strong>Reported Issue:</strong> ${ticket.issue}<br><br>
          ${ticket.notes && ticket.notes.length > 0 ? `<strong>Technician Notes:</strong> ${ticket.notes[ticket.notes.length - 1].text}` : ''}
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th style="width: 60%;">Description</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Diagnostic Fee ${ticket.diagnosticFeeCollected ? '(Prepaid)' : ''}</td>
            <td style="text-align: right;">$89.00</td>
          </tr>
          <tr>
            <td>Labor</td>
            <td style="text-align: right; border-bottom: 1px solid #ccc;">&nbsp;</td>
          </tr>
          <tr>
            <td>Parts / Materials</td>
            <td style="text-align: right; border-bottom: 1px solid #ccc;">&nbsp;</td>
          </tr>
          <tr>
            <td>Other</td>
            <td style="text-align: right; border-bottom: 1px solid #ccc;">&nbsp;</td>
          </tr>
        </tbody>
      </table>

      <div class="total-section">
        <div class="total-row">
          <div class="total-label">Subtotal</div>
          <div class="total-value" style="border-bottom: 1px solid #ccc;">&nbsp;</div>
        </div>
        <div class="total-row">
          <div class="total-label">Tax</div>
          <div class="total-value" style="border-bottom: 1px solid #ccc;">&nbsp;</div>
        </div>
        <div class="total-row grand-total">
          <div class="total-label" style="color: #000;">Total Due</div>
          <div class="total-value" style="border-bottom: 1px solid #000;">&nbsp;</div>
        </div>
      </div>

      <div class="signature-line">
        <div class="sig-box">Technician Signature</div>
        <div class="sig-box">Customer Signature</div>
      </div>

      <div class="footer">
        <p>All repairs guaranteed for 90 days. Warranty covers labor and replaced parts only.</p>
        <p>AudioFix Manager • 1-800-FIX-AUDIO • www.audiofixmanager.com</p>
      </div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
