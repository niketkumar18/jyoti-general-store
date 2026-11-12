import { db } from '../db';
import type { Invoice, Customer, InventoryItem, LedgerEntry } from '../types';

export interface SyncResult {
  success: boolean;
  syncedInvoices: number;
  syncedLedgers: number;
  message: string;
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `
/**
 * DEN Kirana POS - 100% Free Google Sheets Sync Webhook
 * 
 * Instructions:
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Create 4 tabs: "Invoices", "Ledger", "Customers", "Inventory"
 * 3. Go to Extensions > Apps Script
 * 4. Paste this code completely, click Save, then Deploy > New Deployment
 * 5. Select type "Web app", Execute as "Me", Who has access "Anyone"
 * 6. Copy the Web App URL and paste it into DEN Settings!
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    if (action === 'SYNC_ALL' || action === 'SYNC_INVOICE') {
      if (payload.invoices && payload.invoices.length > 0) {
        var sheetInvoices = ss.getSheetByName('Invoices') || ss.insertSheet('Invoices');
        if (sheetInvoices.getLastRow() === 0) {
          sheetInvoices.appendRow(['Date', 'Invoice #', 'Customer Name', 'Mobile', 'Grand Total', 'Paid', 'Due / Udhar', 'Payment Mode', 'Items']);
        }
        payload.invoices.forEach(function(inv) {
          sheetInvoices.appendRow([
            new Date(inv.createdAt).toLocaleString(),
            inv.invoiceNumber,
            inv.customerName,
            inv.customerMobile,
            inv.grandTotal,
            inv.paidAmount,
            inv.dueAmount,
            inv.paymentMethod,
            JSON.stringify(inv.items)
          ]);
        });
      }

      if (payload.ledgers && payload.ledgers.length > 0) {
        var sheetLedger = ss.getSheetByName('Ledger') || ss.insertSheet('Ledger');
        if (sheetLedger.getLastRow() === 0) {
          sheetLedger.appendRow(['Date', 'Customer Name', 'Type (DEBIT/CREDIT)', 'Amount', 'Mode', 'Bill Ref', 'Description', 'Balance']);
        }
        payload.ledgers.forEach(function(led) {
          sheetLedger.appendRow([
            new Date(led.createdAt).toLocaleString(),
            led.customerName,
            led.type,
            led.amount,
            led.paymentMode || '',
            led.invoiceNumber || '',
            led.description,
            led.runningBalance
          ]);
        });
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Synced successfully' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ignored' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;

export async function syncPendingToGoogleSheets(webhookUrl: string): Promise<SyncResult> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return {
      success: false,
      syncedInvoices: 0,
      syncedLedgers: 0,
      message: 'गूगल शीट वेबहुक URL सेट नहीं है / Google Sheets URL is not configured'
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
        message: 'सभी डेटा पहले से गूगल शीट में सिंक है / All records already up to date'
      };
    }

    const payload = {
      action: 'SYNC_ALL',
      invoices: unsyncedInvoices,
      ledgers: unsyncedLedgers,
      timestamp: Date.now()
    };

    // Send payload using no-cors or JSON post
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Mark as synced in Dexie
    for (const inv of unsyncedInvoices) {
      if (inv.id) {
        await db.invoices.update(inv.id, { syncedToGoogle: true });
      }
    }

    for (const led of unsyncedLedgers) {
      if (led.id) {
        await db.ledger.update(led.id, { syncedToGoogle: true });
      }
    }

    return {
      success: true,
      syncedInvoices: unsyncedInvoices.length,
      syncedLedgers: unsyncedLedgers.length,
      message: `${unsyncedInvoices.length} बिल और ${unsyncedLedgers.length} खाता प्रविष्टियां सिंक की गईं!`
    };
  } catch (error: any) {
    console.error('Sync failed:', error);
    return {
      success: false,
      syncedInvoices: 0,
      syncedLedgers: 0,
      message: error?.message || 'सिंक करने में त्रुटि आई (ऑफलाइन मोड सक्रिय)'
    };
  }
}
