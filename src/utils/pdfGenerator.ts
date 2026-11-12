import { jsPDF } from 'jspdf';
import type { Invoice, ShopSettings } from '../types';
import { formatCurrency, formatDateTime } from './formatters';

export function generateInvoicePdf(
  invoice: Invoice,
  shop: ShopSettings,
  customerTotalBalance?: number
) {
  // Support 58mm (approx 58mm width, variable height) or 80mm
  const is58mm = shop.thermalPaperWidth === '58mm';
  const pageWidth = is58mm ? 58 : 80;
  
  // Calculate dynamic height based on number of items
  const baseHeight = 110;
  const itemRowHeight = 7;
  const pageHeight = Math.max(140, baseHeight + invoice.items.length * itemRowHeight);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidth, pageHeight]
  });

  const margin = 4;
  let y = 7;
  const centerX = pageWidth / 2;
  const rightX = pageWidth - margin;

  // Shop Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(is58mm ? 10 : 12);
  doc.text(shop.shopName || 'DEN KIRANA STORE', centerX, y, { align: 'center' });
  y += 4;

  if (shop.tagline) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(is58mm ? 6 : 7);
    doc.text(shop.tagline, centerX, y, { align: 'center' });
    y += 3.5;
  }

  if (shop.address) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(is58mm ? 6 : 7);
    doc.text(shop.address, centerX, y, { align: 'center' });
    y += 3.5;
  }

  if (shop.mobile) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(is58mm ? 6 : 7);
    doc.text(`Phone: ${shop.mobile}`, centerX, y, { align: 'center' });
    y += 3.5;
  }

  if (shop.gstin) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(is58mm ? 6 : 7);
    doc.text(`GSTIN: ${shop.gstin}`, centerX, y, { align: 'center' });
    y += 3.5;
  }

  // Divider
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, rightX, y);
  y += 4;

  // Invoice Meta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(is58mm ? 7 : 8);
  doc.text(`Bill #${invoice.invoiceNumber}`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(is58mm ? 6 : 7);
  doc.text(new Date(invoice.createdAt).toLocaleDateString(), rightX, y, { align: 'right' });
  y += 3.5;

  if (invoice.customerName && invoice.customerName !== 'नकद ग्राहक') {
    doc.setFont('helvetica', 'bold');
    doc.text(`Cust: ${invoice.customerName}`, margin, y);
    if (invoice.customerMobile) {
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.customerMobile, rightX, y, { align: 'right' });
    }
    y += 3.5;
  }

  // Divider
  doc.line(margin, y, rightX, y);
  y += 3.5;

  // Table Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(is58mm ? 6 : 7);
  doc.text('Item', margin, y);
  doc.text('Qty', centerX - (is58mm ? 2 : 4), y, { align: 'center' });
  doc.text('Rate', centerX + (is58mm ? 10 : 12), y, { align: 'right' });
  doc.text('Amount', rightX, y, { align: 'right' });
  y += 3;

  doc.line(margin, y, rightX, y);
  y += 3.5;

  // Items List
  doc.setFont('helvetica', 'normal');
  invoice.items.forEach((item) => {
    const itemName = item.nameEn || item.nameHi;
    const truncatedName = itemName.length > (is58mm ? 15 : 22) ? itemName.substring(0, is58mm ? 14 : 20) + '..' : itemName;
    
    doc.text(truncatedName, margin, y);
    doc.text(`${item.quantity} ${item.unit}`, centerX - (is58mm ? 2 : 4), y, { align: 'center' });
    doc.text(`${item.unitPrice}`, centerX + (is58mm ? 10 : 12), y, { align: 'right' });
    doc.text(`${Math.round(item.total)}`, rightX, y, { align: 'right' });
    y += 4;
  });

  // Divider
  doc.line(margin, y, rightX, y);
  y += 4;

  // Totals
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', margin + 10, y);
  doc.text(`Rs. ${Math.round(invoice.subtotal)}`, rightX, y, { align: 'right' });
  y += 3.5;

  if (invoice.discount > 0) {
    doc.text('Discount:', margin + 10, y);
    doc.text(`-Rs. ${Math.round(invoice.discount)}`, rightX, y, { align: 'right' });
    y += 3.5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(is58mm ? 8 : 9);
  doc.text('Grand Total:', margin + 10, y);
  doc.text(`Rs. ${Math.round(invoice.grandTotal)}`, rightX, y, { align: 'right' });
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(is58mm ? 6.5 : 7.5);
  doc.text(`Paid (${invoice.paymentMethod}):`, margin + 10, y);
  doc.text(`Rs. ${Math.round(invoice.paidAmount)}`, rightX, y, { align: 'right' });
  y += 3.5;

  if (invoice.dueAmount > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Bill Udhar / Due:', margin + 10, y);
    doc.text(`Rs. ${Math.round(invoice.dueAmount)}`, rightX, y, { align: 'right' });
    y += 3.5;
  }

  if (typeof customerTotalBalance === 'number') {
    doc.text('Total Khata Balance:', margin + 10, y);
    doc.text(`Rs. ${Math.round(customerTotalBalance)}`, rightX, y, { align: 'right' });
    y += 4;
  }

  // Footer
  y += 2;
  doc.setLineDashPattern([], 0);
  doc.line(margin, y, rightX, y);
  y += 4;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(is58mm ? 6 : 7);
  doc.text('Thank you! Please visit again.', centerX, y, { align: 'center' });
  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(is58mm ? 5 : 6);
  doc.text('Powered by DEN POS', centerX, y, { align: 'center' });

  // Save / Download PDF
  doc.save(`DEN_Bill_${invoice.invoiceNumber}.pdf`);
}
