import type { Invoice, Customer, LedgerEntry, Vendor, VendorLedgerEntry } from '../types';

export function exportDailyProfitToCsv(
  dateFormatted: string,
  itemsSold: Array<{
    name: string;
    category: string;
    quantity: number;
    unit: string;
    avgCostRate: number;
    avgSaleRate: number;
    totalCost: number;
    totalSales: number;
    profit: number;
    marginPct: number;
  }>,
  totals: {
    totalSales: number;
    totalCost: number;
    netProfit: number;
    marginPct: number;
  }
) {
  const headers = [
    'सामान का नाम (Item Name)',
    'श्रेणी (Category)',
    'बिकी मात्रा (Quantity)',
    'इकाई (Unit)',
    'खरीद दर (Cost Rate ₹)',
    'बिक्री दर (Sale Rate ₹)',
    'कुल खरीद लागत (Total Cost ₹)',
    'कुल बिक्री राशि (Total Sales ₹)',
    'शुद्ध मुनाफा (Net Profit ₹)',
    'मुनाफा मार्जिन (Margin %)'
  ];

  const rows = itemsSold.map((it) => [
    `"${it.name}"`,
    `"${it.category}"`,
    it.quantity,
    `"${it.unit}"`,
    it.avgCostRate,
    it.avgSaleRate,
    it.totalCost,
    it.totalSales,
    it.profit,
    `${it.marginPct}%`
  ]);

  // Append Total Row
  rows.push([
    '"--- कुल दैनिक जोड़ (Total) ---"',
    '""',
    '""',
    '""',
    '""',
    '""',
    totals.totalCost,
    totals.totalSales,
    totals.netProfit,
    `"${totals.marginPct}%"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadBlob(csvContent, `DEN_Daily_Profit_Report_${dateFormatted.replace(/\s+/g, '_')}.csv`, 'text/csv;charset=utf-8;');
}

export function exportMonthlyProfitToCsv(
  monthName: string,
  year: number,
  dailyRows: Array<{
    dateStr: string;
    billsCount: number;
    sales: number;
    cost: number;
    profit: number;
    marginPct: number;
    creditGiven: number;
    creditRecovered: number;
  }>,
  totals: {
    totalSales: number;
    totalCost: number;
    netProfit: number;
    marginPct: number;
    totalCreditGiven: number;
    totalCreditRecovered: number;
  }
) {
  const headers = [
    'तारीख (Date)',
    'बिल संख्या (Bills)',
    'कुल बिक्री (Sales ₹)',
    'खरीद खर्च (Cost ₹)',
    'शुद्ध मुनाफा (Net Profit ₹)',
    'मार्जिन (Margin %)',
    'नया उधार (Credit Given ₹)',
    'उधार वसूली (Recovered ₹)'
  ];

  const rows = dailyRows.map((d) => [
    `"${d.dateStr}"`,
    d.billsCount,
    d.sales,
    d.cost,
    d.profit,
    `"${d.marginPct}%"`,
    d.creditGiven,
    d.creditRecovered
  ]);

  rows.push([
    '"--- कुल माह जोड़ (Month Total) ---"',
    '""',
    totals.totalSales,
    totals.totalCost,
    totals.netProfit,
    `"${totals.marginPct}%"`,
    totals.totalCreditGiven,
    totals.totalCreditRecovered
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadBlob(csvContent, `DEN_Monthly_Profit_Report_${monthName}_${year}.csv`, 'text/csv;charset=utf-8;');
}

export function exportMonthlyReportToCsv(
  year: number,
  monthlyData: Array<{
    monthName: string;
    totalSales: number;
    totalCost?: number;
    netProfit?: number;
    marginPct?: number;
    cashCollected: number;
    creditGiven: number;
    creditRecovered: number;
    netOutstanding: number;
  }>
) {
  const headers = [
    'महीना (Month)',
    'कुल बिक्री (Total Sales ₹)',
    'खरीद लागत (Buy Cost ₹)',
    'शुद्ध मुनाफा (Net Profit ₹)',
    'मार्जिन (Margin %)',
    'नकद वसूली (Cash Collected ₹)',
    'नया उधार (Credit Given ₹)',
    'उधार जमा (Debt Recovered ₹)',
    'शुद्ध बकाया (Net Outstanding ₹)'
  ];

  const rows = monthlyData.map((d) => [
    `"${d.monthName}"`,
    d.totalSales,
    d.totalCost || 0,
    d.netProfit || 0,
    `"${d.marginPct || 0}%"`,
    d.cashCollected,
    d.creditGiven,
    d.creditRecovered,
    d.netOutstanding
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadBlob(csvContent, `DEN_Annual_Profit_Audit_Report_${year}.csv`, 'text/csv;charset=utf-8;');
}

export function exportCustomerKhataToCsv(customers: Customer[], ledgerEntries: LedgerEntry[]) {
  const headers = ['ग्राहक का नाम', 'मोबाइल', 'उधारी सीमा (₹)', 'वर्तमान बकाया (₹)', 'जोखिम स्थिति', 'पता / टिप्पणी'];
  const rows = customers.map((c) => [
    `"${c.name}"`,
    `"${c.mobile}"`,
    c.creditLimit,
    c.currentBalance,
    c.riskLevel.toUpperCase(),
    `"${c.address || c.notes || ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadBlob(csvContent, `DEN_Customers_Khata_List_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}

export function exportAllInvoicesToCsv(invoices: Invoice[]) {
  const headers = ['बिल संख्या', 'तारीख', 'ग्राहक का नाम', 'मोबाइल', 'कुल देय (Grand Total)', 'जमा राशि (Paid)', 'उधारी (Due)', 'भुगतान प्रकार'];
  const rows = invoices.map((inv) => [
    `"${inv.invoiceNumber}"`,
    `"${new Date(inv.createdAt).toLocaleString()}"`,
    `"${inv.customerName}"`,
    `"${inv.customerMobile}"`,
    inv.grandTotal,
    inv.paidAmount,
    inv.dueAmount,
    inv.paymentMethod
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadBlob(csvContent, `DEN_Invoices_Export_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}

export function exportVendorKhataToCsv(
  vendorOrVendors: Vendor | Vendor[],
  ledgerEntries?: VendorLedgerEntry[]
) {
  if (Array.isArray(vendorOrVendors)) {
    const headers = [
      'सप्लायर / महाजन का नाम',
      'फर्म / एजेंसी का नाम',
      'मोबाइल नंबर',
      'सप्लाई श्रेणी',
      'कुल माल खरीद (Total Purchases ₹)',
      'कुल भुगतान (Total Paid ₹)',
      'वर्तमान बकाया (देना है - Balance ₹)',
      'पता / विवरण'
    ];

    const rows = vendorOrVendors.map((v) => [
      `"${v.name}"`,
      `"${v.firmName || ''}"`,
      `"${v.mobile}"`,
      `"${v.category || ''}"`,
      v.totalPurchased || 0,
      v.totalPaid || 0,
      v.currentBalance,
      `"${v.address || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadBlob(csvContent, `DEN_Vendors_Khata_List_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  } else {
    // Single vendor ledger export
    const vendor = vendorOrVendors;
    const headers = [
      'तारीख व समय',
      'लेन-देन प्रकार',
      'विवरण / सामान',
      'खरीद मात्रा व इकाई',
      'कुल राशि (₹)',
      'भुगतान किया (₹)',
      'शेष उधारी / बकाया (₹)',
      'भुगतान माध्यम',
      'बिल / संदर्भ संख्या'
    ];

    const entries = ledgerEntries || [];
    const rows = entries.map((e) => [
      `"${new Date(e.createdAt).toLocaleString('hi-IN')}"`,
      e.type === 'PURCHASE' ? '"माल खरीद (Purchase)"' : '"भुगतान (Payment)"',
      `"${e.itemName || e.description || ''}"`,
      e.itemQuantity ? `"${e.itemQuantity} ${e.itemUnit || ''}"` : '""',
      e.amount || 0,
      e.paidAmount || 0,
      e.balanceAfter !== undefined ? e.balanceAfter : (e.dueAmount || 0),
      `"${e.paymentMode || 'CASH'}"`,
      `"${e.billNumber || e.referenceNo || ''}"`
    ]);

    const csvContent = '\uFEFF' + [
      `"सप्लायर: ${vendor.firmName || vendor.name}"`,
      `"मोबाइल: ${vendor.mobile}"`,
      `"वर्तमान बकाया (देना है): ₹${vendor.currentBalance}"`,
      '',
      headers.join(','),
      ...rows.map((r) => r.join(','))
    ].join('\n');

    const cleanName = (vendor.firmName || vendor.name).replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '_');
    downloadBlob(csvContent, `DEN_Vendor_Ledger_${cleanName}_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  }
}

export function exportComplementaryReportToCsv(
  rows: Array<{
    date: number;
    invoiceNumber: string;
    customerName: string;
    itemName: string;
    quantity: number;
    unit: string;
    costRate: number;
    totalCost: number;
  }>,
  totals: {
    totalQty: number;
    totalCost: number;
  }
) {
  const headers = [
    'तारीख व समय (Date & Time)',
    'बिल संख्या (Invoice #)',
    'ग्राहक का नाम (Customer)',
    'मुफ्त सामान (Item Name)',
    'मात्रा (Quantity)',
    'इकाई (Unit)',
    'लागत दर (Cost Rate ₹)',
    'दुकानदार की कुल लागत (Total Cost ₹)'
  ];

  const csvRows = rows.map((r) => [
    `"${new Date(r.date).toLocaleString('hi-IN')}"`,
    `"${r.invoiceNumber}"`,
    `"${r.customerName}"`,
    `"${r.itemName}"`,
    r.quantity,
    `"${r.unit}"`,
    r.costRate,
    r.totalCost
  ]);

  csvRows.push([
    '"--- कुल कॉम्प्लिमेंट्री लागत जोड़ ---"',
    '""',
    '""',
    '""',
    totals.totalQty,
    '""',
    '""',
    totals.totalCost
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
  downloadBlob(csvContent, `DEN_Complementary_Goods_Report_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
