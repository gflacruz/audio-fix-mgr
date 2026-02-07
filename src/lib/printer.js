const formatPhone = (phone) => {
  if (!phone) return "";
  const cleaned = ('' + phone).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return phone;
};

const LOGO_SVG = `<svg width="140" height="60" viewBox="0 0 140 60" xmlns="http://www.w3.org/2000/svg">
  <!-- Icon Box -->
  <rect x="2" y="2" width="56" height="56" rx="6" stroke="#000" stroke-width="2.5" fill="none"/>
  <text x="30" y="38" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="22" text-anchor="middle" fill="#000">STI</text>
  
  <!-- Stylized Lines -->
  <path d="M68 15 L120 15" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M68 30 L100 30" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M68 45 L130 45" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

export const printDiagnosticReceipt = (ticket, client) => {
  const printWindow = window.open("", "_blank");
  
  // Use depositAmount (new field) or diagnosticFee (legacy) or default to 89.00
  const feeAmount = ticket.depositAmount ? parseFloat(ticket.depositAmount) : (ticket.diagnosticFee > 0 ? parseFloat(ticket.diagnosticFee) : 89.00);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt #${ticket.claimNumber || ticket.id}</title>
      <style>
        *, *::before, *::after { box-sizing: border-box; }
        @media print { 
          @page { margin: 0.5cm; }
          body { -webkit-print-color-adjust: exact; }
        }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #333; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
        .shop-info { text-align: right; }
        .shop-name { font-size: 24px; font-weight: bold; color: #000; margin-bottom: 5px; }
        .doc-title { font-size: 18px; text-transform: uppercase; letter-spacing: 2px; color: #666; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .label { font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 2px; }
        .value { font-size: 14px; font-weight: 500; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table th { text-align: left; padding: 8px; border-bottom: 2px solid #000; font-size: 12px; text-transform: uppercase; }
        .table td { padding: 8px; border-bottom: 1px solid #eee; font-size: 14px; }
        .total-section { text-align: right; }
        .total-row { display: inline-block; min-width: 200px; }
        .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
        .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #888; }
        .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .paid { background: #dcfce7; color: #166534; }
        .unpaid { background: #fee2e2; color: #991b1b; }
        @media print {
          body {
            width: 100% !important;
            max-width: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>${LOGO_SVG}</div>
        <div class="shop-info">
          <div class="shop-name">Sound Technology Inc</div>
          <div style="font-size: 14px; color: #666; margin-bottom: 5px;">4508 Oak Fair Blvd. Suite 104 Tampa, FL 33610</div>
          <div style="font-size: 14px; color: #666; margin-bottom: 10px;">(813) 985-1120</div>
          <div class="doc-title">Diagnostic Fee Receipt</div>
        </div>
      </div>

      <div class="info-grid">
        <div>
          <div class="label">Client</div>
          <div class="value">${client?.name || "N/A"}</div>
          <div style="font-size: 14px; color: #666; margin-top: 4px;">
            ${formatPhone(client?.phone) || ""}<br>
            ${client?.email || ""}
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
        <div style="font-size: 14px; color: #666; margin-top: 4px;">
          <strong>Serial:</strong> ${ticket.serial || "N/A"}<br>
          <strong>Type:</strong> ${ticket.unitType || "N/A"}<br>
          <strong>Accessories:</strong> ${ticket.accessoriesIncluded || "None"}<br>
          <strong>Reported Issue:</strong> ${ticket.issue || "N/A"}
        </div>
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
            <td style="text-align: right;">$${feeAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div class="total-section">
        <div class="total-row">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Subtotal:</span>
            <span>$${feeAmount.toFixed(2)}</span>
          </div>
          <div class="grand-total" style="display: flex; justify-content: space-between;">
            <span>Total:</span>
            <span>$${feeAmount.toFixed(2)}</span>
          </div>
          <div style="margin-top: 20px; text-align: right;">
            <span class="status-badge ${ticket.diagnosticFeeCollected ? "paid" : "unpaid"}">
              ${ticket.diagnosticFeeCollected ? "PAID IN FULL" : "PAYMENT DUE"}
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
  const printWindow = window.open("", "_blank");

  // Calculate totals
  const partsTotal =
    ticket.parts?.reduce((sum, p) => sum + (p.total || 0), 0) || 0;
  const laborTotal = ticket.laborCost || 0;
  const shippingTotal = ticket.returnShippingCost || 0;
  const onSiteFee = ticket.isOnSite ? 125.00 : 0;
  const rushFee = ticket.priority === 'rush' ? 100.00 : 0;

  // Tax 7.5% on parts and labor
  const tax = ticket.isTaxExempt ? 0 : (partsTotal + laborTotal) * 0.075;

  const subtotal = partsTotal + laborTotal + shippingTotal + onSiteFee + rushFee;
  const totalWithTax = subtotal + tax;
  const diagnosticFee = ticket.depositAmount ? parseFloat(ticket.depositAmount) : (ticket.diagnosticFee > 0 ? parseFloat(ticket.diagnosticFee) : 89.00);

  const amountDue = ticket.diagnosticFeeCollected
    ? Math.max(0, totalWithTax - diagnosticFee)
    : totalWithTax;

  // Generate Parts Rows
  // Filter: Only show "Custom Parts" (Billable items with price > 0). 
  // Inventory parts tracked at $0.00 are hidden from the customer invoice.
  const billableParts = ticket.parts?.filter(p => p.total > 0) || [];

  const partsRows =
    billableParts.length > 0
      ? billableParts
          .map(
            (part) => `
        <tr>
          <td>${part.name} <span style="font-size: 12px; color: #666;">(x${part.quantity})</span></td>
          <td style="text-align: right;">$${(part.total || 0).toFixed(2)}</td>
        </tr>
      `,
          )
          .join("")
      : `<tr><td colspan="2" style="font-style: italic; color: #888;">No parts used</td></tr>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice #${ticket.claimNumber || ticket.id}</title>
      <style>
        *, *::before, *::after { box-sizing: border-box; }
        @media print { 
          @page { margin: 0.5cm; }
          body { -webkit-print-color-adjust: exact; }
        }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 25px; max-width: 800px; margin: 0 auto; color: #333; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
        .shop-info { text-align: right; }
        .shop-name { font-size: 22px; font-weight: bold; color: #000; margin-bottom: 5px; }
        .doc-title { font-size: 16px; text-transform: uppercase; letter-spacing: 2px; color: #666; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .label { font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 2px; }
        .value { font-size: 14px; font-weight: 500; }
        .section-title { font-size: 13px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-bottom: 10px; text-transform: uppercase; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table th { text-align: left; padding: 8px; border-bottom: 2px solid #000; font-size: 12px; text-transform: uppercase; }
        .table td { padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; }
        .line-input { border-bottom: 1px solid #ccc; display: inline-block; width: 100px; }
        .total-section { text-align: right; margin-top: 20px; }
        .total-row { display: flex; justify-content: flex-end; margin-bottom: 5px; font-size: 13px; }
        .total-label { width: 150px; text-align: right; padding-right: 20px; color: #666; }
        .total-value { width: 120px; text-align: right; font-weight: 500; }
        .grand-total { font-size: 16px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
        .notes-box { background: #f9f9f9; padding: 10px; border-radius: 4px; font-size: 13px; line-height: 1.4; margin-bottom: 20px; }
        .footer { margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; font-size: 11px; color: #888; }
        .signature-line { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
        .sig-box { border-top: 1px solid #333; padding-top: 5px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
        @media print {
          body {
            width: 100% !important;
            max-width: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>${LOGO_SVG}</div>
        <div class="shop-info">
          <div class="shop-name">Sound Technology Inc</div>
          <div style="font-size: 14px; color: #666; margin-bottom: 5px;">4508 Oak Fair Blvd. Suite 104 Tampa, FL 33610</div>
          <div style="font-size: 14px; color: #666; margin-bottom: 10px;">(813) 985-1120</div>
          <div class="doc-title">Repair Invoice</div>
        </div>
      </div>

      <div class="info-grid">
        <div>
          <div class="label">Bill To</div>
          <div class="value">${client?.name || "N/A"}</div>
          <div style="font-size: 14px; color: #666; margin-top: 4px;">
            ${client?.address || ""}<br>
            ${client?.city ? client.city + ", " : ""} ${client?.state || ""} ${client?.zip || ""}<br>
            ${formatPhone(client?.phone) || ""}
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
            <div class="value">${ticket.serial || "N/A"}</div>
          </div>
          <div>
            <div class="label">Type</div>
            <div class="value">${ticket.unitType || "Unit"}</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <div class="section-title">Service Notes</div>
        <div class="notes-box">
          <strong>Reported Issue:</strong> ${ticket.issue}<br><br>
          <strong>Work Performed:</strong><br>
          <div style="white-space: pre-wrap; margin-top: 5px;">${ticket.workPerformed || "No details provided."}</div>
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
          <!-- Parts -->
          <tr>
            <td colspan="2" style="background: #f0f0f0; font-weight: bold; font-size: 12px; padding: 8px 12px;">PARTS & MATERIALS</td>
          </tr>
          ${partsRows}
          
          <!-- Labor -->
          <tr>
            <td colspan="2" style="background: #f0f0f0; font-weight: bold; font-size: 12px; padding: 8px 12px;">LABOR & SERVICES</td>
          </tr>
          <tr>
            <td>Labor Charges</td>
            <td style="text-align: right;">$${laborTotal.toFixed(2)}</td>
          </tr>
          ${
            ticket.isOnSite
              ? `
          <tr>
            <td>On Site Service Fee</td>
            <td style="text-align: right;">$${onSiteFee.toFixed(2)}</td>
          </tr>
          `
              : ""
          }
          ${
            ticket.priority === 'rush'
              ? `
          <tr>
            <td>Rush Service Fee</td>
            <td style="text-align: right;">$${rushFee.toFixed(2)}</td>
          </tr>
          `
              : ""
          }
          ${
            ticket.returnShippingCost
              ? `
          <tr>
            <td>Return Shipping (${ticket.returnShippingCarrier || "Standard"})</td>
            <td style="text-align: right;">$${shippingTotal.toFixed(2)}</td>
          </tr>
          `
              : ""
          }
        </tbody>
      </table>

      <div class="total-section">
        <div class="total-row">
          <div class="total-label">Subtotal</div>
          <div class="total-value">$${subtotal.toFixed(2)}</div>
        </div>
        <div class="total-row">
          <div class="total-label">Sales Tax (7.5%)</div>
          <div class="total-value">${ticket.isTaxExempt ? 'EXEMPT' : '$' + tax.toFixed(2)}</div>
        </div>
        ${
          ticket.diagnosticFeeCollected
            ? `
        <div class="total-row" style="color: #166534;">
          <div class="total-label">Less Prepaid Fee</div>
          <div class="total-value">-$${diagnosticFee.toFixed(2)}</div>
        </div>
        `
            : ""
        }
        <div class="total-row grand-total">
          <div class="total-label" style="color: #000;">Total Due</div>
          <div class="total-value">$${amountDue.toFixed(2)}</div>
        </div>
      </div>



      <div class="footer">
        <p>All repairs guaranteed for 90 days. Warranty covers labor and replaced parts only.</p>
        <p>Sound Technology Inc • (813) 985-1120 • www.soundtechnologyinc.com</p>
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
