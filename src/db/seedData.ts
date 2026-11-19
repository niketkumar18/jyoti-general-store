import { db } from './index';
import type { InventoryItem, Customer, ShopSettings, Vendor, VendorLedgerEntry } from '../types';

export const DEFAULT_GOOGLE_SHEETS_URL = '';
export const DEFAULT_GOOGLE_SHEET_DOCUMENT_URL = 'https://docs.google.com/spreadsheets/d/1_RZUvzdgP4TUIVl0M0DyUTyyIgjkSmQ_nhlvgm781N0/edit';

export const initialSettings: ShopSettings = {
  shopName: 'M/S JYOTI GENERAL STORE',
  shopNameHi: 'ज्योति जनरल स्टोर',
  tagline: 'शुद्धता और विश्वास का प्रतीक | DEN POS',
  ownerName: 'दुकानदार भैया',
  mobile: '9931300369',
  email: 'jyotigeneralstore11@gmail.com',
  address: 'महावीर स्थान मेघपुर दीप मार्केट, मेघपुर बड़ा सुरसंड पश्चिमी, Bihar, 843331',
  placeOfSupply: 'Bihar',
  gstin: '10AOGPC3358B2ZR',
  upiId: '9931300369@okbizaxis',
  qrCodeImageUrl: '/jyoti-qr-standee.jpg',
  defaultCreditLimit: 2000,
  thermalPaperWidth: '80mm',
  enableSound: true,
  autoSync: true,
  googleSheetsUrl: DEFAULT_GOOGLE_SHEETS_URL,
  googleSheetDocumentUrl: DEFAULT_GOOGLE_SHEET_DOCUMENT_URL
};

