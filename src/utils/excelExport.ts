import type { Invoice, Customer, LedgerEntry } from '../types';

export function exportMonthlyReportToCsv(
  year: number,
  monthlyData: Array<{
    monthName: string;
    totalSales: number;
    cashCollected: number;
    creditGiven: number;
    creditRecovered: number;
    netOutstanding: number;
  }>
) {
  const headers = ['महीना (Month)', 'कुल बिक्री (Total Sales)', 'नकद वसूली (Cash Collected)', 'नया उधार (Credit Given)', 'उधार जमा (Debt Recovered)', 'शुद्ध बकाया (Net Outstanding)'];
  
  const rows = monthlyData.map((d) => [
    `"${d.monthName}"`,
    d.totalSales,
    d.cashCollected,
    d.creditGiven,
    d.creditRecovered,
    d.netOutstanding
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(csvContent, `DEN_Annual_Audit_Report_${year}.csv`, 'text/csv;charset=utf-8;');
}

export function exportCustomerKhataToCsv(customers: Customer[], ledgerEntries: LedgerEntry[]) {
  const headers = ['ग्राहक का नाम', 'मोबाइल', 'उधारी सीमा', 'वर्तमान बकाया', 'जोखिम स्थिति', 'पता'];
  const rows = customers.map(c => [
    `"${c.name}"`,
    `"${c.mobile}"`,
    c.creditLimit,
    c.currentBalance,
    c.riskLevel.toUpperCase(),
    `"${c.address || ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(csvContent, `DEN_Customers_Khata_List_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}

export function exportAllInvoicesToCsv(invoices: Invoice[]) {
  const headers = ['बिल संख्या', 'तारीख', 'ग्राहक का नाम', 'मोबाइल', 'कुल देय (Grand Total)', 'जमा राशि (Paid)', 'उधारी (Due)', 'भुगतान प्रकार'];
  const rows = invoices.map(inv => [
    `"${inv.invoiceNumber}"`,
    `"${new Date(inv.createdAt).toLocaleString()}"`,
    `"${inv.customerName}"`,
    `"${inv.customerMobile}"`,
    inv.grandTotal,
    inv.paidAmount,
    inv.dueAmount,
    inv.paymentMethod
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
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
