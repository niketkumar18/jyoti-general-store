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
 * 3. Delete everything and paste this code completely
 * 4. Click Save (💾)
 * 5. (TESTING): Select "testSyncDirectly" from the top dropdown and click Run (▶️)
 *    -> Check your Google Sheet immediately! You will see all 4 tabs created!
 * 6. Click Deploy > New deployment
 * 7. Click Gear (⚙️) icon > Web app
 * 8. Execute as: "Me" | Who has access: "Anyone" (VERY IMPORTANT: Select Anyone!)
 * 9. Click Deploy and copy the Web App URL (ends with /exec) into DEN Settings!
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
    // 1. If sheetId provided, open by ID
    if (payload.sheetId) {
      try { ss = SpreadsheetApp.openById(payload.sheetId); } catch(err) {}
    }
    // 2. If not, open active spreadsheet
    if (!ss) {
      try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch(err) {}
    }

    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        error: 'Spreadsheet not found! Make sure this script was opened from Extensions > Apps Script inside your sheet, or provide sheetId.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Auto-rename the spreadsheet if default
    try {
      var currentName = ss.getName();
      if (!currentName || currentName === 'Untitled spreadsheet' || currentName === 'बिना शीर्षक वाली स्प्रेडशीट') {
        ss.setName('DEN किराना स्टोर बहीखाता (DEN Kirana Ledger)');
      }
    } catch(err) {}

    // 0. FORMAT HOME / DASHBOARD TAB
    try {
      var homeSheet = ss.getSheetByName('मुख्य डैशबोर्ड') || ss.getSheetByName('Sheet1') || ss.getSheetByName('शीट1');
      if (homeSheet) {
        homeSheet.setName('मुख्य डैशबोर्ड');
        if (homeSheet.getLastRow() <= 2) {
          homeSheet.clear();
          homeSheet.getRange('A1:F1').merge()
            .setValue('🏪 DEN किराना POS एवं डिजिटल खाता बही')
            .setFontSize(16).setFontWeight('bold').setBackground('#15803D').setFontColor('#FFFFFF').setHorizontalAlignment('center');
          homeSheet.getRange('A3:F3').merge()
            .setValue('📌 आपकी दुकान का सारा रिकॉर्ड नीचे दिए गए रंगीन टैब्स (Tabs) में सुरक्षित है:')
            .setFontSize(11).setFontWeight('bold');
          homeSheet.getRange('A5').setValue('1. 🧾 Invoices टैब:');
          homeSheet.getRange('B5:D5').merge().setValue('दुकान के सभी बिल और नकद/उधार राशि');
          homeSheet.getRange('A6').setValue('2. 📒 Ledger टैब:');
          homeSheet.getRange('B6:D6').merge().setValue('तारीख अनुसार ग्राहक उधारी (Debit) एवं जमा (Credit)');
          homeSheet.getRange('A7').setValue('3. 👥 Customers टैब:');
          homeSheet.getRange('B7:D7').merge().setValue('ग्राहकों के नाम, फोन, उधारी सीमा व वर्तमान बकाया');
          homeSheet.getRange('A8').setValue('4. 📦 Inventory टैब:');
          homeSheet.getRange('B8:D8').merge().setValue('दुकान का सारा सामान, खरीद/बिक्री दर और बचा स्टॉक');
          homeSheet.getRange('A10').setValue('अंतिम सिंक समय: ' + new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          homeSheet.setTabColor('#15803D');
        }
      }
    } catch(err) {}

    // 1. SYNC INVOICES TAB
    if (payload.invoices && payload.invoices.length > 0) {
      var sheetInvoices = ss.getSheetByName('Invoices') || ss.insertSheet('Invoices');
      sheetInvoices.setTabColor('#0284C7');
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
      sheetLedger.setTabColor('#D97706');
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
      sheetCust.setTabColor('#16A34A');
      sheetCust.clearContents();
      var cRow = ['Customer Name', 'Mobile Number', 'Credit Limit (₹)', 'Current Due (₹)', 'Risk Status', 'Address / Notes'];
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
      sheetItems.setTabColor('#2563EB');
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

/**
 * ⚡ Direct Test Function inside Apps Script Editor
 * Select "testSyncDirectly" from the top dropdown and click Run (▶️)
 * It will instantly write sample data into your Google Sheet!
 */
function testSyncDirectly() {
  var sample = {
    action: 'SYNC_FULL',
    invoices: [
      { invoiceNumber: 'DEN-1001', customerName: 'रमेश कुमार (वर्मा जी)', customerMobile: '9826011223', grandTotal: 1250, paidAmount: 500, dueAmount: 750, paymentMethod: 'SPLIT', createdAt: Date.now(), items: [{ nameHi: 'अरहर दाल', quantity: 1, unit: 'KG', unitPrice: 160, total: 160 }] }
    ],
    ledgers: [
      { customerName: 'रमेश कुमार (वर्मा जी)', type: 'DEBIT', amount: 750, description: 'बिल #DEN-1001 का उधार', runningBalance: 1250, createdAt: Date.now() },
      { customerName: 'रमेश कुमार (वर्मा जी)', type: 'CREDIT', amount: 500, paymentMode: 'UPI', description: 'PhonePe से जमा किया', runningBalance: 750, createdAt: Date.now() }
    ],
    customers: [
      { name: 'रमेश कुमार (वर्मा जी)', mobile: '9826011223', creditLimit: 3000, currentBalance: 750, riskLevel: 'safe', address: 'गली नंबर 3' },
      { name: 'सोनू शर्मा (पंडित जी)', mobile: '9893044556', creditLimit: 2000, currentBalance: 1650, riskLevel: 'warning', address: 'मंदिर के पीछे' },
      { name: 'विक्रम यादव (ठेकेदार)', mobile: '9752099881', creditLimit: 2500, currentBalance: 3200, riskLevel: 'danger', address: 'यादव मोहल्ला' }
    ],
    items: [
      { nameHi: 'अरहर / तूर दाल', nameEn: 'Toor Dal', category: 'dal_pulses', unit: 'KG', salePrice: 160, costPrice: 142, stockQty: 50, lowStockThreshold: 10 },
      { nameHi: 'फॉर्च्यून सरसों तेल', nameEn: 'Fortune Mustard Oil', category: 'oil_ghee', unit: 'PACKET', salePrice: 155, costPrice: 138, stockQty: 45, lowStockThreshold: 10 }
    ]
  };

  var res = doPost({ postData: { contents: JSON.stringify(sample) } });
  Logger.log('Test Sync Result: ' + res.getContent());
}
`;

export function extractSheetId(url?: string): string | undefined {
  if (!url) return undefined;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : undefined;
}

export function validateWebhookUrl(url?: string): { valid: boolean; error?: string } {
  if (!url || !url.trim()) {
    return { valid: false, error: 'कृपया पहले Google Sheets Webhook URL दर्ज करें' };
  }
  const clean = url.trim();
  if (clean.includes('docs.google.com/spreadsheets')) {
    return {
      valid: false,
      error: '⚠️ आपने Google Sheet का लिंक Webhook बॉक्स में डाल दिया है! नीचे "आपकी Google Sheet का सीधा लिंक" में इसे डालें और Webhook में Apps Script वाला लिंक (जो /exec पर खत्म होता है) डालें।'
    };
  }
  if (clean.endsWith('/edit') || clean.includes('/edit#')) {
    return {
      valid: false,
      error: '⚠️ यह Apps Script कोड एडिटर का लिंक है (/edit)। आपको Deploy करने के बाद मिला Web App URL डालना है जो /exec पर खत्म होता है।'
    };
  }
  if (!clean.endsWith('/exec')) {
    return {
      valid: false,
      error: '⚠️ Web App URL अंत में /exec होना चाहिए (उदा. https://script.google.com/macros/s/.../exec)।'
    };
  }
  return { valid: true };
}

/**
 * Syncs only pending / unsynced invoices and ledger transactions
 */
export async function syncPendingToGoogleSheets(
  webhookUrl: string,
  sheetDocumentUrl?: string
): Promise<SyncResult> {
  const check = validateWebhookUrl(webhookUrl);
  if (!check.valid) {
    return {
      success: false,
      syncedInvoices: 0,
      syncedLedgers: 0,
      message: check.error || 'अमान्य Webhook URL'
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
        message: 'सभी नए बिल पहले से गूगल शीट में सिंक हैं। पूरा डेटा दोबारा भेजने के लिए "⚡ टेस्ट कनेक्शन और पूरा डेटा भेजें" दबाएं।'
      };
    }

    const payload = {
      action: 'SYNC_PENDING',
      sheetId: extractSheetId(sheetDocumentUrl),
      invoices: unsyncedInvoices,
      ledgers: unsyncedLedgers,
      timestamp: Date.now()
    };

    await fetch(webhookUrl.trim(), {
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
      message: error?.message || 'सिंक करने में त्रुटि आई'
    };
  }
}

/**
 * Full Sync: Sends ALL historical data (Invoices, Ledger, Customers, Inventory) to Google Sheets
 */
export async function syncFullDatabaseToGoogleSheets(
  webhookUrl: string,
  sheetDocumentUrl?: string
): Promise<SyncResult> {
  const check = validateWebhookUrl(webhookUrl);
  if (!check.valid) {
    return {
      success: false,
      syncedInvoices: 0,
      syncedLedgers: 0,
      message: check.error || 'अमान्य Webhook URL'
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

    await fetch(webhookUrl.trim(), {
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
