import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { Invoice, ShopSettings } from '../types';
import { 
  formatCurrencyPrecise, 
  formatDateDMY, 
  numberToWordsINR 
} from './formatters';

export async function generateInvoicePdf(
  invoice: Invoice,
  shop: ShopSettings,
  customerTotalBalance?: number
): Promise<void> {
  const a4WidthMm = 210;

  // 1. Check if the modal receipt is already mounted in the DOM
  let elementToCapture = document.getElementById('den-printable-receipt');
  let isTemp = false;

  // 2. If not mounted, create a temporary container off-screen with identical myBillBook A4 layout
  if (!elementToCapture) {
    isTemp = true;
    const tempDiv = document.createElement('div');
    tempDiv.id = 'temp-pdf-render-container';
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '750px';
    tempDiv.style.backgroundColor = '#FFFFFF';
    tempDiv.style.padding = '24px';
    tempDiv.style.fontFamily = "'Noto Sans Devanagari', 'Inter', system-ui, sans-serif";
    tempDiv.style.color = '#0f172a';
    tempDiv.style.boxSizing = 'border-box';
    tempDiv.style.border = '2px solid #b48a44';

    const totalQty = invoice.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    const dueDateTimestamp = invoice.createdAt + 7 * 24 * 60 * 60 * 1000;

    const itemsRows = invoice.items
      .map(
        (it, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px; border-right: 1px solid #e2e8f0; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 6px; border-right: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">
            ${it.nameHi || it.nameEn}
            ${it.isComplementary ? '<span style="font-size: 9px; font-weight: 800; color: #6b21a8; background: #f3e8ff; padding: 1px 4px; border-radius: 2px; margin-left: 4px;">[मुफ्त/Free]</span>' : ''}
          </td>
          <td style="padding: 6px; border-right: 1px solid #e2e8f0; text-align: center; color: #334155;">${it.quantity} ${it.unit}</td>
          <td style="padding: 6px; border-right: 1px solid #e2e8f0; text-align: right; color: #334155;">${it.isComplementary ? '₹0.00' : '₹' + Number(it.unitPrice).toFixed(2)}</td>
          <td style="padding: 6px; text-align: right; font-weight: 800; color: #0f172a;">${it.isComplementary ? '₹0.00' : '₹' + Number(it.total).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    tempDiv.innerHTML = `
      <div style="border: 1px solid rgba(180, 138, 68, 0.5); padding: 16px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid rgba(180, 138, 68, 0.4);">
          <div style="width: 70px; height: 70px; border: 1px solid #b48a44; padding: 4px; border-radius: 4px; text-align: center; background: #fffdf8;">
            <div style="font-weight: 900; font-size: 10px; color: #b48a44; margin-top: 20px;">M/S JYOTI</div>
          </div>

          <div style="flex: 1; padding: 0 16px; text-align: left;">
            <h1 style="margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; color: #0f172a;">${shop.shopName || 'M/S JYOTI GENERAL STORE'}</h1>
            <div style="font-size: 11px; font-weight: 800; color: #334155; margin-top: 2px;">GSTIN ${shop.gstin || '10AOGPC3358B2ZR'}</div>
            <div style="font-size: 10px; color: #475569; margin-top: 2px;">📞 ${shop.mobile || '9931300369'} • ✉️ ${shop.email || 'jyotigeneralstore11@gmail.com'}</div>
            <div style="font-size: 10px; color: #475569; margin-top: 2px;">📍 ${shop.address || 'महावीर स्थान मेघपुर दीप मार्केट, मेघपुर बड़ा सुरसंड पश्चिमी, Bihar, 843331'}</div>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">BILL OF SUPPLY</div>
            <div style="display: inline-block; margin-top: 4px; border: 1px solid #b48a44; background: #fdfbf6; padding: 2px 6px; font-size: 9px; font-weight: 800; text-transform: uppercase; border-radius: 2px;">ORIGINAL FOR RECIPIENT</div>
          </div>
        </div>

        <!-- Meta Strip -->
        <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(180, 138, 68, 0.4); border-bottom: 1px solid rgba(180, 138, 68, 0.4); padding: 8px 0; background: #fdfbf7; margin: 12px 0; text-align: center; font-size: 11px;">
          <div style="flex: 1; border-right: 1px solid rgba(180, 138, 68, 0.3);">
            <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase;">Invoice No.</div>
            <div style="font-weight: 900; color: #0f172a;">${invoice.invoiceNumber}</div>
          </div>
          <div style="flex: 1; border-right: 1px solid rgba(180, 138, 68, 0.3);">
            <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase;">Invoice Date</div>
            <div style="font-weight: 800; color: #0f172a;">${formatDateDMY(invoice.createdAt)}</div>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase;">Due Date</div>
            <div style="font-weight: 800; color: #0f172a;">${formatDateDMY(dueDateTimestamp)}</div>
          </div>
        </div>

        <!-- Bill To / Ship To -->
        <div style="display: flex; border: 1px solid rgba(180, 138, 68, 0.4); border-radius: 2px; margin-bottom: 12px; font-size: 11px;">
          <div style="flex: 1; padding: 8px; border-right: 1px solid rgba(180, 138, 68, 0.3);">
            <div style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase;">Bill To:</div>
            <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 2px;">${invoice.customerName || 'मनीष झा'}</div>
            ${invoice.customerMobile ? `<div style="color: #475569; margin-top: 2px;">📞 ${invoice.customerMobile}</div>` : ''}
            <div style="color: #475569; margin-top: 2px;">Place of Supply: <b style="color: #0f172a;">${shop.placeOfSupply || 'Bihar'}</b></div>
          </div>
          <div style="flex: 1; padding: 8px;">
            <div style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase;">Ship To:</div>
            <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 2px;">${invoice.customerName || 'मनीष झा'}</div>
            ${invoice.customerMobile ? `<div style="color: #475569; margin-top: 2px;">📞 ${invoice.customerMobile}</div>` : ''}
            <div style="color: #64748b; margin-top: 2px;">Bihar, India</div>
          </div>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid rgba(180, 138, 68, 0.6); margin-bottom: 12px;">
          <thead>
            <tr style="background: #f9f5ec; font-size: 10px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid rgba(180, 138, 68, 0.6);">
              <th style="padding: 6px; border-right: 1px solid rgba(180, 138, 68, 0.4); width: 35px; text-align: center;">No</th>
              <th style="padding: 6px; border-right: 1px solid rgba(180, 138, 68, 0.4); text-align: left;">Items</th>
              <th style="padding: 6px; border-right: 1px solid rgba(180, 138, 68, 0.4); width: 80px; text-align: center;">Qty.</th>
              <th style="padding: 6px; border-right: 1px solid rgba(180, 138, 68, 0.4); width: 80px; text-align: right;">Rate</th>
              <th style="padding: 6px; width: 90px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
            <tr style="background: #faf6ee; font-weight: 900; border-top: 2px solid rgba(180, 138, 68, 0.6); font-size: 11px;">
              <td colspan="2" style="padding: 6px; text-align: right; border-right: 1px solid #cbd5e1; text-transform: uppercase;">SUBTOTAL</td>
              <td style="padding: 6px; text-align: center; border-right: 1px solid #cbd5e1;">${Number(totalQty).toFixed(totalQty % 1 === 0 ? 0 : 2)}</td>
              <td style="padding: 6px; border-right: 1px solid #cbd5e1;"></td>
              <td style="padding: 6px; text-align: right;">₹${Number(invoice.subtotal).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Bottom Section -->
        <div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 8px;">
          <div style="flex: 1; font-size: 10px; color: #475569;">
            <div style="font-weight: 900; color: #334155; text-transform: uppercase; margin-bottom: 4px;">Terms and Conditions:</div>
            <ol style="margin: 0; padding-left: 14px; line-height: 1.6;">
              <li>Goods once sold will not be taken back or exchanged.</li>
              <li>All disputes are subject to Sursand jurisdiction only.</li>
            </ol>
            ${typeof customerTotalBalance === 'number' && customerTotalBalance > 0 ? `
              <div style="margin-top: 8px; padding: 6px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 4px; font-weight: 700; color: #92400e;">
                कुल शेष खाता बकाया: ₹${Number(customerTotalBalance).toFixed(2)}
              </div>
            ` : ''}
          </div>

          <div style="width: 260px;">
            <div style="border: 1px solid #cbd5e1; border-radius: 2px; background: #fffdfb; font-size: 11px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; padding: 6px; font-size: 13px; font-weight: 900; background: #f8f3e6; border-top: 2px solid #b48a44; border-bottom: 2px solid #b48a44;">
                <span>Total Amount:</span>
                <span>₹${Number(invoice.grandTotal).toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 5px 6px; border-bottom: 1px solid #f1f5f9;">
                <span>Received Amount:</span>
                <span>₹${Number(invoice.paidAmount).toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 5px 6px;">
                <span>Balance Due:</span>
                <span style="font-weight: 800; ${invoice.dueAmount > 0 ? 'color: #e11d48;' : ''}">₹${Number(invoice.dueAmount).toFixed(2)}</span>
              </div>
            </div>

            <div style="font-size: 10px; margin-bottom: 16px;">
              <span style="color: #64748b;">Total Amount (in words): </span>
              <span style="font-weight: 800; color: #0f172a;">${numberToWordsINR(invoice.grandTotal)}</span>
            </div>

            <div style="text-align: right; padding-top: 8px;">
              <div style="font-family: serif; font-style: italic; color: #475569; font-size: 13px;">Jyoti Gen Store</div>
              <div style="border-top: 1px solid #94a3b8; margin-top: 4px; padding-top: 2px; font-size: 9px; font-weight: 900; text-transform: uppercase;">Authorized Signature</div>
              <div style="font-size: 9px; color: #64748b;">For ${shop.shopName || 'M/S JYOTI GENERAL STORE'}</div>
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid rgba(180, 138, 68, 0.3); margin-top: 12px; padding-top: 6px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;">
          <span>Invoice created using myBillBook</span>
          <span>GST Compliant • Sursand, Bihar</span>
        </div>
      </div>
    `;

    document.body.appendChild(tempDiv);
    elementToCapture = tempDiv;
  }

  try {
    // 3. Render HTML to Canvas with high clarity
    const canvas = await html2canvas(elementToCapture, {
      scale: 2.2, // 2.2x retina clarity for ultra-sharp text
      useCORS: true,
      backgroundColor: '#FFFFFF',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 850
    });

    // 4. Calculate proper PDF height based on A4 aspect ratio
    const imgData = canvas.toDataURL('image/png');
    const pdfHeightMm = (canvas.height * a4WidthMm) / canvas.width;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [a4WidthMm, Math.max(297, pdfHeightMm)]
    });

    doc.addImage(imgData, 'PNG', 0, 0, a4WidthMm, pdfHeightMm, undefined, 'FAST');
    const cleanNumber = (invoice.invoiceNumber || 'bill').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`${cleanNumber}_sales_invoice.pdf`);
  } catch (err) {
    console.error('PDF generation error:', err);
    // Fallback: trigger standard browser print dialog
    window.print();
  } finally {
    if (isTemp && elementToCapture && elementToCapture.parentNode) {
      elementToCapture.parentNode.removeChild(elementToCapture);
    }
  }
}