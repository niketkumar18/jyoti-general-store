import { db } from '../db';
import type { Invoice, Customer, InventoryItem, LedgerEntry } from '../types';

export interface SyncResult {
  success: boolean;
  syncedInvoices: number;
  syncedLedgers: number;
  syncedCustomers?: number;
  syncedItems?: number;
  message: string;
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * DEN Kirana POS - 100% Free Google Sheets Cloud Database
 * 
 * Instructions:
 * 1. Open your Google Sheet
 * 2. Go to Extensions (एक्सटेंशन) > Apps Script
 * 3. Replace all existing code with this script and click Save (💾)
 * 4. Click Deploy > New deployment
 * 5. Type: "Web app" | Execute as: "Me" | Who has access: "Anyone"
 * 6. Click Deploy, Authorize access, and copy the Web App URL into DEN Settings!
 * 
 * Note: You DO NOT need to make any columns manually! This script
 * automatically names your sheet "DEN किराना स्टोर बहीखाता" and creates 4 tabs!
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    app: 'DEN Kirana POS',
    message: 'Google Sheets Webhook is active and connected!'
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter && e.parameter.data) {
      payload = JSON.parse(e.parameter.data);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var ss = null;
    if (payload.sheetId) {
      try { ss = SpreadsheetApp.openById(payload.sheetId); } catch(err) {}
    }
    if (!ss) {
      try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch(err) {}
    }
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        error: 'No active Google Sheet found. Please ensure this script is created inside your sheet via Extensions > Apps Script.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Auto-rename the sheet if it is Untitled
    try {
      var currentName = ss.getName();
      if (!currentName || currentName === 'Untitled spreadsheet' || currentName === 'बिना शीर्षक वाली स्प्रेडशीट') {
        ss.setName('DEN किराना स्टोर बहीखाता (DEN Kirana Ledger)');
      }
    } catch(e) {}

    // 0. CREATE / FORMAT DASHBOARD HOME TAB
    try {
      var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('शीट1');
      if (defaultSheet && defaultSheet.getLastRow() <= 2) {
        defaultSheet.setName('मुख्य डैशबोर्ड (Home)');
        defaultSheet.clear();
        defaultSheet.getRange('A1:E1').merge()
          .setValue('🏪 DEN किराना POS एवं डिजिटल खाता')
          .setFontSize(16).setFontWeight('bold').setBackground('#15803D').setFontColor('#FFFFFF').setHorizontalAlignment('center');
        defaultSheet.getRange('A3:E3').merge()
          .setValue('📌 आपकी दुकान का सारा डेटा नीचे दिए गए 4 टैब्स में सुरक्षित है:')
          .setFontSize(11).setFontWeight('bold');
        defaultSheet.getRange('A5').setValue('1. 🧾 Invoices टैब:');
        defaultSheet.getRange('B5').setValue('दुकान के सभी बिल और नकद/उधार राशि');
        defaultSheet.getRange('A6').setValue('2. 📒 Ledger टैब:');
        defaultSheet.getRange('B6').setValue('तारीख अनुसार ग्राहक उधारी एवं जमा का पूरा हिसाब');
        defaultSheet.getRange('A7').setValue('3. 👥 Customers टैब:');
        defaultSheet.getRange('B7').setValue('सभी ग्राहकों के नाम, फोन, उधारी सीमा व बकाया');
        defaultSheet.getRange('A8').setValue('4. 📦 Inventory टैब:');
        defaultSheet.getRange('B8').setValue('दुकान का सारा सामान, खरीद/बिक्री दर और बचा स्टॉक');
        defaultSheet.getRange('A10').setValue('अंतिम सिंक समय: ' + new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      }
    } catch(e) {}

    // 1. SYNC INVOICES TAB
    if (payload.invoices && payload.invoices.length > 0) {
      var sheetInvoices = ss.getSheetByName('Invoices') || ss.insertSheet('Invoices');
      if (sheetInvoices.getLastRow() === 0) {
        var hRow = ['Date & Time', 'Bill Number', 'Customer Name', 'Mobile', 'Grand Total (₹)', 'Paid (₹)', 'Due / Udhar (₹)', 'Payment Mode', 'Items Detail'];
        sheetInvoices.appendRow(hRow);
        sheetInvoices.getRange(1, 1, 1, hRow.length).setFontWeight('bold').setBackground('#E2E8F0');
        sheetInvoices.setFrozenRows(1);
      }
      payload.invoices.forEach(function(inv) {
        var itemsSummary = (inv.items || []).map(function(it) {
          return (it.nameHi || it.nameEn) + ' (' + it.quantity + ' ' + it.unit + ' @ ₹' + it.unitPrice + ')';
        }).join(', ');

        sheetInvoices.appendRow([
          new Date(inv.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          inv.invoiceNumber,
          inv.customerName || 'नकद ग्राहक',
          inv.customerMobile || '',
          inv.grandTotal,
          inv.paidAmount,
          inv.dueAmount,
          inv.paymentMethod,
          itemsSummary
        ]);
      });
    }

    // 2. SYNC KHATA LEDGER TAB
    if (payload.ledgers && payload.ledgers.length > 0) {
      var sheetLedger = ss.getSheetByName('Ledger') || ss.insertSheet('Ledger');
      if (sheetLedger.getLastRow() === 0) {
        var lRow = ['Date & Time', 'Customer Name', 'Type (उधार / जमा)', 'Amount (₹)', 'Payment Mode', 'Bill #', 'Description', 'Running Due Balance (₹)'];
        sheetLedger.appendRow(lRow);
        sheetLedger.getRange(1, 1, 1, lRow.length).setFontWeight('bold').setBackground('#FEF3C7');
        sheetLedger.setFrozenRows(1);
      }
      payload.ledgers.forEach(function(led) {
        sheetLedger.appendRow([
          new Date(led.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          led.customerName,
          led.type === 'DEBIT' ? 'उधार (DEBIT)' : 'जमा (CREDIT)',
          led.amount,
          led.paymentMode || '',
          led.invoiceNumber || '',
          led.description,
          led.runningBalance
        ]);
      });
    }

    // 3. FULL SYNC: CUSTOMERS TAB
    if (payload.customers && payload.customers.length > 0) {
      var sheetCust = ss.getSheetByName('Customers') || ss.insertSheet('Customers');
      sheetCust.clearContents();
      var cRow = ['Customer Name', 'Mobile Number', 'Credit Limit (₹)', 'Current Due (₹)', 'Risk Status (सुरक्षित/जोखिम)', 'Address / Notes'];
      sheetCust.appendRow(cRow);
      sheetCust.getRange(1, 1, 1, cRow.length).setFontWeight('bold').setBackground('#D1FAE5');
      sheetCust.setFrozenRows(1);
      
      payload.customers.forEach(function(c) {
        sheetCust.appendRow([
          c.name,
          c.mobile || '',
          c.creditLimit,
          c.currentBalance,
          c.riskLevel.toUpperCase(),
          c.address || c.notes || ''
        ]);
      });
    }

    // 4. FULL SYNC: INVENTORY TAB
    if (payload.items && payload.items.length > 0) {
      var sheetItems = ss.getSheetByName('Inventory') || ss.insertSheet('Inventory');
      sheetItems.clearContents();
      var iRow = ['Item Name (Hindi)', 'Item Name (English)', 'Category', 'Unit', 'Sale Price (₹)', 'Cost Price (₹)', 'Stock Qty', 'Low Stock Limit', 'Barcode'];
      sheetItems.appendRow(iRow);
      sheetItems.getRange(1, 1, 1, iRow.length).setFontWeight('bold').setBackground('#DBEAFE');
      sheetItems.setFrozenRows(1);

      payload.items.forEach(function(it) {
        sheetItems.appendRow([
          it.nameHi,
          it.nameEn || '',
          it.category,
          it.unit,
          it.salePrice,
          it.costPrice || '',
          it.stockQty,
          it.lowStockThreshold,
          it.barcode || ''
        ]);
      });
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'All records synced cleanly into Google Sheets!'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

export function extractSheetId(url?: string): string | undefined {
  if (!url) return undefined;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : undefined;
}

/**
 * Syncs only pending / unsynced invoices and ledger transactions
 */
export async function syncPendingToGoogleSheets(
  webhookUrl: string,
  sheetDocumentUrl?: string
): Promise<SyncResult> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return {
      success: false,
      syncedInvoices: 0,
      syncedLedgers: 0,
      message: 'कृपया पहले Google Sheets Webhook URL दर्ज करें'
    };
  }

  try {
    const unsyncedInvoices = await db.invoices.where('syncedToGoogle').equals(0 as any).toArray();
    const unsyncedLedgers = await db.ledger.where('syncedToGoogle').equals(0 as any).toArray();

    if (unsyncedInvoices.length === 0 && unsyncedLedgers.length === 0) {
      return {
        success: true,
        syncedInvoices: 0,
        syncedLedgers: 0,
        message: 'सभी नए बिल पहले से गूगल शीट में सिंक हैं। पूरा डेटा दोबारा भेजने के लिए "टेस्ट व संपूर्ण सिंक" दबाएं।'
      };
    }

    const payload = {
      action: 'SYNC_PENDING',
      sheetId: extractSheetId(sheetDocumentUrl),
      invoices: unsyncedInvoices,
      ledgers: unsyncedLedgers,
      timestamp: Date.now()
    };

    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    for (const inv of unsyncedInvoices) {
      if (inv.id) await db.invoices.update(inv.id, { syncedToGoogle: true });
    }
    for (const led of unsyncedLedgers) {
      if (led.id) await db.ledger.update(led.id, { syncedToGoogle: true });
    }

    return {
      success: true,
      syncedInvoices: unsyncedInvoices.length,
      syncedLedgers: unsyncedLedgers.length,
      message: `सफलतापूर्वक ${unsyncedInvoices.length} नए बिल और ${unsyncedLedgers.length} खाता प्रविष्टियां गूगल शीट में जोड़ दी गईं!`
    };
  } catch (error: any) {
    console.error('Sync failed:', error);
    return {
      success: false,
      syncedInvoices: 0,
      syncedLedgers: 0,
      message: error?.message || 'सिंक करने में त्रुटि आई (ऑफलाइन मोड चालू है)'
    };
  }
}

/**
 * Full Sync: Sends ALL historical data (Invoices, Ledger, Customers, Inventory) to Google Sheets
 * This allows the user to immediately verify their Google Sheet with live data!
 */
export async function syncFullDatabaseToGoogleSheets(
  webhookUrl: string,
  sheetDocumentUrl?: string
): Promise<SyncResult> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return {
      success: false,
      syncedInvoices: 0,
      syncedLedgers: 0,
      message: 'कृपया पहले Google Sheets Webhook URL दर्ज करें'
    };
  }

  try {
    const allInvoices = await db.invoices.toArray();
    const allLedgers = await db.ledger.toArray();
    const allCustomers = await db.customers.toArray();
    const allItems = await db.items.toArray();

    const payload = {
      action: 'SYNC_FULL',
      sheetId: extractSheetId(sheetDocumentUrl),
      invoices: allInvoices,
      ledgers: allLedgers,
      customers: allCustomers,
      items: allItems,
      timestamp: Date.now()
    };

    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    for (const inv of allInvoices) {
      if (inv.id) await db.invoices.update(inv.id, { syncedToGoogle: true });
    }
    for (const led of allLedgers) {
      if (led.id) await db.ledger.update(led.id, { syncedToGoogle: true });
    }

    return {
      success: true,
      syncedInvoices: allInvoices.length,
      syncedLedgers: allLedgers.length,
      syncedCustomers: allCustomers.length,
      syncedItems: allItems.length,
      message: `✅ गूगल शीट में सफलतापूर्वक सिंक हुआ! (${allCustomers.length} ग्राहक, ${allItems.length} सामान, ${allInvoices.length} बिल, ${allLedgers.length} खाता प्रविष्टियां)`
    };
  } catch (error: any) {
    console.error('Full sync failed:', error);
    return {
      success: false,
      syncedInvoices: 0,
      syncedLedgers: 0,
      message: error?.message || 'सिंक विफल रहा'
    };
  }
}
