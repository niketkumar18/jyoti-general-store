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

export interface TwoWaySyncResult {
  success: boolean;
  pushedInvoices: number;
  pushedLedgers: number;
  pulledInvoices: number;
  pulledLedgers: number;
  updatedCustomers: number;
  message: string;
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * DEN Kirana POS - 100% Free Google Sheets Cloud Database (2-Way Multi-Device Sync)
 * 
 * Instructions:
 * 1. Open your Google Sheet
 * 2. Go to Extensions (एक्सटेंशन) > Apps Script
 * 3. Delete everything and paste this code completely
 * 4. Click Save (💾)
 * 5. (⚡ ONE-CLICK TEST): Select "setupAllTabsNow" from top dropdown and click Run (▶️)
 *    -> Check your Google Sheet! All 5 tabs will appear immediately!
 * 6. Click Deploy > Manage deployments > Edit (pencil) > Version: "New version" > Deploy
 * 7. Copy the Web App URL (ends with /exec) into DEN Settings!
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'STATUS';
  var ss = null;
  if (e && e.parameter && e.parameter.sheetId) {
    try { ss = SpreadsheetApp.openById(e.parameter.sheetId); } catch(err) {}
  }
  if (!ss) {
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch(err) {}
  }

  // ==========================================================
  // 🔄 2-WAY SYNC: PULL CLOUD DATA TO MOBILE & LAPTOP
  // ==========================================================
  if (action === 'PULL' || action === 'GET_DATA') {
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: 'Spreadsheet not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 1. Read Invoices
    var invoices = [];
    var sheetInv = ss.getSheetByName('Invoices');
    if (sheetInv && sheetInv.getLastRow() > 1) {
      var numCols = Math.max(9, sheetInv.getLastColumn());
      var dataInv = sheetInv.getRange(2, 1, sheetInv.getLastRow() - 1, numCols).getValues();
      for (var i = 0; i < dataInv.length; i++) {
        var r = dataInv[i];
        if (r[1]) { // invoiceNumber
          var rawItemsJson = (numCols >= 10 && r[9]) ? String(r[9]) : '';
          var parsedItems = [];
          if (rawItemsJson && rawItemsJson.charAt(0) === '[') {
            try { parsedItems = JSON.parse(rawItemsJson); } catch(errP) {}
          }
          invoices.push({
            createdAt: r[0] ? new Date(r[0]).getTime() : Date.now(),
            invoiceNumber: String(r[1]),
            customerName: String(r[2] || 'नकद ग्राहक'),
            customerMobile: String(r[3] || ''),
            grandTotal: Number(r[4]) || 0,
            paidAmount: Number(r[5]) || 0,
            dueAmount: Number(r[6]) || 0,
            paymentMethod: String(r[7] || 'CASH'),
            itemsSummary: String(r[8] || ''),
            items: parsedItems
          });
        }
      }
    }

    // 2. Read Ledger
    var ledgers = [];
    var sheetLed = ss.getSheetByName('Ledger');
    if (sheetLed && sheetLed.getLastRow() > 1) {
      var dataLed = sheetLed.getRange(2, 1, sheetLed.getLastRow() - 1, 8).getValues();
      for (var j = 0; j < dataLed.length; j++) {
        var rL = dataLed[j];
        if (rL[1]) {
          var typeStr = String(rL[2]).toUpperCase();
          var isDebit = typeStr.indexOf('DEBIT') > -1 || typeStr.indexOf('उधार') > -1;
          ledgers.push({
            createdAt: rL[0] ? new Date(rL[0]).getTime() : Date.now(),
            customerName: String(rL[1]),
            type: isDebit ? 'DEBIT' : 'CREDIT',
            amount: Number(rL[3]) || 0,
            paymentMode: String(rL[4] || ''),
            invoiceNumber: String(rL[5] || ''),
            description: String(rL[6] || ''),
            runningBalance: Number(rL[7]) || 0
          });
        }
      }
    }

    // 3. Read Customers
    var customers = [];
    var sheetCust = ss.getSheetByName('Customers');
    if (sheetCust && sheetCust.getLastRow() > 1) {
      var dataCust = sheetCust.getRange(2, 1, sheetCust.getLastRow() - 1, 6).getValues();
      for (var k = 0; k < dataCust.length; k++) {
        var rC = dataCust[k];
        if (rC[0]) {
          var riskStr = String(rC[4]).toLowerCase();
          var riskLevel = riskStr.indexOf('danger') > -1 || riskStr.indexOf('रेड') > -1 ? 'danger'
            : (riskStr.indexOf('warn') > -1 || riskStr.indexOf('ध्यान') > -1 ? 'warning' : 'safe');
          customers.push({
            name: String(rC[0]),
            mobile: String(rC[1] || ''),
            creditLimit: Number(rC[2]) || 2000,
            currentBalance: Number(rC[3]) || 0,
            riskLevel: riskLevel,
            address: String(rC[5] || '')
          });
        }
      }
    }

    // 4. Read Inventory
    var items = [];
    var sheetItems = ss.getSheetByName('Inventory');
    if (sheetItems && sheetItems.getLastRow() > 1) {
      var dataItems = sheetItems.getRange(2, 1, sheetItems.getLastRow() - 1, 9).getValues();
      for (var m = 0; m < dataItems.length; m++) {
        var rI = dataItems[m];
        if (rI[0] || rI[1]) {
          items.push({
            nameHi: String(rI[0] || ''),
            nameEn: String(rI[1] || ''),
            category: String(rI[2] || 'other'),
            unit: String(rI[3] || 'PIECE'),
            salePrice: Number(rI[4]) || 0,
            costPrice: Number(rI[5]) || 0,
            stockQty: Number(rI[6]) || 0,
            lowStockThreshold: Number(rI[7]) || 5,
            barcode: String(rI[8] || '')
          });
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      invoices: invoices,
      ledgers: ledgers,
      customers: customers,
      items: items,
      timestamp: Date.now()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Default: STATUS check & guarantee all tabs exist
  setupAllTabsNow();
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    app: 'DEN Kirana POS',
    message: 'Google Sheets Webhook is active and 2-way sync is ready!'
  })).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name, headerRow) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (headerRow && sheet.getLastRow() === 0) {
    sheet.appendRow(headerRow);
  }
  return sheet;
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
        error: 'Spreadsheet not found'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1. GUARANTEE ALL TABS EXIST
    var sheetInvoices = getOrCreateSheet(ss, 'Invoices', ['तारीख व समय', 'बिल संख्या', 'ग्राहक का नाम', 'मोबाइल', 'कुल राशि (₹)', 'जमा राशि (₹)', 'उधार (₹)', 'भुगतान माध्यम', 'सामान विवरण', 'सामान डेटा (JSON)']);
    var sheetLedger = getOrCreateSheet(ss, 'Ledger', ['तारीख व समय', 'ग्राहक का नाम', 'प्रकार (उधार/जमा)', 'राशि (₹)', 'माध्यम', 'बिल सं.', 'विवरण', 'शेष उधारी (₹)']);
    var sheetCust = getOrCreateSheet(ss, 'Customers', ['ग्राहक का नाम', 'मोबाइल नंबर', 'उधारी सीमा (₹)', 'वर्तमान बकाया (₹)', 'जोखिम स्थिति', 'पता / विवरण']);
    var sheetItems = getOrCreateSheet(ss, 'Inventory', ['सामान का नाम (हिंदी)', 'सामान का नाम (English)', 'श्रेणी', 'इकाई', 'बिक्री दर (₹)', 'खरीद दर (₹)', 'स्टॉक मात्रा', 'न्यूनतम स्टॉक चेतावनी', 'बारकोड']);

