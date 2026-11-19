import { db } from '../db';
import type { Invoice, Customer, InventoryItem, LedgerEntry, Vendor, VendorLedgerEntry, ShopSettings } from '../types';

export interface SyncResult {
  success: boolean;
  syncedInvoices: number;
  syncedLedgers: number;
  syncedCustomers?: number;
  syncedItems?: number;
  syncedVendors?: number;
  message: string;
}

export interface TwoWaySyncResult {
  success: boolean;
  pushedInvoices: number;
  pushedLedgers: number;
  pulledInvoices: number;
  pulledLedgers: number;
  updatedCustomers: number;
  updatedItems?: number;
  updatedVendors?: number;
  message: string;
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * DEN Kirana POS - 100% Free Google Sheets Cloud Database (2-Way Multi-Device Sync)
 * 
 * Instructions for Jyoti General Store (2-Minute Setup):
 * 1. Open your master Google Sheet:
 *    https://docs.google.com/spreadsheets/d/1_RZUvzdgP4TUIVl0M0DyUTyyIgjkSmQ_nhlvgm781N0/edit
 * 2. Extensions (एक्सटेंशन) > Apps Script
 * 3. Delete existing code and paste this entire code
 * 4. Click Save (💾)
 * 5. (⚡ ONE-CLICK TEST): Select "setupAllTabsNow" from top dropdown and click Run (▶️)
 *    -> Check your Google Sheet! All 6 tabs will appear immediately!
 * 6. Click Deploy > New deployment (or Manage deployments > New version)
 *    -> Select type: "Web app"
 *    -> Execute as: "Me"
 *    -> Who has access: "Anyone" (VERY IMPORTANT)
 * 7. Copy the Web App URL (ends with /exec) into DEN Settings on Laptop & Mobile!
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
  if (!ss) {
    try { ss = SpreadsheetApp.openById('1_RZUvzdgP4TUIVl0M0DyUTyyIgjkSmQ_nhlvgm781N0'); } catch(err) {}
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
      var numColsInv = Math.max(12, sheetInv.getLastColumn());
      var dataInv = sheetInv.getRange(2, 1, sheetInv.getLastRow() - 1, numColsInv).getValues();
      for (var i = 0; i < dataInv.length; i++) {
        var r = dataInv[i];
        if (r[1]) { // invoiceNumber
          var rawItemsJson = (numColsInv >= 12 && r[11]) ? String(r[11]) : (numColsInv >= 10 ? String(r[9]) : '');
          var parsedItems = [];
          if (rawItemsJson && rawItemsJson.charAt(0) === '[') {
            try { parsedItems = JSON.parse(rawItemsJson); } catch(errP) {}
          }
          invoices.push({
            createdAt: r[0] ? new Date(r[0]).getTime() : Date.now(),
            invoiceNumber: String(r[1]),
            customerName: String(r[2] || 'नकद ग्राहक'),
            customerMobile: String(r[3] || ''),
            subtotal: Number(r[4]) || Number(r[6]) || 0,
            discount: Number(r[5]) || 0,
            grandTotal: Number(r[6]) || Number(r[4]) || 0,
            paidAmount: Number(r[7]) || Number(r[5]) || 0,
            dueAmount: Number(r[8]) || Number(r[6]) || 0,
            paymentMethod: String(r[9] || r[7] || 'CASH'),
            itemsSummary: String(r[10] || r[8] || ''),
            items: parsedItems
          });
        }
      }
    }

    // 2. Read Customer Ledger
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

