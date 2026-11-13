import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { Invoice, ShopSettings } from '../types';
import { formatCurrency, formatDateTime } from './formatters';

export async function generateInvoicePdf(
  invoice: Invoice,
  shop: ShopSettings,
  customerTotalBalance?: number
): Promise<void> {
  const is58mm = shop.thermalPaperWidth === '58mm';
  const widthMm = is58mm ? 58 : 80;
  const widthPx = is58mm ? 380 : 480;

  // 1. Check if the modal receipt is already mounted in the DOM
  let elementToCapture = document.getElementById('den-printable-receipt');
  let isTemp = false;

  // 2. If not mounted, create a temporary container off-screen
  if (!elementToCapture) {
    isTemp = true;
    const tempDiv = document.createElement('div');
    tempDiv.id = 'temp-pdf-render-container';
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = `${widthPx}px`;
    tempDiv.style.backgroundColor = '#FFFFFF';
    tempDiv.style.padding = '16px';
    tempDiv.style.fontFamily = "'Noto Sans Devanagari', 'Inter', system-ui, sans-serif";
    tempDiv.style.color = '#0f172a';
    tempDiv.style.boxSizing = 'border-box';

    const itemsRows = invoice.items
      .map(
        (it) => `
        <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; border-bottom: 1px dashed #e2e8f0;">
          <div style="flex: 1; text-align: left; font-weight: 600;">${it.nameHi || it.nameEn}</div>
          <div style="width: 70px; text-align: center; color: #64748b;">${it.quantity} ${it.unit}</div>
          <div style="width: 50px; text-align: right; color: #64748b;">${it.unitPrice}</div>
          <div style="width: 60px; text-align: right; font-weight: 700;">₹${Math.round(it.total)}</div>
        </div>
      `
      )
      .join('');

    tempDiv.innerHTML = `
      <div style="text-align: center; margin-bottom: 8px;">
        <h2 style="margin: 0; font-size: 16px; font-weight: 900; text-transform: uppercase;">${shop.shopName || 'DEN किराना स्टोर'}</h2>
        ${shop.tagline ? `<p style="margin: 2px 0; font-size: 10px; color: #64748b;">${shop.tagline}</p>` : ''}
        ${shop.address ? `<p style="margin: 2px 0; font-size: 10px; color: #475569;">${shop.address}</p>` : ''}
        ${shop.mobile ? `<p style="margin: 2px 0; font-size: 10px; color: #475569;">फोन: ${shop.mobile}</p>` : ''}
        ${shop.gstin ? `<p style="margin: 2px 0; font-size: 10px; color: #475569;">GSTIN: ${shop.gstin}</p>` : ''}
      </div>

      <div style="border-top: 1px dashed #94a3b8; padding-top: 6px; margin-bottom: 6px; font-size: 11px; display: flex; justify-content: space-between;">
        <span style="font-weight: 700;">बिल #${invoice.invoiceNumber}</span>
        <span style="color: #64748b;">${formatDateTime(invoice.createdAt, 'hi')}</span>
      </div>

      ${invoice.customerName ? `
        <div style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: flex; justify-content: space-between;">
          <span>ग्राहक: ${invoice.customerName}</span>
          ${invoice.customerMobile ? `<span>${invoice.customerMobile}</span>` : ''}
        </div>
      ` : ''}

      <div style="border-top: 1px dashed #94a3b8; padding-top: 6px; margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px;">
          <div style="flex: 1; text-align: left;">सामान</div>
          <div style="width: 70px; text-align: center;">मात्रा</div>
          <div style="width: 50px; text-align: right;">रेट</div>
          <div style="width: 60px; text-align: right;">रुपये</div>
        </div>
        ${itemsRows}
      </div>

      <div style="border-top: 1px dashed #94a3b8; padding-top: 6px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span>कुल जोड़ (Subtotal):</span>
          <span>₹${Math.round(invoice.subtotal)}</span>
        </div>
        ${invoice.discount > 0 ? `
          <div style="display: flex; justify-content: space-between; color: #047857; margin-bottom: 3px;">
            <span>छूट (Discount):</span>
            <span>-₹${Math.round(invoice.discount)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; border-top: 1px solid #0f172a; padding-top: 4px; margin-bottom: 4px;">
          <span>कुल देय (Grand Total):</span>
          <span>₹${Math.round(invoice.grandTotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; color: #475569; margin-bottom: 3px;">
          <span>जमा भुगतान (${invoice.paymentMethod}):</span>
          <span>₹${Math.round(invoice.paidAmount)}</span>
        </div>
        ${invoice.dueAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; font-weight: 800; color: #b91c1c; margin-bottom: 3px;">
            <span>इस बिल का उधार:</span>
            <span>₹${Math.round(invoice.dueAmount)}</span>
          </div>
        ` : ''}
        ${typeof customerTotalBalance === 'number' ? `
          <div style="display: flex; justify-content: space-between; font-weight: 800; background-color: #fef3c7; padding: 4px; border-radius: 4px; color: #78350f; margin-top: 4px;">
            <span>कुल शेष उधारी बकाया:</span>
            <span>₹${Math.round(customerTotalBalance)}</span>
          </div>
        ` : ''}
      </div>

      <div style="border-top: 1px dashed #94a3b8; padding-top: 8px; margin-top: 8px; text-align: center; font-size: 10px; color: #64748b;">
        <p style="margin: 0; font-weight: 600;">🙏 धन्यवाद! फिर पधारें 🙏</p>
        <p style="margin: 2px 0 0 0; font-size: 9px; color: #94a3b8;">Powered by DEN Kirana POS</p>
      </div>
    `;

    document.body.appendChild(tempDiv);
    elementToCapture = tempDiv;
  }

  try {
    // 3. Render HTML to Canvas with full Hindi font rendering
    const canvas = await html2canvas(elementToCapture, {
      scale: 2.5, // 2.5x retina clarity for ultra-sharp text
      useCORS: true,
      backgroundColor: '#FFFFFF',
      logging: false
    });

    // 4. Calculate proper PDF height based on content aspect ratio
    const imgData = canvas.toDataURL('image/png');
    const pdfHeightMm = (canvas.height * widthMm) / canvas.width;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [widthMm, pdfHeightMm]
    });

    doc.addImage(imgData, 'PNG', 0, 0, widthMm, pdfHeightMm, undefined, 'FAST');
    doc.save(`DEN_Bill_${invoice.invoiceNumber}.pdf`);
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
