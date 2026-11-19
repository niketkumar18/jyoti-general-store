import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { Invoice, ShopSettings } from '../types';
import { 
  formatDateDMY, 
  numberToWordsINR 
} from './formatters';

/**
 * Generates the clean A4 Bill of Supply HTML body matching the official myBillBook template.
 */
export function getInvoiceBodyHtml(
  invoice: Invoice,
  shop: ShopSettings,
  customerTotalBalance?: number
): string {
  const totalQty = invoice.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const dueDateTimestamp = invoice.createdAt + 7 * 24 * 60 * 60 * 1000;

  const itemsRows = invoice.items
    .map(
      (it, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; page-break-inside: avoid; break-inside: avoid;">
        <td style="padding: 6px 8px; border-right: 1px solid #e2e8f0; text-align: center; color: #64748b; width: 35px;">${idx + 1}</td>
        <td style="padding: 6px 8px; border-right: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">
          <span>${it.nameHi || it.nameEn}</span>
          ${it.isComplementary ? '<span style="font-size: 9px; font-weight: 800; color: #6b21a8; background: #f3e8ff; border: 1px solid #d8b4fe; padding: 1px 5px; border-radius: 3px; margin-left: 6px;">[🎁 मुफ्त / Free]</span>' : ''}
          ${!it.isComplementary && it.discountPercentage ? `<span style="font-size: 9px; color: #b45309; font-weight: 600; display: block; margin-top: 1px;">(${it.discountPercentage}% छूट @ ₹${Number(it.unitPrice).toFixed(2)})</span>` : ''}
        </td>
        <td style="padding: 6px 8px; border-right: 1px solid #e2e8f0; text-align: center; color: #334155; width: 75px; font-weight: 600;">${it.quantity} ${it.unit}</td>
        <td style="padding: 6px 8px; border-right: 1px solid #e2e8f0; text-align: right; color: #334155; width: 75px; font-weight: 500;">${it.isComplementary ? '₹0.00' : '₹' + Number(it.unitPrice).toFixed(2)}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #0f172a; width: 85px;">${it.isComplementary ? '₹0.00' : '₹' + Number(it.total).toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <div style="border: 2px solid #b48a44; padding: 16px; background: #ffffff; box-sizing: border-box; width: 100%; max-width: 794px; margin: 0 auto; color: #0f172a; font-family: 'Noto Sans Devanagari', 'Inter', system-ui, sans-serif;">
      <!-- Inner Border Accent Frame -->
      <div style="border: 1px solid rgba(180, 138, 68, 0.45); padding: 14px;">
        
        <!-- Header: Avatar + Shop Info + BILL OF SUPPLY -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid rgba(180, 138, 68, 0.4); gap: 12px;">
          <!-- Shop Monogram Logo -->
          <div style="width: 70px; height: 70px; border: 1.5px solid #b48a44; padding: 3px; border-radius: 4px; text-align: center; background: #fffdf8; display: flex; flex-direction: column; align-items: center; justify-content: center; shrink-0: 0;">
            <div style="font-weight: 900; font-size: 11px; color: #996d2e; line-height: 1.2;">M/S JYOTI</div>
            <div style="font-size: 8px; font-weight: 700; color: #b48a44; text-transform: uppercase;">GEN STORE</div>
          </div>

          <!-- Shop Center Info -->
          <div style="flex: 1; padding: 0 10px; text-align: left;">
            <h1 style="margin: 0; font-size: 17px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: -0.2px;">${shop.shopName || 'M/S JYOTI GENERAL STORE'}</h1>
            <div style="font-size: 11px; font-weight: 800; color: #334155; margin-top: 2px;">GSTIN ${shop.gstin || '10AOGPC3358B2ZR'}</div>
            <div style="font-size: 10px; color: #475569; margin-top: 2px;">📞 ${shop.mobile || '9931300369'} • ✉️ ${shop.email || 'jyotigeneralstore11@gmail.com'}</div>
            <div style="font-size: 10px; color: #475569; margin-top: 2px; line-height: 1.3;">📍 ${shop.address || 'महावीर स्थान मेघपुर दीप मार्केट, मेघपुर बड़ा सुरसंड पश्चिमी, Bihar, 843331'}</div>
          </div>

          <!-- Right Badge: BILL OF SUPPLY -->
          <div style="text-align: right; min-width: 140px;">
            <div style="font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">BILL OF SUPPLY</div>
            <div style="display: inline-block; margin-top: 4px; border: 1px solid #b48a44; background: #fdfbf6; padding: 2px 7px; font-size: 9px; font-weight: 800; text-transform: uppercase; border-radius: 2px; color: #475569;">ORIGINAL FOR RECIPIENT</div>
          </div>
        </div>

        <!-- Meta Strip (Invoice #, Date, Due Date) -->
        <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(180, 138, 68, 0.4); border-bottom: 1px solid rgba(180, 138, 68, 0.4); padding: 7px 0; background: #fdfbf7; margin: 10px 0; text-align: center; font-size: 11px;">
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

        <!-- Bill To / Ship To 2-Column Box -->
        <div style="display: flex; border: 1px solid rgba(180, 138, 68, 0.4); border-radius: 2px; margin-bottom: 10px; font-size: 11px; background: #fffdfa;">
          <div style="flex: 1; padding: 7px 10px; border-right: 1px solid rgba(180, 138, 68, 0.3);">
            <div style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase;">Bill To:</div>
            <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">${invoice.customerName || 'मनीष झा'}</div>
            ${invoice.customerMobile ? `<div style="color: #475569; margin-top: 1px; font-size: 10px;">📞 ${invoice.customerMobile}</div>` : ''}
            <div style="color: #475569; margin-top: 1px; font-size: 10px;">Place of Supply: <b style="color: #0f172a;">${shop.placeOfSupply || 'Bihar'}</b></div>
          </div>
          <div style="flex: 1; padding: 7px 10px;">
            <div style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase;">Ship To:</div>
            <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">${invoice.customerName || 'मनीष झा'}</div>
            ${invoice.customerMobile ? `<div style="color: #475569; margin-top: 1px; font-size: 10px;">📞 ${invoice.customerMobile}</div>` : ''}
            <div style="color: #64748b; margin-top: 1px; font-size: 10px;">Bihar, India</div>
          </div>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid rgba(180, 138, 68, 0.6); margin-bottom: 10px;">
          <thead>
            <tr style="background: #f9f5ec; font-size: 10px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid rgba(180, 138, 68, 0.6);">
              <th style="padding: 6px 8px; border-right: 1px solid rgba(180, 138, 68, 0.4); width: 35px; text-align: center;">No</th>
              <th style="padding: 6px 8px; border-right: 1px solid rgba(180, 138, 68, 0.4); text-align: left;">Items</th>
              <th style="padding: 6px 8px; border-right: 1px solid rgba(180, 138, 68, 0.4); width: 75px; text-align: center;">Qty.</th>
              <th style="padding: 6px 8px; border-right: 1px solid rgba(180, 138, 68, 0.4); width: 75px; text-align: right;">Rate</th>
              <th style="padding: 6px 8px; width: 85px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
            <tr style="background: #faf6ee; font-weight: 900; border-top: 2px solid rgba(180, 138, 68, 0.6); font-size: 11px; page-break-inside: avoid; break-inside: avoid;">
              <td colspan="2" style="padding: 6px 8px; text-align: right; border-right: 1px solid #cbd5e1; text-transform: uppercase;">SUBTOTAL</td>
              <td style="padding: 6px 8px; text-align: center; border-right: 1px solid #cbd5e1;">${Number(totalQty).toFixed(totalQty % 1 === 0 ? 0 : 2)}</td>
              <td style="padding: 6px 8px; border-right: 1px solid #cbd5e1;"></td>
              <td style="padding: 6px 8px; text-align: right;">₹${Number(invoice.subtotal).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Bottom Section: Terms (Left) + Totals, In Words, Signature (Right) -->
        <div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 6px; page-break-inside: avoid; break-inside: avoid;">
          <!-- Left: Terms & Khata Status -->
          <div style="flex: 1; font-size: 10px; color: #475569;">
            <div style="font-weight: 900; color: #334155; text-transform: uppercase; margin-bottom: 3px;">Terms and Conditions:</div>
            <ol style="margin: 0; padding-left: 14px; line-height: 1.5;">
              <li>Goods once sold will not be taken back or exchanged.</li>
              <li>All disputes are subject to Sursand jurisdiction only.</li>
            </ol>
            ${typeof customerTotalBalance === 'number' && customerTotalBalance > 0 ? `
              <div style="margin-top: 6px; padding: 5px 8px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 4px; font-weight: 700; color: #92400e; font-size: 10px;">
                📌 ग्राहक खाते में कुल शेष बकाया: ₹${Number(customerTotalBalance).toFixed(2)}
              </div>
            ` : ''}
            ${invoice.dueAmount > 0 ? `
              <div style="margin-top: 4px; padding: 5px 8px; background: #ffe4e6; border: 1px solid #fecdd3; border-radius: 4px; font-weight: 800; color: #9f1239; font-size: 10px;">
                ⚠️ इस बिल पर बाज़ार उधारी बाकी: ₹${Number(invoice.dueAmount).toFixed(2)}
              </div>
            ` : ''}
          </div>

          <!-- Right: Totals + Signature -->
          <div style="width: 250px; shrink-0: 0;">
            <div style="border: 1px solid #cbd5e1; border-radius: 2px; background: #fffdfb; font-size: 11px; margin-bottom: 6px;">
              ${invoice.discount > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 4px 6px; border-bottom: 1px solid #f1f5f9; color: #047857; font-weight: 700;">
                  <span>कुल छूट (Discount):</span>
                  <span>-₹${Number(invoice.discount).toFixed(2)}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding: 5px 6px; font-size: 12px; font-weight: 900; background: #f8f3e6; border-top: 2px solid #b48a44; border-bottom: 2px solid #b48a44;">
                <span>Total Amount:</span>
                <span>₹${Number(invoice.grandTotal).toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 6px; border-bottom: 1px solid #f1f5f9; color: #334155;">
                <span>Received Amount:</span>
                <span>₹${Number(invoice.paidAmount).toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 6px;">
                <span>Balance Due:</span>
                <span style="font-weight: 800; ${invoice.dueAmount > 0 ? 'color: #e11d48;' : 'color: #0f172a;'}">₹${Number(invoice.dueAmount).toFixed(2)}</span>
              </div>
            </div>

            <div style="font-size: 10px; margin-bottom: 12px; line-height: 1.3;">
              <span style="color: #64748b;">Total Amount (in words): </span>
              <span style="font-weight: 800; color: #0f172a;">${numberToWordsINR(invoice.grandTotal)}</span>
            </div>

            <div style="text-align: right; padding-top: 4px;">
              <div style="font-family: serif; font-style: italic; color: #475569; font-size: 12px;">Jyoti Gen Store</div>
              <div style="border-top: 1px solid #94a3b8; margin-top: 3px; padding-top: 2px; font-size: 9px; font-weight: 900; text-transform: uppercase;">Authorized Signature</div>
              <div style="font-size: 9px; color: #64748b;">For ${shop.shopName || 'M/S JYOTI GENERAL STORE'}</div>
            </div>
          </div>
        </div>

        <!-- Footer Strip -->
        <div style="border-top: 1px solid rgba(180, 138, 68, 0.3); margin-top: 10px; padding-top: 5px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;">
          <span>Invoice created using myBillBook</span>
          <span>GST Compliant • Sursand, Bihar</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Returns full standalone HTML document for iframe printing with proper @page rules.
 */
export function getInvoiceFullDocumentHtml(
  invoice: Invoice,
  shop: ShopSettings,
  customerTotalBalance?: number
): string {
  const bodyHtml = getInvoiceBodyHtml(invoice, shop, customerTotalBalance);
  const cleanNumber = (invoice.invoiceNumber || 'bill').replace(/[^a-zA-Z0-9]/g, '_');

  return `
    <!DOCTYPE html>
    <html lang="hi">
    <head>
      <meta charset="utf-8">
      <title>${cleanNumber}_sales_invoice</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 6mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          color: #0f172a;
          font-family: 'Inter', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 11px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          page-break-inside: auto;
        }
        thead {
          display: table-header-group;
        }
        tfoot {
          display: table-footer-group;
        }
        tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        td, th {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      </style>
    </head>
    <body>
      ${bodyHtml}
    </body>
    </html>
  `;
}

/**
 * Generates high-definition A4 PDF.
 * Never produces blank pages and cleanly handles large item lists with multi-page slicing.
 */
export async function generateInvoicePdf(
  invoice: Invoice,
  shop: ShopSettings,
  customerTotalBalance?: number
): Promise<void> {
  const a4WidthMm = 210;
  const a4HeightMm = 297;

  // Create clean, dedicated off-screen sandbox at top-left
  const tempDiv = document.createElement('div');
  tempDiv.id = 'temp-pdf-render-sandbox';
  tempDiv.style.position = 'fixed';
  tempDiv.style.left = '0';
  tempDiv.style.top = '0';
  tempDiv.style.width = '794px'; // 210mm at 96 DPI
  tempDiv.style.backgroundColor = '#FFFFFF';
  tempDiv.style.padding = '12px';
  tempDiv.style.boxSizing = 'border-box';
  tempDiv.style.zIndex = '-99999';
  tempDiv.style.opacity = '1';
  tempDiv.style.pointerEvents = 'none';
  tempDiv.style.overflow = 'visible';

  tempDiv.innerHTML = getInvoiceBodyHtml(invoice, shop, customerTotalBalance);
  document.body.appendChild(tempDiv);

  try {
    // Render HTML to canvas with high retina resolution
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FFFFFF',
      logging: false,
      windowWidth: 794
    });

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const totalPdfHeightMm = (canvasHeight * a4WidthMm) / canvasWidth;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    if (totalPdfHeightMm <= a4HeightMm) {
      // 1. Single Page fits cleanly
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 0, 0, a4WidthMm, totalPdfHeightMm, undefined, 'FAST');
    } else {
      // 2. Multi-Page: Cleanly slice canvas across standard A4 pages
      const a4Ratio = a4HeightMm / a4WidthMm;
      const pageHeightPx = Math.floor(canvasWidth * a4Ratio);
      const totalPages = Math.ceil(canvasHeight / pageHeightPx);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          doc.addPage('a4', 'portrait');
        }

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvasWidth;
        sliceCanvas.height = pageHeightPx;

        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          const sourceY = page * pageHeightPx;
          const sourceHeight = Math.min(pageHeightPx, canvasHeight - sourceY);
          ctx.drawImage(
            canvas,
            0, sourceY, canvasWidth, sourceHeight,
            0, 0, canvasWidth, sourceHeight
          );
        }

        const sliceImgData = sliceCanvas.toDataURL('image/png');
        doc.addImage(sliceImgData, 'PNG', 0, 0, a4WidthMm, a4HeightMm, undefined, 'FAST');
      }
    }

    const cleanNumber = (invoice.invoiceNumber || 'bill').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`${cleanNumber}_sales_invoice.pdf`);
  } catch (err) {
    console.error('PDF generation error:', err);
    printInvoice(invoice, shop, customerTotalBalance);
  } finally {
    if (tempDiv.parentNode) {
      tempDiv.parentNode.removeChild(tempDiv);
    }
  }
}

/**
 * 1-Click Zero-Flicker Print using isolated hidden iframe.
 * Never gives blank pages and cleanly supports multi-page table pagination.
 */
export function printInvoice(
  invoice: Invoice,
  shop: ShopSettings,
  customerTotalBalance?: number
): void {
  try {
    const iframe = document.createElement('iframe');
    iframe.id = 'den-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const htmlContent = getInvoiceFullDocumentHtml(invoice, shop, customerTotalBalance);
    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Allow browser layout engine to measure styles
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print failed, falling back to window.print', e);
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1500);
      }
    }, 250);
  } catch (err) {
    console.error('Print initialization error:', err);
    window.print();
  }
}
