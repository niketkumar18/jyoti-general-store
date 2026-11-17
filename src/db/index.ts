import Dexie, { type Table } from 'dexie';
import type { InventoryItem, Customer, Invoice, LedgerEntry, Vendor, VendorLedgerEntry } from '../types';

export interface AppSettingRecord {
  key: string;
  value: any;
}

export class DenDatabase extends Dexie {
  items!: Table<InventoryItem, number>;
  customers!: Table<Customer, number>;
  invoices!: Table<Invoice, number>;
  ledger!: Table<LedgerEntry, number>;
  vendors!: Table<Vendor, number>;
  vendorLedger!: Table<VendorLedgerEntry, number>;
  settings!: Table<AppSettingRecord, string>;

  constructor() {
    super('DenKiranaDB');
    this.version(1).stores({
      items: '++id, nameEn, nameHi, category, unit, barcode, stockQty, updatedAt',
      customers: '++id, name, mobile, riskLevel, currentBalance, updatedAt',
      invoices: '++id, invoiceNumber, customerId, customerMobile, paymentMethod, syncedToGoogle, createdAt',
      ledger: '++id, customerId, type, billId, syncedToGoogle, createdAt',
      settings: 'key'
    });
    this.version(2).stores({
      items: '++id, nameEn, nameHi, category, unit, barcode, stockQty, updatedAt',
      customers: '++id, name, mobile, riskLevel, currentBalance, updatedAt',
      invoices: '++id, invoiceNumber, customerId, customerMobile, paymentMethod, syncedToGoogle, createdAt',
      ledger: '++id, customerId, type, billId, syncedToGoogle, createdAt',
      vendors: '++id, name, mobile, firmName, currentBalance, updatedAt',
      vendorLedger: '++id, vendorId, type, itemId, createdAt',
      settings: 'key'
    });
  }
}

export const db = new DenDatabase();
