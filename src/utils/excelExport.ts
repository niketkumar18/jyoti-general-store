import type { Invoice, Customer, LedgerEntry } from '../types';

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