    // 2. DASHBOARD / HOME TAB
    try {
      var homeSheet = ss.getSheetByName('मुख्य डैशबोर्ड') || ss.getSheetByName('Sheet1') || ss.getSheetByName('शीट1');
      if (homeSheet) {
        homeSheet.setName('मुख्य डैशबोर्ड');
        homeSheet.clear();
        homeSheet.appendRow(['🏪 DEN किराना POS एवं डिजिटल खाता बही (2-Way Live Sync Active)']);
        homeSheet.appendRow(['']);
        homeSheet.appendRow(['📌 आपकी दुकान का सारा रिकॉर्ड नीचे दिए गए 4 अलग-अलग टैब्स (Tabs) में सुरक्षित है:']);
        homeSheet.appendRow(['1. 🧾 Invoices टैब:', 'दुकान के सभी बिक्री बिल और नकद/उधार राशि']);
        homeSheet.appendRow(['2. 📒 Ledger टैब:', 'तारीख अनुसार ग्राहक उधारी (Debit) एवं जमा (Credit) का पूरा हिसाब']);
        homeSheet.appendRow(['3. 👥 Customers टैब:', 'ग्राहकों के नाम, फोन, उधारी सीमा व वर्तमान कुल बकाया']);
        homeSheet.appendRow(['4. 📦 Inventory टैब:', 'दुकान का सारा सामान, खरीद/बिक्री दर और मौजूदा स्टॉक']);
        homeSheet.appendRow(['']);
        homeSheet.appendRow(['👉 मोबाइल और लैपटॉप दोनों डिवाइस इसी गूगल शीट से रियल-टाइम में जुड़े हैं।']);
        homeSheet.appendRow(['अंतिम सिंक समय:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })]);
      }
    } catch(errH) {}

    // 3. WRITE INVOICES
    if (payload.invoices && payload.invoices.length > 0) {
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
          itemsSummary,
          JSON.stringify(inv.items || [])
        ]);
      });
    }

    // 4. WRITE LEDGERS
    if (payload.ledgers && payload.ledgers.length > 0) {
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

    // 5. WRITE CUSTOMERS
    if (payload.customers && payload.customers.length > 0) {
      sheetCust.clear();
      sheetCust.appendRow(['ग्राहक का नाम', 'मोबाइल नंबर', 'उधारी सीमा (₹)', 'वर्तमान बकाया (₹)', 'जोखिम स्थिति', 'पता / विवरण']);
      payload.customers.forEach(function(c) {
        sheetCust.appendRow([
          c.name,
          c.mobile || '',
          c.creditLimit,
          c.currentBalance,
          c.riskLevel ? c.riskLevel.toUpperCase() : 'SAFE',
          c.address || c.notes || ''
        ]);
      });
    }

    // 6. WRITE INVENTORY
    if (payload.items && payload.items.length > 0) {
      sheetItems.clear();
      sheetItems.appendRow(['सामान का नाम (हिंदी)', 'सामान का नाम (English)', 'श्रेणी', 'इकाई', 'बिक्री दर (₹)', 'खरीद दर (₹)', 'स्टॉक मात्रा', 'न्यूनतम स्टॉक चेतावनी', 'बारकोड']);
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
      message: 'All 4 tabs synced successfully!'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ⚡ ONE-CLICK SETUP FUNCTION
 */
function setupAllTabsNow() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;

  try {
    if (ss.getName() === 'Untitled spreadsheet' || ss.getName() === 'बिना शीर्षक वाली स्प्रेडशीट') {
      ss.setName('DEN किराना स्टोर बहीखाता (DEN Kirana Ledger)');
    }
  } catch(e) {}

  // 1. Invoices tab
  var inv = getOrCreateSheet(ss, 'Invoices', ['तारीख व समय', 'बिल संख्या', 'ग्राहक का नाम', 'मोबाइल', 'कुल राशि (₹)', 'जमा राशि (₹)', 'उधार (₹)', 'भुगतान माध्यम', 'सामान विवरण', 'सामान डेटा (JSON)']);
  if (inv.getLastRow() <= 1) {
    inv.appendRow([new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), 'DEN-1001', 'रमेश कुमार (वर्मा जी)', '9826011223', 1250, 500, 750, 'SPLIT', 'अरहर दाल (1 KG @ ₹160), फॉर्च्यून तेल (1 LTR @ ₹155)', '[]']);
    inv.appendRow([new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), 'DEN-1002', 'सोनू शर्मा (पंडित जी)', '9893044556', 2150, 0, 2150, 'CREDIT', 'अमुल शुद्ध घी (1 LTR @ ₹650), आटा 10KG (1 PKT @ ₹420)', '[]']);
  }

  // 2. Ledger tab
  var led = getOrCreateSheet(ss, 'Ledger', ['तारीख व समय', 'ग्राहक का नाम', 'प्रकार (उधार/जमा)', 'राशि (₹)', 'माध्यम', 'बिल सं.', 'विवरण', 'शेष उधारी (₹)']);
  if (led.getLastRow() <= 1) {
    led.appendRow([new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), 'रमेश कुमार (वर्मा जी)', 'उधार (DEBIT)', 750, 'BILL', 'DEN-1001', 'बिल #DEN-1001 का उधार', 750]);
    led.appendRow([new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), 'सोनू शर्मा (पंडित जी)', 'उधार (DEBIT)', 2150, 'BILL', 'DEN-1002', 'राशन का उधार', 2150]);
    led.appendRow([new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), 'सोनू शर्मा (पंडित जी)', 'जमा (CREDIT)', 500, 'CASH', '', 'दुकान पर नकद जमा किया', 1650]);
  }

  // 3. Customers tab
  var cust = getOrCreateSheet(ss, 'Customers', ['ग्राहक का नाम', 'मोबाइल नंबर', 'उधारी सीमा (₹)', 'वर्तमान बकाया (₹)', 'जोखिम स्थिति', 'पता / विवरण']);
  if (cust.getLastRow() <= 1) {
    cust.appendRow(['रमेश कुमार (वर्मा जी)', '9826011223', 3000, 750, 'SAFE 🟢', 'गली नंबर 3, शक्ति नगर']);
    cust.appendRow(['सोनू शर्मा (पंडित जी)', '9893044556', 2000, 1650, 'WARNING 🟡', 'मकान नं. 45, मंदिर के पीछे']);
    cust.appendRow(['विक्रम यादव (ठेकेदार)', '9752099881', 2500, 3200, 'DANGER 🔴', 'यादव मोहल्ला, वार्ड 12']);
    cust.appendRow(['सुनील गुप्ता (दुकान वाले)', '9425077112', 5000, 2100, 'SAFE 🟢', 'स्टेशन रोड']);
  }

  // 4. Inventory tab
  var items = getOrCreateSheet(ss, 'Inventory', ['सामान का नाम (हिंदी)', 'सामान का नाम (English)', 'श्रेणी', 'इकाई', 'बिक्री दर (₹)', 'खरीद दर (₹)', 'स्टॉक मात्रा', 'न्यूनतम स्टॉक चेतावनी', 'बारकोड']);
  if (items.getLastRow() <= 1) {
    items.appendRow(['अरहर / तूर दाल (प्रीमियम)', 'Toor Dal (Arhar)', 'dal_pulses', 'KG', 160, 142, 50, 10, '8901001']);
    items.appendRow(['फॉर्च्यून सरसों तेल (1 लीटर)', 'Fortune Mustard Oil 1L', 'oil_ghee', 'PACKET', 155, 138, 45, 10, '8906007']);
    items.appendRow(['आशीर्वाद चक्की आटा (10 किग्रा)', 'Aashirvaad Atta 10kg', 'flour_grains', 'PACKET', 420, 385, 18, 4, '8901030']);
    items.appendRow(['अमूल शुद्ध देशी घी (1 लीटर)', 'Amul Pure Ghee 1L', 'oil_ghee', 'PIECE', 650, 590, 12, 3, '8901262']);
    items.appendRow(['टाटा नमक (1 किग्रा)', 'Tata Salt 1kg', 'spices_masala', 'PACKET', 28, 24, 80, 15, '8901058']);
    items.appendRow(['सर्फ एक्सेल क्विक वॉश (1 किग्रा)', 'Surf Excel 1kg', 'soap_detergent', 'PACKET', 145, 128, 40, 8, '8901038']);
    items.appendRow(['मैगी 2-मिनट नूडल्स (4 का पैक)', 'Maggi Noodles Pack', 'snacks_biscuit', 'PACKET', 56, 48, 35, 7, '8901721']);
  }

  // 5. Dashboard Home
  var home = getOrCreateSheet(ss, 'मुख्य डैशबोर्ड');
  home.clear();
  home.appendRow(['🏪 DEN किराना POS एवं डिजिटल खाता बही (2-Way Live Sync Active)']);
  home.appendRow(['']);
  home.appendRow(['📌 आपकी दुकान का सारा रिकॉर्ड नीचे दिए गए 4 अलग-अलग टैब्स (Tabs) में सुरक्षित है:']);
  home.appendRow(['1. 🧾 Invoices टैब:', 'दुकान के सभी बिक्री बिल और नकद/उधार राशि']);
  home.appendRow(['2. 📒 Ledger टैब:', 'तारीख अनुसार ग्राहक उधारी (Debit) एवं जमा (Credit) का पूरा हिसाब']);
  home.appendRow(['3. 👥 Customers टैब:', 'ग्राहकों के नाम, फोन, उधारी सीमा व वर्तमान कुल बकाया']);
  home.appendRow(['4. 📦 Inventory टैब:', 'दुकान का सारा सामान, खरीद/बिक्री दर और मौजूदा स्टॉक']);
  home.appendRow(['']);
  home.appendRow(['👉 डेटा देखने के लिए स्क्रीन के सबसे नीचे इन टैब्स [ Invoices ] [ Ledger ] [ Customers ] [ Inventory ] पर क्लिक करें!']);
  home.appendRow(['अंतिम सिंक समय:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })]);

  Logger.log('Success! All 5 tabs created and filled.');
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
 * 1. PUSH: Syncs only pending / unsynced invoices and ledger transactions to Google Sheets
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
        message: 'सभी स्थानीय बिल पहले से गूगल शीट में सिंक हैं।'
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
      message: `सफलतापूर्वक ${unsyncedInvoices.length} नए बिल गूगल शीट में भेज दिए गए!`
    };
  } catch (error: any) {
    console.error('Pending sync failed:', error);
    return {
      success: false,
      syncedInvoices: 0,
      syncedLedgers: 0,
      message: error?.message || 'सिंक करने में त्रुटि आई'
    };
  }
}