export const sampleItems: Omit<InventoryItem, 'id'>[] = [
  // दाल व दलहन
  { nameEn: 'Toor Dal (Arhar)', nameHi: 'अरहर / तूर दाल (प्रीमियम)', category: 'dal_pulses', unit: 'KG', salePrice: 160, costPrice: 142, stockQty: 50, lowStockThreshold: 10, barcode: '8901001', bulkDiscountThreshold: 5, bulkDiscountPercentage: 10, createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Moong Dal Dhuli', nameHi: 'मूंग दाल धुली', category: 'dal_pulses', unit: 'KG', salePrice: 120, costPrice: 105, stockQty: 35, lowStockThreshold: 5, barcode: '8901002', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Chana Dal', nameHi: 'चना दाल', category: 'dal_pulses', unit: 'KG', salePrice: 90, costPrice: 78, stockQty: 40, lowStockThreshold: 8, barcode: '8901003', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Masoor Dal Kali', nameHi: 'मसूर दाल काली साबुत', category: 'dal_pulses', unit: 'KG', salePrice: 95, costPrice: 82, stockQty: 30, lowStockThreshold: 5, barcode: '8901004', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Kabuli Chana (Chole)', nameHi: 'काबुली चना (बड़ा छोला)', category: 'dal_pulses', unit: 'KG', salePrice: 140, costPrice: 122, stockQty: 25, lowStockThreshold: 5, barcode: '8901005', createdAt: Date.now(), updatedAt: Date.now() },

  // आटा, चावल व अनाज
  { nameEn: 'Aashirvaad Shudh Chakki Atta 10kg', nameHi: 'आशीर्वाद चक्की आटा (10 किग्रा बैग)', category: 'flour_grains', unit: 'PACKET', salePrice: 420, costPrice: 385, stockQty: 18, lowStockThreshold: 4, barcode: '8901030', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Basmati Rice (Rozana)', nameHi: 'बासमती चावल (रोज़ाना)', category: 'flour_grains', unit: 'KG', salePrice: 85, costPrice: 72, stockQty: 60, lowStockThreshold: 15, barcode: '8901031', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Sona Masoori Rice', nameHi: 'सोना मसूरी चावल', category: 'flour_grains', unit: 'KG', salePrice: 58, costPrice: 48, stockQty: 80, lowStockThreshold: 20, barcode: '8901032', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Maida (Fine Wheat Flour)', nameHi: 'मैदा', category: 'flour_grains', unit: 'KG', salePrice: 40, costPrice: 32, stockQty: 25, lowStockThreshold: 5, barcode: '8901033', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Sooji / Rava', nameHi: 'सूजी / रवा', category: 'flour_grains', unit: 'KG', salePrice: 45, costPrice: 36, stockQty: 30, lowStockThreshold: 5, barcode: '8901034', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Besan (Gram Flour)', nameHi: 'राजधानी बेसन (500g)', category: 'flour_grains', unit: 'PACKET', salePrice: 55, costPrice: 46, stockQty: 40, lowStockThreshold: 8, barcode: '8901035', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Sugar (Cheeni)', nameHi: 'चीनी (सफेद दानेदार)', category: 'flour_grains', unit: 'KG', salePrice: 44, costPrice: 39, stockQty: 150, lowStockThreshold: 25, barcode: '8901036', createdAt: Date.now(), updatedAt: Date.now() },

  // तेल व घी
  { nameEn: 'Fortune Mustard Oil 1L Pouch', nameHi: 'फॉर्च्यून सरसों तेल (1 लीटर पाउच)', category: 'oil_ghee', unit: 'PACKET', salePrice: 155, costPrice: 138, stockQty: 45, lowStockThreshold: 10, barcode: '8906007', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Fortune Refined Soyabean Oil 1L', nameHi: 'फॉर्च्यून रिफाइंड सोयाबीन तेल (1 लीटर)', category: 'oil_ghee', unit: 'PACKET', salePrice: 130, costPrice: 116, stockQty: 50, lowStockThreshold: 10, barcode: '8906008', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Amul Pure Ghee 1L Tin', nameHi: 'अमूल शुद्ध देशी घी (1 लीटर)', category: 'oil_ghee', unit: 'PIECE', salePrice: 650, costPrice: 590, stockQty: 12, lowStockThreshold: 3, barcode: '8901262', createdAt: Date.now(), updatedAt: Date.now() },

  // मसाले व सामग्री
  { nameEn: 'Tata Salt (Namak) 1kg', nameHi: 'टाटा नमक (1 किग्रा)', category: 'spices_masala', unit: 'PACKET', salePrice: 28, costPrice: 24, stockQty: 80, lowStockThreshold: 15, barcode: '8901058', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'MDH Haldi Powder 100g', nameHi: 'एमडीएच हल्दी पाउडर (100 ग्राम)', category: 'spices_masala', unit: 'PACKET', salePrice: 38, costPrice: 31, stockQty: 35, lowStockThreshold: 6, barcode: '8901725', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'MDH Deggi Mirch 100g', nameHi: 'एमडीएच देगी मिर्च (100 ग्राम)', category: 'spices_masala', unit: 'PACKET', salePrice: 85, costPrice: 72, stockQty: 25, lowStockThreshold: 5, barcode: '8901726', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'MDH Garam Masala 100g', nameHi: 'एमडीएच गरम मसाला (100 ग्राम)', category: 'spices_masala', unit: 'PACKET', salePrice: 92, costPrice: 78, stockQty: 20, lowStockThreshold: 5, barcode: '8901727', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Cumin Seeds (Jeera)', nameHi: 'जीरा साबुत', category: 'spices_masala', unit: 'KG', salePrice: 340, costPrice: 290, stockQty: 15, lowStockThreshold: 3, barcode: '8901728', createdAt: Date.now(), updatedAt: Date.now() },

  // चाय, कॉफी व पेय
  { nameEn: 'Tata Tea Gold 500g', nameHi: 'टाटा टी गोल्ड (500 ग्राम)', category: 'beverages', unit: 'PACKET', salePrice: 280, costPrice: 245, stockQty: 24, lowStockThreshold: 5, barcode: '8901057', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Red Label Tea 250g', nameHi: 'रेड लेबल चाय पत्ती (250 ग्राम)', category: 'beverages', unit: 'PACKET', salePrice: 140, costPrice: 122, stockQty: 30, lowStockThreshold: 6, barcode: '8901059', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Nescafe Classic Coffee 50g', nameHi: 'नेस्कैफे क्लासिक कॉफी जार (50 ग्राम)', category: 'beverages', unit: 'PIECE', salePrice: 185, costPrice: 160, stockQty: 15, lowStockThreshold: 4, barcode: '8901060', createdAt: Date.now(), updatedAt: Date.now() },

  // साबुन, सर्फ व सफाई
  { nameEn: 'Surf Excel Quick Wash 1kg', nameHi: 'सर्फ एक्सेल क्विक वॉश डिटर्जेंट (1 किग्रा)', category: 'soap_detergent', unit: 'PACKET', salePrice: 145, costPrice: 128, stockQty: 40, lowStockThreshold: 8, barcode: '8901038', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Vim Dishwash Bar 300g', nameHi: 'विम बर्तन धोने का साबुन (300 ग्राम)', category: 'soap_detergent', unit: 'PIECE', salePrice: 25, costPrice: 20, stockQty: 60, lowStockThreshold: 12, barcode: '8901039', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Dettol Original Soap 125g (Pack of 3)', nameHi: 'डेटॉल साबुन (125 ग्राम x 3 पैक)', category: 'soap_detergent', unit: 'PACKET', salePrice: 160, costPrice: 138, stockQty: 20, lowStockThreshold: 5, barcode: '8901040', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Lifebuoy Soap 100g', nameHi: 'लाइफबॉय साबुन (100 ग्राम)', category: 'soap_detergent', unit: 'PIECE', salePrice: 35, costPrice: 29, stockQty: 50, lowStockThreshold: 10, barcode: '8901041', createdAt: Date.now(), updatedAt: Date.now() },

  // नाश्ता व बिस्कुट
  { nameEn: 'Parle-G Biscuit 250g', nameHi: 'पारले-जी बिस्कुट (250 ग्राम)', category: 'snacks_biscuit', unit: 'PACKET', salePrice: 20, costPrice: 15, stockQty: 75, lowStockThreshold: 15, barcode: '8901719', bulkDiscountThreshold: 5, bulkDiscountPercentage: 20, createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Good Day Butter Cookies 120g', nameHi: 'गुड डे बटर कुकीज (120 ग्राम)', category: 'snacks_biscuit', unit: 'PACKET', salePrice: 30, costPrice: 25, stockQty: 40, lowStockThreshold: 8, barcode: '8901720', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Maggi 2-Minute Noodles (Pack of 4)', nameHi: 'मैगी 2-मिनट नूडल्स (4 का पैक)', category: 'snacks_biscuit', unit: 'PACKET', salePrice: 56, costPrice: 48, stockQty: 35, lowStockThreshold: 7, barcode: '8901721', createdAt: Date.now(), updatedAt: Date.now() },
  { nameEn: 'Haldiram Bhujia 400g', nameHi: 'हल्दीराम भुजिया नमकीन (400 ग्राम)', category: 'snacks_biscuit', unit: 'PACKET', salePrice: 110, costPrice: 94, stockQty: 25, lowStockThreshold: 5, barcode: '8901722', createdAt: Date.now(), updatedAt: Date.now() }
];

export const sampleCustomers: Omit<Customer, 'id'>[] = [
  {
    name: 'रमेश कुमार (वर्मा जी)',
    mobile: '9826011223',
    address: 'गली नंबर 3, शक्ति नगर',
    creditLimit: 3000,
    currentBalance: 850, // 850 / 3000 = 28% -> SAFE 🟢
    riskLevel: 'safe',
    notes: 'समय पर भुगतान करते हैं, हर महीने की 5 तारीख को क्लियर करते हैं।',
    createdAt: Date.now() - 60 * 24 * 3600 * 1000,
    updatedAt: Date.now()
  },
  {
    name: 'सोनू शर्मा (पंडित जी)',
    mobile: '9893044556',
    address: 'मकान नं. 45, मंदिर के पीछे',
    creditLimit: 2000,
    currentBalance: 1650, // 1650 / 2000 = 82.5% -> WARNING 🟡
    riskLevel: 'warning',
    notes: 'उधारी बढ़ रही है, नया सामान देने से पहले पिछला जमा करने को कहें।',
    createdAt: Date.now() - 45 * 24 * 3600 * 1000,
    updatedAt: Date.now()
  },
  {
    name: 'विक्रम यादव (ठेकेदार)',
    mobile: '9752099881',
    address: 'यादव मोहल्ला, वार्ड 12',
    creditLimit: 2500,
    currentBalance: 3200, // 3200 / 2500 = 128% -> DANGER 🔴
    riskLevel: 'danger',
    notes: 'उधारी सीमा पार हो चुकी है! चेतावनी जारी है। नया माल नकद में दें।',
    createdAt: Date.now() - 90 * 24 * 3600 * 1000,
    updatedAt: Date.now()
  },
  {
    name: 'सुनील गुप्ता (दुकान वाले)',
    mobile: '9425077112',
    address: 'बाजार चौक, स्टेशन रोड',
    creditLimit: 5000,
    currentBalance: 2100, // 2100 / 5000 = 42% -> SAFE 🟢
    riskLevel: 'safe',
    notes: 'रेगुलर किराना ग्राहक।',
    createdAt: Date.now() - 120 * 24 * 3600 * 1000,
    updatedAt: Date.now()
  },
  {
    name: 'दिनेश कुमार साहू',
    mobile: '9179033445',
    address: 'गांधी चौक',
    creditLimit: 1500,
    currentBalance: 1850, // 1850 / 1500 = 123% -> DANGER 🔴
    riskLevel: 'danger',
    notes: '2 महीने से कोई जमा नहीं आया।',
    createdAt: Date.now() - 75 * 24 * 3600 * 1000,
    updatedAt: Date.now()
  }
];

export const sampleVendors: Omit<Vendor, 'id'>[] = [
  {
    name: 'श्री राम ट्रेडिंग कंपनी',
    firmName: 'श्री राम दाल, चीनी व अनाज सप्लायर',
    mobile: '9826112244',
    address: 'दुकान नं. 12, नई अनाज मंडी, मेघपुर',
    category: 'दाल, चीनी, अनाज',
    currentBalance: 3200, // सप्लायर को देना बाकी है
    totalPurchased: 15400,
    totalPaid: 12200,
    notes: 'चीनी और दाल के मुख्य थोक व्यापारी',
    createdAt: Date.now() - 45 * 24 * 3600 * 1000,
    updatedAt: Date.now()
  },
  {
    name: 'अग्रवाल ऑयल्स डिपो',
    firmName: 'फॉर्च्यून व अमूल डिस्ट्रीब्यूटर',
    mobile: '9893556677',
    address: 'स्टेशन रोड, मेघपुर',
    category: 'तेल व घी',
    currentBalance: 1550, // सप्लायर को देना बाकी है
    totalPurchased: 18500,
    totalPaid: 16950,
    notes: 'फॉर्च्यून सरसों तेल और अमूल घी के अधिकृत डीलर',
    createdAt: Date.now() - 30 * 24 * 3600 * 1000,
    updatedAt: Date.now()
  },
  {
    name: 'गुप्ता किराना एजेंसी',
    firmName: 'गुप्ता ब्रदर्स एफएमसीजी',
    mobile: '9425889900',
    address: 'मेन मार्केट, मेघपुर',
    category: 'मसाले, सर्फ, साबुन, बिस्कुट',
    currentBalance: 0, // पूरा हिसाब चुकता
    totalPurchased: 8200,
    totalPaid: 8200,
    notes: 'महीने के अंत में पूरा हिसाब चुकता हो जाता है',
    createdAt: Date.now() - 20 * 24 * 3600 * 1000,
    updatedAt: Date.now()
  }
];

export async function initializeDatabaseIfEmpty() {
  const itemCount = await db.items.count();
  if (itemCount === 0) {
    await db.items.bulkAdd(sampleItems as any);
  }

  const customerCount = await db.customers.count();
  if (customerCount === 0) {
    const custIds = await db.customers.bulkAdd(sampleCustomers as any, { allKeys: true });
    
    // Seed initial ledger entries for these customers so ledger has realistic history
    const now = Date.now();
    const day = 24 * 3600 * 1000;

    // Ramesh (Balance 850)
    await db.ledger.bulkAdd([
      {
        customerId: custIds[0] as number,
        customerName: 'रमेश कुमार (वर्मा जी)',
        type: 'DEBIT',
        amount: 1500,
        paymentMode: 'BILL',
        invoiceNumber: 'INV-1001',
        description: 'मासिक किराना राशन (आटा, दाल, तेल)',
        runningBalance: 1500,
        syncedToGoogle: false,
        createdAt: now - 20 * day
      },
      {
        customerId: custIds[0] as number,
        customerName: 'रमेश कुमार (वर्मा जी)',
        type: 'CREDIT',
        amount: 650,
        paymentMode: 'UPI',
        description: 'Google Pay से जमा किया',
        runningBalance: 850,
        syncedToGoogle: false,
        createdAt: now - 5 * day
      }
    ]);

    // Sonu Sharma (Balance 1650)
    await db.ledger.bulkAdd([
      {
        customerId: custIds[1] as number,
        customerName: 'सोनू शर्मा (पंडित जी)',
        type: 'DEBIT',
        amount: 2150,
        paymentMode: 'BILL',
        invoiceNumber: 'INV-1002',
        description: 'त्योहार की सामग्री व घी, तेल',
        runningBalance: 2150,
        syncedToGoogle: false,
        createdAt: now - 25 * day
      },
      {
        customerId: custIds[1] as number,
        customerName: 'सोनू शर्मा (पंडित जी)',
        type: 'CREDIT',
        amount: 500,
        paymentMode: 'CASH',
        description: 'दुकान पर नकद जमा किया',
        runningBalance: 1650,
        syncedToGoogle: false,
        createdAt: now - 8 * day
      }
    ]);

    // Vikram Yadav (Balance 3200 - DANGER)
    await db.ledger.bulkAdd([
      {
        customerId: custIds[2] as number,
        customerName: 'विक्रम यादव (ठेकेदार)',
        type: 'DEBIT',
        amount: 2200,
        paymentMode: 'BILL',
        invoiceNumber: 'INV-1003',
        description: 'मजदूरों का राशन',
        runningBalance: 2200,
        syncedToGoogle: false,
        createdAt: now - 35 * day
      },
      {
        customerId: custIds[2] as number,
        customerName: 'विक्रम यादव (ठेकेदार)',
        type: 'DEBIT',
        amount: 1000,
        paymentMode: 'BILL',
        invoiceNumber: 'INV-1004',
        description: 'अतिरिक्त तेल, चीनी, चायपत्ती',
        runningBalance: 3200,
        syncedToGoogle: false,
        createdAt: now - 12 * day
      }
    ]);
  }

  // Vendors & Vendor Ledger
  const vendorCount = await db.vendors.count();
  if (vendorCount === 0) {
    const vendorIds = await db.vendors.bulkAdd(sampleVendors as any, { allKeys: true });
    const now = Date.now();
    const day = 24 * 3600 * 1000;

    // Seed realistic purchase entries (including Sugar purchase e.g. 10 kg total 500, paid 200, due 300)
    await db.vendorLedger.bulkAdd([
      {
        vendorId: vendorIds[0] as number,
        vendorName: 'श्री राम ट्रेडिंग कंपनी',
        type: 'PURCHASE',
        amount: 500,
        paidAmount: 200,
        dueAmount: 300,
        paymentMode: 'CASH',
        itemName: 'चीनी (सफेद दानेदार)',
        itemQuantity: 10,
        itemUnit: 'KG',
        unitCostPrice: 50,
        billNumber: 'SR-104',
        description: 'माल खरीद: चीनी (10 KG @ ₹50/KG) - ₹200 नकद दिया, ₹300 उधार',
        runningBalance: 300,
        createdAt: now - 10 * day
      },
      {
        vendorId: vendorIds[0] as number,
        vendorName: 'श्री राम ट्रेडिंग कंपनी',
        type: 'PURCHASE',
        amount: 3500,
        paidAmount: 600,
        dueAmount: 2900,
        paymentMode: 'UPI',
        itemName: 'अरहर / तूर दाल',
        itemQuantity: 25,
        itemUnit: 'KG',
        unitCostPrice: 140,
        billNumber: 'SR-112',
        description: 'माल खरीद: अरहर दाल (25 KG @ ₹140/KG)',
        runningBalance: 3200,
        createdAt: now - 3 * day
      },
      {
        vendorId: vendorIds[1] as number,
        vendorName: 'अग्रवाल ऑयल्स डिपो',
        type: 'PURCHASE',
        amount: 3100,
        paidAmount: 1550,
        dueAmount: 1550,
        paymentMode: 'UPI',
        itemName: 'फॉर्च्यून सरसों तेल (1L)',
        itemQuantity: 20,
        itemUnit: 'PACKET',
        unitCostPrice: 155,
        billNumber: 'AG-902',
        description: 'माल खरीद: 20 पैकेट फॉर्च्यून सरसों तेल (आधा भुगतान किया)',
        runningBalance: 1550,
        createdAt: now - 5 * day
      }
    ]);
  }

  // Settings
  const settingsRecord = await db.settings.get('shop_settings');
  if (!settingsRecord) {
    await db.settings.put({ key: 'shop_settings', value: initialSettings });
  } else {
    const current = settingsRecord.value;
    if (
      !current.upiId ||
      current.upiId === 'shreebhog@upi' ||
      current.shopName === 'श्री भोग किराना एवं जनरल स्टोर' ||
      !current.qrCodeImageUrl
    ) {
      await db.settings.put({
        key: 'shop_settings',
        value: {
          ...current,
          shopName: current.shopName === 'श्री भोग किराना एवं जनरल स्टोर' ? 'JYOTI GENERAL STORE' : current.shopName,
          shopNameHi: current.shopNameHi === 'श्री भोग किराना एवं जनरल स्टोर' ? 'ज्योति जनरल स्टोर' : current.shopNameHi,
          mobile: current.mobile === '9876543210' ? '9931300369' : current.mobile,
          upiId: '9931300369@okbizaxis',
          qrCodeImageUrl: '/jyoti-qr-standee.jpg'
        }
      });
    }
  }
}