    // 4. Read Inventory (Items & Stock)
    var items = [];
    var sheetItems = ss.getSheetByName('Inventory');
    if (sheetItems && sheetItems.getLastRow() > 1) {
      var numColsI = Math.max(12, sheetItems.getLastColumn());
      var dataItems = sheetItems.getRange(2, 1, sheetItems.getLastRow() - 1, numColsI).getValues();
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
            barcode: String(rI[8] || ''),
            bulkDiscountThreshold: Number(rI[9]) || undefined,
            bulkDiscountRate: Number(rI[10]) || undefined,
            isComplementary: Boolean(rI[11] === 'हां' || rI[11] === true || rI[11] === 'YES')
          });
        }
      }
    }

    // 5. Read Vendors (Suppliers)
    var vendors = [];
    var sheetVendors = ss.getSheetByName('Vendors');
    if (sheetVendors && sheetVendors.getLastRow() > 1) {
      var dataV = sheetVendors.getRange(2, 1, sheetVendors.getLastRow() - 1, 8).getValues();
      for (var v = 0; v < dataV.length; v++) {
        var rV = dataV[v];
        if (rV[0]) {
          vendors.push({
            name: String(rV[0]),
            firmName: String(rV[1] || ''),
            mobile: String(rV[2] || ''),
            category: String(rV[3] || ''),
            currentBalance: Number(rV[4]) || 0,
            totalPurchased: Number(rV[5]) || 0,
            totalPaid: Number(rV[6]) || 0,
            address: String(rV[7] || '')
          });
        }
      }
    }

    // 6. Read VendorLedger
    var vendorLedgers = [];
    var sheetVL = ss.getSheetByName('VendorLedger');
    if (sheetVL && sheetVL.getLastRow() > 1) {
      var dataVL = sheetVL.getRange(2, 1, sheetVL.getLastRow() - 1, 9).getValues();
      for (var vl = 0; vl < dataVL.length; vl++) {
        var rVL = dataVL[vl];
        if (rVL[1]) {
          vendorLedgers.push({
            createdAt: rVL[0] ? new Date(rVL[0]).getTime() : Date.now(),
            vendorName: String(rVL[1]),
            type: String(rVL[2]).indexOf('खरीद') > -1 ? 'PURCHASE' : 'PAYMENT',
            amount: Number(rVL[3]) || 0,
            paidAmount: Number(rVL[4]) || 0,
            dueAmount: Number(rVL[5]) || 0,
            billNumber: String(rVL[6] || ''),
            description: String(rVL[7] || ''),
            runningBalance: Number(rVL[8]) || 0
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
      vendors: vendors,
      vendorLedgers: vendorLedgers,
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
      try { ss = SpreadsheetApp.openById('1_RZUvzdgP4TUIVl0M0DyUTyyIgjkSmQ_nhlvgm781N0'); } catch(err) {}
    }
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        error: 'Spreadsheet not found'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1. GUARANTEE ALL TABS EXIST
    var sheetInvoices = getOrCreateSheet(ss, 'Invoices', ['तारीख व समय', 'बिल संख्या', 'ग्राहक का नाम', 'मोबाइल', 'उप-योग (₹)', 'छूट (₹)', 'कुल राशि (₹)', 'जमा राशि (₹)', 'उधार (₹)', 'भुगतान माध्यम', 'सामान विवरण', 'सामान डेटा (JSON)']);
    var sheetLedger = getOrCreateSheet(ss, 'Ledger', ['तारीख व समय', 'ग्राहक का नाम', 'प्रकार (उधार/जमा)', 'राशि (₹)', 'माध्यम', 'बिल सं.', 'विवरण', 'शेष उधारी (₹)']);
    var sheetCust = getOrCreateSheet(ss, 'Customers', ['ग्राहक का नाम', 'मोबाइल नंबर', 'उधारी सीमा (₹)', 'वर्तमान बकाया (₹)', 'जोखिम स्थिति', 'पता / विवरण']);
    var sheetItems = getOrCreateSheet(ss, 'Inventory', ['सामान का नाम (हिंदी)', 'सामान का नाम (English)', 'श्रेणी', 'इकाई', 'बिक्री दर (₹)', 'खरीद दर (₹)', 'स्टॉक मात्रा', 'न्यूनतम स्टॉक चेतावनी', 'बारकोड', 'थोक सीमा', 'थोक दर (₹)', 'उपहार (मुफ्त)']);
    var sheetVendors = getOrCreateSheet(ss, 'Vendors', ['सप्लायर का नाम', 'फर्म / एजेंसी का नाम', 'मोबाइल नंबर', 'श्रेणी', 'बकाया देना (₹)', 'कुल खरीद (₹)', 'कुल भुगतान (₹)', 'पता / विवरण']);
    var sheetVL = getOrCreateSheet(ss, 'VendorLedger', ['तारीख व समय', 'सप्लायर का नाम', 'लेनदेन प्रकार', 'कुल राशि (₹)', 'भुगतान (₹)', 'बाकी (₹)', 'बिल सं.', 'सामान विवरण', 'शेष बकाया (₹)']);

    // 2. DASHBOARD / HOME TAB
    try {
      var homeSheet = ss.getSheetByName('मुख्य डैशबोर्ड') || ss.getSheetByName('Sheet1') || ss.getSheetByName('शीट1');
      if (homeSheet) {
        homeSheet.setName('मुख्य डैशबोर्ड');
        homeSheet.clear();
        homeSheet.appendRow(['🏪 DEN किराना POS एवं डिजिटल खाता बही (2-Way Live Sync Active)']);
        homeSheet.appendRow(['']);
        homeSheet.appendRow(['📌 आपकी दुकान का सारा रिकॉर्ड नीचे दिए गए 6 अलग-अलग टैब्स (Tabs) में सुरक्षित है:']);
        homeSheet.appendRow(['1. 🧾 Invoices टैब:', 'दुकान के सभी बिक्री बिल, छूट, नकद व उधार राशि']);
        homeSheet.appendRow(['2. 📒 Ledger टैब:', 'तारीख अनुसार ग्राहक उधारी (Debit) एवं जमा (Credit) का पूरा हिसाब']);
        homeSheet.appendRow(['3. 👥 Customers टैब:', 'ग्राहकों के नाम, फोन, उधारी सीमा व वर्तमान कुल बकाया']);
        homeSheet.appendRow(['4. 📦 Inventory टैब:', 'दुकान का सारा सामान, खरीद/बिक्री दर और मौजूदा स्टॉक']);
        homeSheet.appendRow(['5. 🏭 Vendors टैब:', 'थोक सप्लायर, डीलर, फर्म नाम और उनका बकाया हिसाब']);
        homeSheet.appendRow(['6. 🚚 VendorLedger टैब:', 'सप्लायर खरीद इनवर्ड बिल व भुगतान बहीखाता']);
        homeSheet.appendRow(['']);
        homeSheet.appendRow(['👉 मोबाइल, लैपटॉप या टैबलेट — सभी डिवाइस इसी गूगल शीट से 100% सिंक रहते हैं।']);
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
          inv.subtotal || inv.grandTotal,
          inv.discount || 0,
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

    // 5. WRITE CUSTOMERS (Full overwrite or update)
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

    // 6. WRITE INVENTORY (Full overwrite or update)
    if (payload.items && payload.items.length > 0) {
      sheetItems.clear();
      sheetItems.appendRow(['सामान का नाम (हिंदी)', 'सामान का नाम (English)', 'श्रेणी', 'इकाई', 'बिक्री दर (₹)', 'खरीद दर (₹)', 'स्टॉक मात्रा', 'न्यूनतम स्टॉक चेतावनी', 'बारकोड', 'थोक सीमा', 'थोक दर (₹)', 'उपहार (मुफ्त)']);
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
          it.barcode || '',
          it.bulkDiscountThreshold || '',
          it.bulkDiscountRate || '',
          it.isComplementary ? 'हां' : 'नहीं'
        ]);
      });
    }

    // 7. WRITE VENDORS
    if (payload.vendors && payload.vendors.length > 0) {
      sheetVendors.clear();
      sheetVendors.appendRow(['सप्लायर का नाम', 'फर्म / एजेंसी का नाम', 'मोबाइल नंबर', 'श्रेणी', 'बकाया देना (₹)', 'कुल खरीद (₹)', 'कुल भुगतान (₹)', 'पता / विवरण']);
      payload.vendors.forEach(function(v) {
        sheetVendors.appendRow([
          v.name,
          v.firmName || '',
          v.mobile || '',
          v.category || '',
          v.currentBalance || 0,
          v.totalPurchased || 0,
          v.totalPaid || 0,
          v.address || v.notes || ''
        ]);
      });
    }

    // 8. WRITE VENDOR LEDGER
    if (payload.vendorLedgers && payload.vendorLedgers.length > 0) {
      payload.vendorLedgers.forEach(function(vl) {
        sheetVL.appendRow([
          new Date(vl.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          vl.vendorName,
          vl.type === 'PURCHASE' ? 'माल खरीदा (PURCHASE)' : 'रुपये चुकाए (PAYMENT)',
          vl.amount,
          vl.paidAmount || 0,
          vl.dueAmount || 0,
          vl.billNumber || '',
          vl.description || '',
          vl.runningBalance || 0
        ]);
      });
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'All 6 tabs synced successfully!'
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
  if (!ss) {
    try { ss = SpreadsheetApp.openById('1_RZUvzdgP4TUIVl0M0DyUTyyIgjkSmQ_nhlvgm781N0'); } catch(err) {}
  }
  if (!ss) return;

  try {
    if (ss.getName() === 'Untitled spreadsheet' || ss.getName() === 'बिना शीर्षक वाली स्प्रेडशीट') {
      ss.setName('DEN किराना स्टोर बहीखाता (DEN Kirana Cloud Ledger)');
    }
  } catch(e) {}

  // 1. Invoices tab
  var inv = getOrCreateSheet(ss, 'Invoices', ['तारीख व समय', 'बिल संख्या', 'ग्राहक का नाम', 'मोबाइल', 'उप-योग (₹)', 'छूट (₹)', 'कुल राशि (₹)', 'जमा राशि (₹)', 'उधार (₹)', 'भुगतान माध्यम', 'सामान विवरण', 'सामान डेटा (JSON)']);
  if (inv.getLastRow() <= 1) {
    inv.appendRow([new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), 'MJ/SL/671', 'रमेश कुमार (वर्मा जी)', '9826011223', 1250, 0, 1250, 500, 750, 'SPLIT', 'अरहर दाल (1 KG @ ₹160), फॉर्च्यून तेल (1 LTR @ ₹155)', '[]']);
    inv.appendRow([new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), 'MJ/SL/672', 'सोनू शर्मा (पंडित जी)', '9893044556', 2200, 50, 2150, 0, 2150, 'CREDIT', 'अमुल शुद्ध घी (1 LTR @ ₹650), आटा 10KG (1 PKT @ ₹420)', '[]']);
  }

  // 2. Ledger tab
  var led = getOrCreateSheet(ss, 'Ledger', ['तारीख व समय', 'ग्राहक का नाम', 'प्रकार (उधार/जमा)', 'राशि (₹)', 'माध्यम', 'बिल सं.', 'विवरण', 'शेष उधारी (₹)']);
  if (led.getLastRow() <= 1) {
    led.appendRow([new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), 'रमेश कुमार (वर्मा जी)', 'उधार (DEBIT)', 750, 'BILL', 'MJ/SL/671', 'बिल #MJ/SL/671 का उधार', 750]);
    led.appendRow([new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), 'सोनू शर्मा (पंडित जी)', 'उधार (DEBIT)', 2150, 'BILL', 'MJ/SL/672', 'राशन का उधार', 2150]);
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
  var items = getOrCreateSheet(ss, 'Inventory', ['सामान का नाम (हिंदी)', 'सामान का नाम (English)', 'श्रेणी', 'इकाई', 'बिक्री दर (₹)', 'खरीद दर (₹)', 'स्टॉक मात्रा', 'न्यूनतम स्टॉक चेतावनी', 'बारकोड', 'थोक सीमा', 'थोक दर (₹)', 'उपहार (मुफ्त)']);
  if (items.getLastRow() <= 1) {
    items.appendRow(['अरहर / तूर दाल (प्रीमियम)', 'Toor Dal (Arhar)', 'dal_pulses', 'KG', 160, 142, 50, 10, '8901001', 5, 145, 'नहीं']);
    items.appendRow(['फॉर्च्यून सरसों तेल (1 लीटर)', 'Fortune Mustard Oil 1L', 'oil_ghee', 'PACKET', 155, 138, 45, 10, '8906007', '', '', 'नहीं']);
    items.appendRow(['आशीर्वाद चक्की आटा (10 किग्रा)', 'Aashirvaad Atta 10kg', 'flour_grains', 'PACKET', 420, 385, 18, 4, '8901030', '', '', 'नहीं']);
    items.appendRow(['अमूल शुद्ध देशी घी (1 लीटर)', 'Amul Pure Ghee 1L', 'oil_ghee', 'PIECE', 650, 590, 12, 3, '8901262', '', '', 'नहीं']);
    items.appendRow(['टाटा नमक (1 किग्रा)', 'Tata Salt 1kg', 'spices_masala', 'PACKET', 28, 24, 80, 15, '8901058', '', '', 'नहीं']);
  }

  // 5. Vendors tab
  var ven = getOrCreateSheet(ss, 'Vendors', ['सप्लायर का नाम', 'फर्म / एजेंसी का नाम', 'मोबाइल नंबर', 'श्रेणी', 'बकाया देना (₹)', 'कुल खरीद (₹)', 'कुल भुगतान (₹)', 'पता / विवरण']);
  if (ven.getLastRow() <= 1) {
    ven.appendRow(['श्री राम ट्रेडिंग कंपनी', 'श्री राम दाल, चीनी व अनाज सप्लायर', '9826112244', 'दाल, चीनी, अनाज', 3200, 15400, 12200, 'दुकान नं. 12, नई अनाज मंडी, मेघपुर']);
    ven.appendRow(['अग्रवाल ऑयल्स डिपो', 'फॉर्च्यून व अमूल डिस्ट्रीब्यूटर', '9893556677', 'तेल व घी', 1550, 18500, 16950, 'स्टेशन रोड, मेघपुर']);
    ven.appendRow(['गुप्ता किराना एजेंसी', 'गुप्ता ब्रदर्स एफएमसीजी', '9425889900', 'मसाले, सर्फ, साबुन, बिस्कुट', 0, 8200, 8200, 'मेन मार्केट, मेघपुर']);
  }

  // 6. VendorLedger tab
  var vl = getOrCreateSheet(ss, 'VendorLedger', ['तारीख व समय', 'सप्लायर का नाम', 'लेनदेन प्रकार', 'कुल राशि (₹)', 'भुगतान (₹)', 'बाकी (₹)', 'बिल सं.', 'सामान विवरण', 'शेष बकाया (₹)']);
  if (vl.getLastRow() <= 1) {
    vl.appendRow([new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), 'श्री राम ट्रेडिंग कंपनी', 'माल खरीदा (PURCHASE)', 15400, 12200, 3200, 'SR/2026/104', 'अरहर दाल 100KG, चीनी 200KG', 3200]);
    vl.appendRow([new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), 'अग्रवाल ऑयल्स डिपो', 'माल खरीदा (PURCHASE)', 18500, 16950, 1550, 'AG-998', 'सरसों तेल 5 पेटी, अमूल घी 2 पेटी', 1550]);
  }

  // 7. Dashboard Home
  var home = getOrCreateSheet(ss, 'मुख्य डैशबोर्ड');
  home.clear();
  home.appendRow(['🏪 DEN किराना POS एवं डिजिटल खाता बही (2-Way Live Sync Active)']);
  home.appendRow(['']);
  home.appendRow(['📌 आपकी दुकान का सारा रिकॉर्ड नीचे दिए गए 6 अलग-अलग टैब्स (Tabs) में सुरक्षित है:']);
  home.appendRow(['1. 🧾 Invoices टैब:', 'दुकान के सभी बिक्री बिल, छूट व नकद/उधार राशि']);
  home.appendRow(['2. 📒 Ledger टैब:', 'तारीख अनुसार ग्राहक उधारी (Debit) एवं जमा (Credit) का हिसाब']);
  home.appendRow(['3. 👥 Customers टैब:', 'ग्राहकों के नाम, फोन, उधारी सीमा व वर्तमान कुल बकाया']);
  home.appendRow(['4. 📦 Inventory टैब:', 'दुकान का सारा सामान, खरीद/बिक्री दर और मौजूदा स्टॉक']);
  home.appendRow(['5. 🏭 Vendors टैब:', 'सप्लायर / महाजन, फर्म नाम, और उनको कितना देना बाकी है']);
  home.appendRow(['6. 🚚 VendorLedger टैब:', 'सप्लायर खरीद इनवर्ड बिल व भुगतान बहीखाता']);
  home.appendRow(['']);
  home.appendRow(['👉 डेटा देखने के लिए नीचे दिए टैब्स [ Invoices ] [ Ledger ] [ Customers ] [ Inventory ] [ Vendors ] [ VendorLedger ] पर क्लिक करें!']);
  home.appendRow(['अंतिम सिंक समय:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })]);

  Logger.log('Success! All 6 tabs created and filled.');
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
    const allInvoices = await db.invoices.toArray();
    const unsyncedInvoices = allInvoices.filter((inv) => !inv.syncedToGoogle);

    const allLedgers = await db.ledger.toArray();
    const unsyncedLedgers = allLedgers.filter((led) => !led.syncedToGoogle);

    const allVendorLedgers = await db.vendorLedger.toArray();
    const unsyncedVendorLedgers = allVendorLedgers.filter((vl) => !vl.syncedToGoogle);

    if (unsyncedInvoices.length === 0 && unsyncedLedgers.length === 0 && unsyncedVendorLedgers.length === 0) {
      return {
        success: true,
        syncedInvoices: 0,
        syncedLedgers: 0,
        message: 'सभी स्थानीय बिल पहले से गूगल शीट में सिंक हैं।'
      };
    }

    // Ping check to verify Webhook URL is alive and accessible
    const testUrl = `${webhookUrl.trim()}${webhookUrl.includes('?') ? '&' : '?'}action=STATUS&_t=${Date.now()}`;
    const pingResp = await fetch(testUrl).catch(() => null);
    if (pingResp && !pingResp.ok) {
      if (pingResp.status === 403) {
        throw new Error('Google Apps Script अनुमति त्रुटि (403): कृपया Apps Script में "Who has access" को "Anyone" सेट करें और New version डिप्लॉय करें।');
      }
      if (pingResp.status === 404) {
        throw new Error('Google Apps Script URL नहीं मिला (404): कृपया नया Web App URL बनाएं और DEN सेटिंग्स में पेस्ट करें।');
      }
    }

    const payload = {
      action: 'SYNC_PENDING',
      sheetId: extractSheetId(sheetDocumentUrl),
      invoices: unsyncedInvoices,
      ledgers: unsyncedLedgers,
      vendorLedgers: unsyncedVendorLedgers,
      timestamp: Date.now()
    };

    await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).catch(async () => {
      // Fallback
      await fetch(webhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
    });

    for (const inv of unsyncedInvoices) {
      if (inv.id) await db.invoices.update(inv.id, { syncedToGoogle: true });
    }
    for (const led of unsyncedLedgers) {
      if (led.id) await db.ledger.update(led.id, { syncedToGoogle: true });
    }
    for (const vl of unsyncedVendorLedgers) {
      if (vl.id) await db.vendorLedger.update(vl.id, { syncedToGoogle: true });
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
 * 2. PULL: Pulls latest bills, customers, ledger, items & vendors from Google Sheets into local IndexedDB
 */
export async function pullFromGoogleSheets(
  webhookUrl: string,
  sheetDocumentUrl?: string
): Promise<{
  success: boolean;
  newInvoices: number;
  newLedgers: number;
  updatedCustomers: number;
  updatedItems: number;
  updatedVendors: number;
  message: string;
}> {
  const check = validateWebhookUrl(webhookUrl);
  if (!check.valid) {
    return {
      success: false,
      newInvoices: 0,
      newLedgers: 0,
      updatedCustomers: 0,
      updatedItems: 0,
      updatedVendors: 0,
      message: check.error || 'अमान्य Webhook URL'
    };
  }

  try {
    const sheetId = extractSheetId(sheetDocumentUrl) || '';
    const fetchUrl = `${webhookUrl.trim()}${webhookUrl.includes('?') ? '&' : '?'}action=PULL&sheetId=${encodeURIComponent(sheetId)}&_t=${Date.now()}`;

    const resp = await fetch(fetchUrl);
    if (!resp.ok) {
      if (resp.status === 403) {
        throw new Error('Google Apps Script अनुमति त्रुटि (HTTP 403): कृपया Apps Script में Deploy > Manage deployments > Edit करके "Who has access" को "Anyone" चुनें और New version डिप्लॉय करें।');
      }
      if (resp.status === 404) {
        throw new Error('Google Apps Script URL नहीं मिला (HTTP 404): कृपया Apps Script में नया Web App URL बनाएं और DEN सेटिंग्स में पेस्ट करें।');
      }
      throw new Error(`Google Sheets सर्वर से संपर्क नहीं हो सका (HTTP ${resp.status})`);
    }

    const data = await resp.json();

    // Check if old Apps Script is running (returns status 'online' instead of 'success')
    if (data.status === 'online' && !data.invoices) {
      return {
        success: true,
        newInvoices: 0,
        newLedgers: 0,
        updatedCustomers: 0,
        updatedItems: 0,
        updatedVendors: 0,
        message: 'Google Sheets सक्रिय है। पूर्ण 2-तरफा लाइव सिंक हेतु Apps Script में नया कोड अपडेट करें।'
      };
    }

    if (data.status !== 'success') {
      throw new Error(data.error || 'Google Sheets से डेटा प्राप्त करने में त्रुटि');
    }

    let newInvoicesCount = 0;
    let newLedgersCount = 0;
    let updatedCustomersCount = 0;
    let updatedItemsCount = 0;
    let updatedVendorsCount = 0;

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
            subtotal: cloudInv.subtotal || cloudInv.grandTotal,
            discount: cloudInv.discount || 0,
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
            customerId: 0,
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

    // D. Sync Inventory Items & Stock from Cloud
    if (Array.isArray(data.items) && data.items.length > 0) {
      for (const cloudItem of data.items) {
        if (!cloudItem.nameHi && !cloudItem.nameEn) continue;
        const existing = cloudItem.barcode
          ? await db.items.where('barcode').equals(cloudItem.barcode).first()
          : (cloudItem.nameHi ? await db.items.where('nameHi').equals(cloudItem.nameHi).first() : null) ||
            (cloudItem.nameEn ? await db.items.where('nameEn').equals(cloudItem.nameEn).first() : null);

        if (existing && existing.id) {
          await db.items.update(existing.id, {
            salePrice: cloudItem.salePrice ?? existing.salePrice,
            costPrice: cloudItem.costPrice ?? existing.costPrice,
            stockQty: cloudItem.stockQty ?? existing.stockQty,
            unit: cloudItem.unit || existing.unit,
            category: cloudItem.category || existing.category,
            lowStockThreshold: cloudItem.lowStockThreshold || existing.lowStockThreshold,
            bulkDiscountThreshold: cloudItem.bulkDiscountThreshold ?? existing.bulkDiscountThreshold,
            bulkDiscountRate: cloudItem.bulkDiscountRate ?? existing.bulkDiscountRate,
            isComplementary: cloudItem.isComplementary ?? existing.isComplementary,
            updatedAt: Date.now()
          });
          updatedItemsCount++;
        } else {
          await db.items.add({
            nameHi: cloudItem.nameHi || cloudItem.nameEn,
            nameEn: cloudItem.nameEn || cloudItem.nameHi,
            category: cloudItem.category || 'other',
            unit: cloudItem.unit || 'PIECE',
            salePrice: cloudItem.salePrice || 0,
            costPrice: cloudItem.costPrice || 0,
            stockQty: cloudItem.stockQty || 0,
            lowStockThreshold: cloudItem.lowStockThreshold || 5,
            barcode: cloudItem.barcode || '',
            bulkDiscountThreshold: cloudItem.bulkDiscountThreshold,
            bulkDiscountRate: cloudItem.bulkDiscountRate,
            isComplementary: Boolean(cloudItem.isComplementary),
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          updatedItemsCount++;
        }
      }
    }

    // E. Sync Vendors from Cloud
    if (Array.isArray(data.vendors) && data.vendors.length > 0) {
      for (const cloudV of data.vendors) {
        if (!cloudV.name) continue;
        const existing = cloudV.mobile && cloudV.mobile !== '0000000000'
          ? await db.vendors.where('mobile').equals(cloudV.mobile).first()
          : await db.vendors.where('name').equals(cloudV.name).first();

        if (existing && existing.id) {
          await db.vendors.update(existing.id, {
            currentBalance: cloudV.currentBalance ?? existing.currentBalance,
            totalPurchased: cloudV.totalPurchased ?? existing.totalPurchased,
            totalPaid: cloudV.totalPaid ?? existing.totalPaid,
            firmName: cloudV.firmName || existing.firmName,
            category: cloudV.category || existing.category,
            address: cloudV.address || existing.address,
            updatedAt: Date.now()
          });
          updatedVendorsCount++;
        } else if (!existing) {
          await db.vendors.add({
            name: cloudV.name,
            firmName: cloudV.firmName || '',
            mobile: cloudV.mobile || '',
            address: cloudV.address || '',
            category: cloudV.category || 'general',
            currentBalance: cloudV.currentBalance || 0,
            totalPurchased: cloudV.totalPurchased || 0,
            totalPaid: cloudV.totalPaid || 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          updatedVendorsCount++;
        }
      }
    }

    // F. Sync VendorLedger from Cloud
    if (Array.isArray(data.vendorLedgers) && data.vendorLedgers.length > 0) {
      for (const cloudVL of data.vendorLedgers) {
        const existing = await db.vendorLedger
          .where('amount')
          .equals(cloudVL.amount)
          .filter((l) =>
            l.vendorName === cloudVL.vendorName &&
            l.type === cloudVL.type &&
            (cloudVL.billNumber ? l.billNumber === cloudVL.billNumber : true)
          )
          .first();

        if (!existing) {
          const matchedVendor = await db.vendors.where('name').equals(cloudVL.vendorName).first();
          await db.vendorLedger.add({
            vendorId: matchedVendor?.id || 0,
            vendorName: cloudVL.vendorName,
            type: cloudVL.type,
            amount: cloudVL.amount,
            paidAmount: cloudVL.paidAmount,
            dueAmount: cloudVL.dueAmount,
            billNumber: cloudVL.billNumber,
            description: cloudVL.description || '',
            runningBalance: cloudVL.runningBalance || 0,
            syncedToGoogle: true,
            createdAt: cloudVL.createdAt || Date.now()
          });
        }
      }
    }

    return {
      success: true,
      newInvoices: newInvoicesCount,
      newLedgers: newLedgersCount,
      updatedCustomers: updatedCustomersCount,
      updatedItems: updatedItemsCount,
      updatedVendors: updatedVendorsCount,
      message: (newInvoicesCount > 0 || updatedCustomersCount > 0 || updatedItemsCount > 0 || updatedVendorsCount > 0)
        ? `📥 Google Sheets से ${newInvoicesCount} नए बिल, ${updatedCustomersCount} ग्राहक, ${updatedItemsCount} सामान, व ${updatedVendorsCount} सप्लायर सिंक हुए!`
        : 'Google Sheets के साथ सभी बिल व सामान पहले से सिंक हैं।'
    };
  } catch (err: any) {
    console.error('Pull from Google Sheets failed:', err);
    return {
      success: false,
      newInvoices: 0,
      newLedgers: 0,
      updatedCustomers: 0,
      updatedItems: 0,
      updatedVendors: 0,
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
  if (pullRes.updatedItems && pullRes.updatedItems > 0) {
    summaryParts.push(`📦 ${pullRes.updatedItems} सामान अपडेट`);
  }
  if (pullRes.updatedVendors && pullRes.updatedVendors > 0) {
    summaryParts.push(`🏭 ${pullRes.updatedVendors} सप्लायर अपडेट`);
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
    updatedItems: pullRes.updatedItems,
    updatedVendors: pullRes.updatedVendors,
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
    // Ping check to verify Webhook URL is alive and accessible
    const testUrl = `${webhookUrl.trim()}${webhookUrl.includes('?') ? '&' : '?'}action=STATUS&_t=${Date.now()}`;
    const pingResp = await fetch(testUrl).catch(() => null);
    if (pingResp && !pingResp.ok) {
      if (pingResp.status === 403) {
        throw new Error('Google Apps Script अनुमति त्रुटि (403): कृपया Apps Script में "Who has access" को "Anyone" सेट करें और New version डिप्लॉय करें।');
      }
      if (pingResp.status === 404) {
        throw new Error('Google Apps Script URL नहीं मिला (404): कृपया नया Web App URL बनाएं और DEN सेटिंग्स में पेस्ट करें।');
      }
      throw new Error(`Google Sheets सर्वर से संपर्क नहीं हो सका (HTTP ${pingResp.status})`);
    }

    const allInvoices = await db.invoices.toArray();
    const allLedgers = await db.ledger.toArray();
    const allCustomers = await db.customers.toArray();
    const allItems = await db.items.toArray();
    const allVendors = await db.vendors.toArray();
    const allVendorLedgers = await db.vendorLedger.toArray();

    const payload = {
      action: 'SYNC_FULL',
      sheetId: extractSheetId(sheetDocumentUrl),
      invoices: allInvoices,
      ledgers: allLedgers,
      customers: allCustomers,
      items: allItems,
      vendors: allVendors,
      vendorLedgers: allVendorLedgers,
      timestamp: Date.now()
    };

    await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).catch(async () => {
      await fetch(webhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
    });

    for (const inv of allInvoices) {
      if (inv.id) await db.invoices.update(inv.id, { syncedToGoogle: true });
    }
    for (const led of allLedgers) {
      if (led.id) await db.ledger.update(led.id, { syncedToGoogle: true });
    }
    for (const vl of allVendorLedgers) {
      if (vl.id) await db.vendorLedger.update(vl.id, { syncedToGoogle: true });
    }

    return {
      success: true,
      syncedInvoices: allInvoices.length,
      syncedLedgers: allLedgers.length,
      syncedCustomers: allCustomers.length,
      syncedItems: allItems.length,
      syncedVendors: allVendors.length,
      message: `✅ गूगल शीट में पूरा डेटा सिंक हुआ! (${allCustomers.length} ग्राहक, ${allItems.length} सामान, ${allVendors.length} सप्लायर, ${allInvoices.length} बिल)`
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
