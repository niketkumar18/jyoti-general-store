export type UnitType = 'KG' | 'GM' | 'LITRE' | 'ML' | 'PACKET' | 'PIECE' | 'DOZEN';

export type CategoryType = 
  | 'dal_pulses'      // दाल व दलहन
  | 'oil_ghee'        // तेल व घी
  | 'spices_masala'   // मसाले
  | 'soap_detergent'  // साबुन व सर्फ
  | 'snacks_biscuit'  // नाश्ता व बिस्कुट
  | 'flour_grains'    // आटा, चावल व अनाज
  | 'beverages'       // चाय, कॉफी व पेय
  | 'dairy'           // दूध व डेयरी
  | 'personal_care'   // व्यक्तिगत देखभाल
  | 'household'       // घरेलू सामान
  | 'other';          // अन्य

export interface InventoryItem {
  id?: number;
  nameEn: string;
  nameHi: string;
  category: CategoryType;
  unit: UnitType;
  salePrice: number;
  costPrice?: number;
  stockQty: number;
  lowStockThreshold: number;
  barcode?: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export type RiskLevel = 'safe' | 'warning' | 'danger';

export interface Customer {
  id?: number;
  name: string;
  mobile: string;
  address?: string;
  creditLimit: number; // Default e.g. ₹2000
  currentBalance: number; // Positive = Outstanding debt (उधार), Negative = Advance (जमा)
  riskLevel: RiskLevel; // calculated: safe (<50%), warning (50-100%), danger (>100%)
  createdAt: number;
  updatedAt: number;
  notes?: string;
}

export type PaymentMethod = 'CASH' | 'UPI' | 'CREDIT' | 'SPLIT';

export interface CartItem {
  itemId: number;
  nameEn: string;
  nameHi: string;
  unit: UnitType;
  quantity: number; // Can be fractional e.g. 0.25 for 250 gm
  salePrice: number;
  costPrice?: number;
  total: number;
}

export interface InvoiceItem {
  itemId: number;
  nameEn: string;
  nameHi: string;
  unit: UnitType;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  total: number;
}

export interface Invoice {
  id?: number;
  invoiceNumber: string; // e.g. DEN-1042
  customerId?: number;
  customerName: string;
  customerMobile: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  paidAmount: number;     // Amount paid now
  dueAmount: number;      // Added to Udhar
  paymentMethod: PaymentMethod;
  notes?: string;
  syncedToGoogle: boolean;
  createdAt: number;
}

export type LedgerEntryType = 'DEBIT' | 'CREDIT'; // DEBIT = सामान लिया (उधार), CREDIT = रुपये जमा किये (जमा)

export interface LedgerEntry {
  id?: number;
  customerId: number;
  customerName: string;
  type: LedgerEntryType;
  amount: number;
  paymentMode?: 'CASH' | 'UPI' | 'BILL';
  billId?: number;
  invoiceNumber?: string;
  description: string;
  runningBalance: number;
  syncedToGoogle: boolean;
  createdAt: number;
}

export interface ShopSettings {
  shopName: string;
  shopNameHi: string;
  tagline: string;
  ownerName: string;
  mobile: string;
  address: string;
  gstin?: string;
  upiId: string; // e.g. "kirana@okaxis" for QR code generation
  defaultCreditLimit: number;
  thermalPaperWidth: '58mm' | '80mm';
  enableSound: boolean;
  googleSheetsUrl?: string; // Google Apps Script web app endpoint
  autoSync: boolean;
  lastSyncedAt?: number;
}