/**
 * 2. PULL: Pulls latest bills, customers, ledger and inventory from Google Sheets into local IndexedDB
 */
export async function pullFromGoogleSheets(
  webhookUrl: string,
  sheetDocumentUrl?: string
): Promise<{
  success: boolean;
  newInvoices: number;
  newLedgers: number;
  updatedCustomers: number;
  message: string;
}> {
  const check = validateWebhookUrl(webhookUrl);
  if (!check.valid) {
    return {
      success: false,
      newInvoices: 0,
      newLedgers: 0,
      updatedCustomers: 0,
      message: check.error || 'अमान्य Webhook URL'
    };
  }

  try {
    const sheetId = extractSheetId(sheetDocumentUrl) || '';
    const fetchUrl = `${webhookUrl.trim()}${webhookUrl.includes('?') ? '&' : '?'}action=PULL&sheetId=${encodeURIComponent(sheetId)}&_t=${Date.now()}`;

    const resp = await fetch(fetchUrl);
    if (!resp.ok) {
      throw new Error(`Google Sheets सर्वर से संपर्क नहीं हो सका (HTTP ${resp.status})`);
    }

    const data = await resp.json();

    // Check if the old Apps Script is running (returns status 'online' instead of 'success')
    if (data.status === 'online' && !data.invoices) {
      return {
        success: true,
        newInvoices: 0,
        newLedgers: 0,
        updatedCustomers: 0,
        message: 'Google Sheets सक्रिय है। 2-तरफा लाइव सिंक हेतु Apps Script में नया कोड अपडेट करें।'
      };
    }

    if (data.status !== 'success') {
      throw new Error(data.error || 'Google Sheets से डेटा प्राप्त करने में त्रुटि');
    }

    let newInvoicesCount = 0;
    let newLedgersCount = 0;
    let updatedCustomersCount = 0;

    // A. Sync Invoices from Cloud into Local IndexedDB
    if (Array.isArray(data.invoices) && data.invoices.length > 0) {
      for (const cloudInv of data.invoices) {
        if (!cloudInv.invoiceNumber) continue;
        const exists = await db.invoices.where('invoiceNumber').equals(cloudInv.invoiceNumber).first();
        if (!exists) {
          const items = (Array.isArray(cloudInv.items) && cloudInv.items.length > 0)
            ? cloudInv.items
            : [
                {
                  itemId: 0,
                  nameEn: cloudInv.itemsSummary || 'General Kirana Items',
                  nameHi: cloudInv.itemsSummary || 'दुकान का राशन',
                  unit: 'PIECE' as const,
                  quantity: 1,
                  unitPrice: cloudInv.grandTotal || 0,
                  total: cloudInv.grandTotal || 0
                }
              ];

          await db.invoices.add({
            invoiceNumber: cloudInv.invoiceNumber,
            customerName: cloudInv.customerName || 'नकद ग्राहक',
            customerMobile: cloudInv.customerMobile || '',
            items: items,
            subtotal: cloudInv.grandTotal,
            discount: 0,
            grandTotal: cloudInv.grandTotal,
            paidAmount: cloudInv.paidAmount,
            dueAmount: cloudInv.dueAmount,
            paymentMethod: cloudInv.paymentMethod || 'CASH',
            syncedToGoogle: true,
            createdAt: cloudInv.createdAt || Date.now()
          });
          newInvoicesCount++;
        }
      }
    }

    // B. Sync Ledger from Cloud
    if (Array.isArray(data.ledgers) && data.ledgers.length > 0) {
      for (const cloudLed of data.ledgers) {
        const existing = await db.ledger
          .where('amount')
          .equals(cloudLed.amount)
          .filter((l) => 
            l.customerName === cloudLed.customerName && 
            l.type === cloudLed.type &&
            (cloudLed.invoiceNumber ? l.invoiceNumber === cloudLed.invoiceNumber : true)
          )
          .first();

        if (!existing) {
          await db.ledger.add({
            customerName: cloudLed.customerName,
            type: cloudLed.type,
            amount: cloudLed.amount,
            paymentMode: cloudLed.paymentMode,
            invoiceNumber: cloudLed.invoiceNumber,
            description: cloudLed.description || '',
            runningBalance: cloudLed.runningBalance,
            syncedToGoogle: true,
            createdAt: cloudLed.createdAt || Date.now()
          });
          newLedgersCount++;
        }
      }
    }

    // C. Sync Customers from Cloud
    if (Array.isArray(data.customers) && data.customers.length > 0) {
      for (const cloudCust of data.customers) {
        if (!cloudCust.name) continue;
        const existing = cloudCust.mobile && cloudCust.mobile !== '0000000000'
          ? await db.customers.where('mobile').equals(cloudCust.mobile).first()
          : await db.customers.where('name').equals(cloudCust.name).first();

        if (existing && existing.id) {
          await db.customers.update(existing.id, {
            currentBalance: cloudCust.currentBalance,
            creditLimit: cloudCust.creditLimit || existing.creditLimit,
            riskLevel: cloudCust.riskLevel || existing.riskLevel,
            updatedAt: Date.now()
          });
          updatedCustomersCount++;
        } else if (!existing) {
          await db.customers.add({
            name: cloudCust.name,
            mobile: cloudCust.mobile || '0000000000',
            address: cloudCust.address || '',
            creditLimit: cloudCust.creditLimit || 2000,
            currentBalance: cloudCust.currentBalance || 0,
            riskLevel: cloudCust.riskLevel || 'safe',
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          updatedCustomersCount++;
        }
      }
    }

    return {
      success: true,
      newInvoices: newInvoicesCount,
      newLedgers: newLedgersCount,
      updatedCustomers: updatedCustomersCount,
      message: newInvoicesCount > 0 || newLedgersCount > 0
        ? `📥 Google Sheets से ${newInvoicesCount} नए बिल व ${newLedgersCount} खाता प्रविष्टियां प्राप्त हुईं!`
        : 'Google Sheets के साथ सभी बिल पहले से सिंक हैं।'
    };
  } catch (err: any) {
    console.error('Pull from Google Sheets failed:', err);
    return {
      success: false,
      newInvoices: 0,
      newLedgers: 0,
      updatedCustomers: 0,
      message: err?.message || 'Google Sheets से डेटा प्राप्त नहीं हो सका'
    };
  }
}

/**
 * 3. 2-WAY SYNC: First PUSH local pending changes, then PULL changes from other devices!
 */
export async function syncTwoWay(
  webhookUrl: string,
  sheetDocumentUrl?: string
): Promise<TwoWaySyncResult> {
  const check = validateWebhookUrl(webhookUrl);
  if (!check.valid) {
    return {
      success: false,
      pushedInvoices: 0,
      pushedLedgers: 0,
      pulledInvoices: 0,
      pulledLedgers: 0,
      updatedCustomers: 0,
      message: check.error || 'अमान्य Webhook URL'
    };
  }

  // Step 1: PUSH local unsynced records
  const pushRes = await syncPendingToGoogleSheets(webhookUrl, sheetDocumentUrl);

  // Step 2: PULL cloud records from other devices
  const pullRes = await pullFromGoogleSheets(webhookUrl, sheetDocumentUrl);

  const summaryParts: string[] = [];
  if (pushRes.syncedInvoices > 0) {
    summaryParts.push(`📤 ${pushRes.syncedInvoices} बिल भेजे गए`);
  }
  if (pullRes.newInvoices > 0) {
    summaryParts.push(`📥 ${pullRes.newInvoices} नए बिल प्राप्त हुए`);
  }
  if (pullRes.updatedCustomers > 0) {
    summaryParts.push(`👥 ${pullRes.updatedCustomers} ग्राहक अपडेट`);
  }

  let finalMsg = '';
  if (summaryParts.length > 0) {
    finalMsg = `✅ 2-तरफा सिंक सफल: ${summaryParts.join(' • ')}`;
  } else if (pushRes.success && pullRes.success) {
    finalMsg = '✅ मोबाइल और लैपटॉप दोनों पूरी तरह सिंक हैं!';
  } else {
    finalMsg = pullRes.message || pushRes.message || 'सिंक पूर्ण';
  }

  return {
    success: pushRes.success && pullRes.success,
    pushedInvoices: pushRes.syncedInvoices,
    pushedLedgers: pushRes.syncedLedgers,
    pulledInvoices: pullRes.newInvoices,
    pulledLedgers: pullRes.newLedgers,
    updatedCustomers: pullRes.updatedCustomers,
    message: finalMsg
  };
}

/**
 * 4. FULL SYNC: Overwrite Google Sheet with full local catalog & data
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
      message: `✅ गूगल शीट में पूरा डेटा सिंक हुआ! (${allCustomers.length} ग्राहक, ${allItems.length} सामान, ${allInvoices.length} बिल)`
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
