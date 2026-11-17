import type { Invoice, Customer, ShopSettings, Vendor, VendorLedgerEntry } from '../types';
import { formatCurrency, formatDateTime } from './formatters';

export function createWhatsAppBillMessage(
  invoice: Invoice,
  shop: ShopSettings,
  customerTotalBalance?: number
): string {
  const customerName = invoice.customerName || 'ग्राहक';
  const shopName = shop.shopName || 'DEN किराना स्टोर';
  
  // Format items summary
  const itemsText = invoice.items
    .map((item, index) => `${index + 1}. ${item.nameHi || item.nameEn} (${item.quantity} ${item.unit}) - ${formatCurrency(item.total)}`)
    .join('\n');

  let msg = `*नमस्ते ${customerName} जी! 🙏*\n`;
  msg += `*${shopName}* से आपका बिल:\n\n`;
  msg += `🧾 *बिल संख्या:* #${invoice.invoiceNumber}\n`;
  msg += `📅 *तारीख:* ${formatDateTime(invoice.createdAt, 'hi')}\n\n`;
  msg += `🛒 *सामान का विवरण:*\n${itemsText}\n\n`;
  msg += `--------------------------------\n`;
  msg += `💰 *कुल राशि:* ${formatCurrency(invoice.grandTotal)}\n`;
  msg += `✅ *आज जमा:* ${formatCurrency(invoice.paidAmount)}\n`;
  
  if (invoice.dueAmount > 0) {
    msg += `⚠️ *इस बिल का उधार:* ${formatCurrency(invoice.dueAmount)}\n`;
  }
  
  if (typeof customerTotalBalance === 'number') {
    msg += `📌 *खाते में कुल शेष बकाया:* ${formatCurrency(customerTotalBalance)}\n`;
  }
  
  msg += `--------------------------------\n`;
  if (shop.upiId) {
    msg += `💳 *ऑनलाइन भुगतान हेतु UPI ID:* \`${shop.upiId}\`\n`;
  }
  if (shop.mobile) {
    msg += `📞 *संपर्क:* ${shop.mobile}\n`;
  }
  msg += `🙏 *धन्यवाद! फिर पधारें।*`;

  return msg;
}

export function openWhatsAppBill(
  invoice: Invoice,
  shop: ShopSettings,
  customerTotalBalance?: number
) {
  const message = createWhatsAppBillMessage(invoice, shop, customerTotalBalance);
  const cleanMobile = (invoice.customerMobile || '').replace(/\D/g, '');
  
  // Clean Indian mobile: if 10 digits add 91
  let phoneParam = '';
  if (cleanMobile.length === 10) {
    phoneParam = `phone=91${cleanMobile}&`;
  } else if (cleanMobile.length > 10) {
    phoneParam = `phone=${cleanMobile}&`;
  }

  const encodedText = encodeURIComponent(message);
  const url = `https://api.whatsapp.com/send?${phoneParam}text=${encodedText}`;
  window.open(url, '_blank');
}

export function createWhatsAppPaymentReminder(
  customer: Customer,
  shop: ShopSettings
): string {
  const shopName = shop.shopName || 'DEN किराना स्टोर';
  let msg = `*नमस्ते ${customer.name} जी! 🙏*\n\n`;
  msg += `*${shopName}* से आपका खाता विवरण:\n`;
  msg += `📌 *कुल उधारी बकाया:* ${formatCurrency(customer.currentBalance)}\n`;
  msg += `🎯 *आपकी उधारी सीमा:* ${formatCurrency(customer.creditLimit)}\n\n`;
  msg += `कृपया समय पर बकाया राशि जमा कर दुकान की निरंतर सेवा का लाभ उठाएं।\n`;
  if (shop.upiId) {
    msg += `💳 *PhonePe / Google Pay / Paytm (UPI):* \`${shop.upiId}\`\n`;
  }
  if (shop.mobile) {
    msg += `📞 *संपर्क:* ${shop.mobile}\n`;
  }
  msg += `\n🙏 *धन्यवाद!*`;
  return msg;
}

export function openWhatsAppReminder(customer: Customer, shop: ShopSettings) {
  const message = createWhatsAppPaymentReminder(customer, shop);
  const cleanMobile = (customer.mobile || '').replace(/\D/g, '');
  let phoneParam = '';
  if (cleanMobile.length === 10) {
    phoneParam = `phone=91${cleanMobile}&`;
  } else if (cleanMobile.length > 10) {
    phoneParam = `phone=${cleanMobile}&`;
  }
  const encodedText = encodeURIComponent(message);
  const url = `https://api.whatsapp.com/send?${phoneParam}text=${encodedText}`;
  window.open(url, '_blank');
}

export function createWhatsAppVendorLedgerMessage(
  vendor: Vendor,
  ledgerEntries?: VendorLedgerEntry[],
  shop?: ShopSettings
): string {
  const shopName = shop?.shopName || 'JYOTI GENERAL STORE';
  const firm = vendor.firmName ? `${vendor.firmName} (${vendor.name})` : vendor.name;
  let msg = `*नमस्ते ${firm} जी! 🙏*\n\n`;
  msg += `*${shopName}* से आपका बहीखाता विवरण:\n\n`;
  msg += `📦 *कुल माल खरीद:* ${formatCurrency(vendor.totalPurchased || 0)}\n`;
  msg += `💰 *कुल भुगतान किया:* ${formatCurrency(vendor.totalPaid || 0)}\n`;
  msg += `⚠️ *शेष बकाया (देना बाकी):* ${formatCurrency(vendor.currentBalance || 0)}\n\n`;
  
  if (ledgerEntries && ledgerEntries.length > 0) {
    msg += `*हालिया लेन-देन (Recent Transactions):*\n`;
    const recent = ledgerEntries.slice(0, 5);
    recent.forEach((e, idx) => {
      const typeStr = e.type === 'PURCHASE' ? '📦 खरीद' : '💰 भुगतान';
      msg += `${idx + 1}. ${typeStr}: ${formatCurrency(e.amount)} (${new Date(e.createdAt).toLocaleDateString('hi-IN')})\n`;
    });
    msg += `\n`;
  }

  if (shop?.mobile) {
    msg += `📞 *दुकानदार संपर्क:* ${shop.mobile}\n`;
  }
  msg += `\n🙏 *धन्यवाद! जय श्री राम।*`;
  return msg;
}

export function openWhatsAppVendorLedger(
  vendor: Vendor,
  ledgerEntries?: VendorLedgerEntry[],
  shop?: ShopSettings
) {
  const message = createWhatsAppVendorLedgerMessage(vendor, ledgerEntries, shop);
  const cleanMobile = (vendor.mobile || '').replace(/\D/g, '');
  let phoneParam = '';
  if (cleanMobile.length === 10) {
    phoneParam = `phone=91${cleanMobile}&`;
  } else if (cleanMobile.length > 10) {
    phoneParam = `phone=${cleanMobile}&`;
  }
  const encodedText = encodeURIComponent(message);
  const url = `https://api.whatsapp.com/send?${phoneParam}text=${encodedText}`;
  window.open(url, '_blank');
}
