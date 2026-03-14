interface TicketData {
  organization: {
    name: string;
    address?: string;
    taxId?: string; // CUIT
    logoUrl?: string;
    vatCondition?: string; // Responsable Inscripto, Monotributo
    iibb?: string;
    startDate?: string;
  };
  sale: {
    id: string; // Internal ID or formatted number
    date: string;
    items: Array<{ name: string; quantity: number; price: number; total_price?: number; variant_name?: string }>; // Normalize
    total: number;
    paymentMethod: string;
    invoiceLetter?: string; // A, B, C
    invoiceNumber?: string; // The official number 00001-00000001
    ticketNumber?: string; // Internal Ticket Number (e.g. T-0001)

    // Legal Fiscal Data
    cae?: string;
    caeExpiration?: string;

    customer?: {
      name: string;
      id?: string; // CUIT/DNI
      address?: string;
      vatCondition?: string;
    };

    fiscalData?: any; // Legacy or extra props
  };
  settings: {
    headerText?: string;
    footerText?: string;
    width: '80mm' | '58mm';
  };
}

// Export generator for Preview use
export const generateTicketHtml = (data: TicketData) => {
  const widthCss = data.settings.width === '58mm' ? '58mm' : '80mm';

  const format = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const docTypeLabel =
    data.sale.invoiceLetter === 'A' ? 'FACTURA A' :
      data.sale.invoiceLetter === 'B' ? 'FACTURA B' :
        data.sale.invoiceLetter === 'C' ? 'FACTURA C' : 'TICKET';

  const customerName = data.sale.customer?.name || data.sale.fiscalData?.legal_name || 'Consumidor Final';
  const customerDoc = data.sale.customer?.id || data.sale.fiscalData?.cuit || '---';
  const customerCond = data.sale.customer?.vatCondition || data.sale.fiscalData?.vat_condition || 'Consumidor Final';

  // Fallback for invoice number if not explicitly passed
  // Priority: 1. Official Invoice Number (fiscal) 2. Custom Ticket Number (internal) 3. Fiscal Receipt Number 4. ID Fallback
  const invoiceNum = data.sale.invoiceNumber || data.sale.ticketNumber || (data.sale.fiscalData?.cbte_nro ? `00000-${String(data.sale.fiscalData.cbte_nro).padStart(8, '0')}` : `#${data.sale.id.slice(-8)}`);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${docTypeLabel} ${invoiceNum}</title>
        <style>
          @page { margin: 0; }
          body { 
            font-family: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif;
            width: ${widthCss}; 
            margin: 0 auto; 
            padding: 5px; 
            font-size: 10px;
            color: #000;
            background: #fff;
            line-height: 1.2;
          }
          
          /* Utility Classes */
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .uppercase { text-transform: uppercase; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
          
          /* Sections */
          .header { margin-bottom: 8px; }
          .logo { max-width: 50%; max-height: 80px; margin: 0 auto 5px auto; display: block; }
          .business-name { font-size: 14px; font-weight: 800; margin-bottom: 2px; }
          .info-text { font-size: 9px; color: #333; }
          
          .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
          .divider-solid { border-bottom: 1px solid #000; margin: 6px 0; }
          
          /* Document Info */
          .doc-title { font-size: 12px; font-weight: 800; margin-top: 4px; }
          .doc-number { font-size: 11px; margin-bottom: 2px; }
          
          /* Customer Info */
          .customer-block { font-size: 9px; margin: 4px 0; }
          .customer-label { font-weight: 600; margin-right: 4px; }
          
          /* Items Table */
          .items-table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 9px; }
          .items-table th { text-align: left; border-bottom: 1px solid #000; font-weight: 700; padding-bottom: 2px; text-transform: uppercase; }
          .items-table td { padding: 3px 0; vertical-align: top; }
          .col-qty { width: 20px; text-align: center; }
          .col-desc { padding-left: 4px; }
          .col-price { text-align: right; width: 55px; white-space: nowrap;}
          
          /* Totals */
          .totals-section { margin-top: 8px; }
          .row-subtotal { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 9px; color: #444; }
          .row-total { display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; margin-top: 6px; border-top: 1px solid #000; padding-top: 4px; }
          .payment-info { text-align: right; font-size: 9px; margin-top: 4px; font-style: italic; }
          
          /* Fiscal Block */
          .fiscal-block { margin-top: 12px; text-align: center; border: 1px solid #000; padding: 4px; border-radius: 4px; }
          .fiscal-row { font-size: 10px; font-weight: 700; }
          .fiscal-text { font-size: 9px; margin-top: 2px; text-transform: uppercase; }
          
          /* Footer */
          .footer { margin-top: 12px; text-align: center; font-size: 9px; color: #444; white-space: pre-wrap; }

          
          /* Print Fixes */
          @media print {
            body { padding: 0; width: 100%; }
          }
        </style>
      </head>
      <body>
        
        <!-- Header -->
        <div class="header text-center">
          ${data.organization.logoUrl ? `<img src="${data.organization.logoUrl}" class="logo" />` : ''}
          <div class="business-name uppercase">${data.organization.name}</div>
          <div class="info-text">${data.organization.address || ''}</div>
          <div class="info-text"><span class="font-bold">CUIT:</span> ${data.organization.taxId || '---'}</div>
          ${data.organization.iibb ? `<div class="info-text">Ing. Brutos: ${data.organization.iibb}</div>` : ''}
          ${data.organization.startDate ? `<div class="info-text">Inicio de Act.: ${data.organization.startDate}</div>` : ''}
          <div class="info-text uppercase">${data.organization.vatCondition || 'Resp. Inscripto'}</div>
          ${data.settings.headerText ? `<div class="info-text" style="margin-top: 5px; border-top: 1px dashed #ccc; padding-top: 2px;">${data.settings.headerText}</div>` : ''}
        </div>

        <div class="divider-solid"></div>

        <!-- Document Info -->
        <div class="text-center">
          <div class="doc-title">${docTypeLabel}</div>
          <div class="doc-number">Nro: <span class="font-bold">${invoiceNum}</span></div>
          <div class="info-text">${formatDate(data.sale.date)}</div>
        </div>

        <div class="divider"></div>

        <!-- Customer -->
        <div class="customer-block">
          ${customerName !== 'Consumidor Final' ? `<div class="font-bold uppercase" style="margin-bottom:2px;">${customerName}</div>` : ''}
          <div class="flex"><span class="customer-label">CLIENTE:</span> <span>${customerName}</span></div>
          <div class="flex"><span class="customer-label">DOC:</span> <span>${customerDoc}</span></div>
          <div class="flex"><span class="customer-label">COND. IVA:</span> <span>${customerCond}</span></div>
          ${data.sale.customer?.address ? `<div class="flex"><span class="customer-label">DOM:</span> <span>${data.sale.customer.address}</span></div>` : ''}
        </div>

        <div class="divider-solid"></div>

        <!-- Items -->
        <table class="items-table">
          <thead>
            <tr>
              <th class="col-qty">Cnt</th>
              <th class="col-desc">Producto</th>
              <th class="col-price">Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.sale.items.map(item => `
              <tr>
                <td class="col-qty">${item.quantity}</td>
                <td class="col-desc">
                    <div style="font-weight: 600;">${item.name}</div>
                    ${item.variant_name ? `<div style="font-size: 8px; text-transform: uppercase;">${item.variant_name}</div>` : ''}
                </td>
                <td class="col-price">${format((item.price * item.quantity))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="divider"></div>

        <!-- Totals -->
        <div class="totals-section">
          ${data.sale.invoiceLetter === 'A' ? `
             <div class="row-subtotal"><span>Subtotal Neto:</span> <span>${format(data.sale.total / 1.21)}</span></div>
             <div class="row-subtotal"><span>IVA (21%):</span> <span>${format(data.sale.total - (data.sale.total / 1.21))}</span></div> 
          ` : ''}
          
          <div class="row-total">
            <span>TOTAL</span>
            <span>${format(data.sale.total)}</span>
          </div>
          <div class="payment-info">
            Pago con: <span class="font-bold uppercase">${(data.sale.paymentMethod || 'Efectivo')}</span>
          </div>
        </div>

        <!-- Fiscal / Validator -->
        ${data.sale.cae ? `
          <div class="fiscal-block">
            <div class="fiscal-row">CAE: ${data.sale.cae}</div>
            <div class="fiscal-row">VTO: ${data.sale.caeExpiration ? new Date(data.sale.caeExpiration).toLocaleDateString('es-AR') : '---'}</div>
            <div class="fiscal-text">Comprobante Autorizado</div>
          </div>
        ` : `
          <div class="text-center" style="margin-top: 15px; color: #888; font-style: italic; font-size: 9px;">
             Documento no válido como factura
          </div>
        `}

        <div class="divider" style="margin-top: 15px;"></div>
        
        <div class="footer">
          ${data.settings.footerText || ''}
        </div>

      <script>
        window.onafterprint = function() {
           setTimeout(function() { window.close(); }, 500);
        };
      </script>
      </body>
    </html>
  `;
};

export const printTicket = (data: TicketData) => {
  // Use a unique name to avoid caching issues sometimes
  const printWindow = window.open('', 'PRINT_WINDOW', 'width=1100,height=850');

  if (!printWindow) {
    alert('Por favor habilita las ventanas emergentes para imprimir tickets.');
    return;
  }

  const htmlContent = generateTicketHtml(data);

  // Robust Print Logic
  try {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to render
    setTimeout(() => {
      printWindow.focus();
      try {
        // Use explicit undefined or empty string if null is not allowed, though MDN says null is fine. 
        // TS might be stricter.
        const result = printWindow.document.execCommand('print', false, undefined) as any;
        if (!result) printWindow.print();
      } catch (e) {
        printWindow.print();
      }
      // Uncomment to close automatically after print (check user preference)
      // printWindow.close();
    }, 500);

  } catch (e) {
    console.error("Print Error", e);
    alert("Error iniciando impresión");
  }
};