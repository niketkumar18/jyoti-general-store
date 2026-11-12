# DEN - किराना POS एवं डिजिटल खाता (Kirana POS & Khata)

> **Bilingual (हिंदी / English) • Offline-First • 100% ₹0 Cost Forever • Mobile & Desktop PWA**

[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Dexie](https://img.shields.io/badge/IndexedDB-Dexie.js-007ACC)](https://dexie.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Overview (सिस्टम का परिचय)

**DEN** is an ultra-fast, offline-first billing, inventory, customer ledger (Khata), and debt risk management application built specifically for Indian Kirana (grocery) and general stores. It is designed to work seamlessly on mobile phones, tablets, and desktop computers with **₹0 server, hosting, or database cost forever**.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                   Bilingual UI: Hindi (हिंदी) + English                         │
│   [कैटलॉग / इन्वेंटरी]   [नया बिल बनाएं (POS)]   [खाता / उधारी]   [वार्षिक रिपोर्ट]  │
└────────────────────────────────────────────────────────────────────────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
   1. Fast Billing & POS      2. Customer Khata Ledger       3. Analytics & Reports
   • Barcode / Instant Search • Date-wise Debit/Credit       • Monthly Debt Breakdown
   • 1-Click WhatsApp Bill    • 🟢🟡🔴 Credit Risk Badges     • Year-to-Date Recovery
   • Client-side PDF Print    • Warning Popup on Limit       • Downloadable CSV / Excel
           │                            │                            │
           └────────────────────────────┼────────────────────────────┘
                                        │
                         Database & Sync (100% ₹0 Cost)
          ┌─────────────────────────────────────────────────────────┐
          │  Primary: Real-time Google Sheets API / Apps Script     │
          │  Fallback: Offline-First IndexedDB (Instant on Mobile)  │
          └─────────────────────────────────────────────────────────┘
                                        │
                       Deployment (100% ₹0 Cost Forever)
          ┌─────────────────────────────────────────────────────────┐
          │  Web / PWA: Vercel Free Tier (Global Edge CDN)          │
          │  Android: Installable PWA (Full screen, zero store fee) │
          │  Play Store: TWA (Ready whenever $25 Google fee paid)   │
          └─────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features (मुख्य विशेषताएं)

### 1. Bilingual UI: Hindi (हिंदी) + English
- 1-Click toggle between **हिंदी** and **English** across all tabs, buttons, alerts, and invoices.
- Pre-loaded with Hindi grocery nomenclature (उदा. "अरहर दाल", "सरसों तेल", "देगी मिर्च", "पोहा", "बेसन").

### 2. Fast POS Billing & Customer Search
- **Instant Product Search**: By Hindi name, English name, category, or barcode.
- **Fractional Weight Support**: One-tap addition for `250g`, `500g`, `1kg`, `2kg`, `5kg` (calculates proportional price instantly).
- **Payment Modes**:
  - 💵 **Cash (नकद)**: With change calculator (वापसी छुट्टे रुपये).
  - 📱 **UPI QR (ऑनलाइन)**: Dynamically generates live on-screen UPI QR code with shop's VPA for instant GPay, PhonePe, and Paytm scanning.
  - 📒 **Udhar / Credit (उधार)**: Directly logs to customer's ledger with automated risk verification.
  - 🔀 **Split Pay (आधा नकद / आधा उधार)**: Custom down payment with remaining amount added to Khata.
- **Micro-Interactions**: Web Audio beep on scan, chime on bill completion, and confetti celebration.

### 3. Credit Limit Risk System (उधारी जोखिम नियंत्रण)
- Color-coded badges for all customers:
  - 🟢 **Green (सुरक्षित)**: Balance ₹0 to 50% of limit
  - 🟡 **Yellow (ध्यान दें)**: Balance between 50% and 100% of limit
  - 🔴 **Red (जोखिम / High Risk)**: Balance exceeded credit limit!
- **Over-Limit Warning Modal**: When attempting to extend credit to a customer in the Red zone, an interactive warning pops up:
  > *"⚠️ इस ग्राहक की उधारी सीमा (₹2,000) पार हो चुकी है! कुल बकाया: ₹2,450. क्या आप फिर भी उधार देना चाहते हैं?"*

### 4. 1-Click WhatsApp Invoicing & Receipts
- **1-Click WhatsApp Button**: Opens WhatsApp directly with customer's formatted bill:
  ```text
  *नमस्ते रमेश कुमार जी! 🙏*
  *श्री भोग किराना स्टोर से आपका बिल:*

  🧾 *बिल संख्या:* #DEN-1005
  📅 *तारीख:* 13 नवं 2026, 05:30 PM

  🛒 *सामान का विवरण:*
  1. अरहर / तूर दाल (1 KG) - ₹160
  2. फॉर्च्यून सरसों तेल (1 PACKET) - ₹155
  3. आशीर्वाद चक्की आटा (1 PACKET) - ₹420

  --------------------------------
  💰 *कुल राशि:* ₹735
  ✅ *आज जमा:* ₹235
  ⚠️ *इस बिल का उधार:* ₹500
  📌 *खाते में कुल शेष बकाया:* ₹1,350
  --------------------------------
  💳 *ऑनलाइन भुगतान हेतु UPI ID:* `shreebhog@upi`
  📞 *संपर्क:* 9876543210
  🙏 *धन्यवाद! फिर पधारें।*
  ```
- **1-Click WhatsApp Payment Reminder**: Friendly Udhar reminder with outstanding balance and shop UPI ID.
- **Client-Side PDF Generator (`jspdf`)**:
  - 80mm and 58mm thermal receipt layouts
  - Browser direct print (`window.print()`)
  - Zero server load or PDF storage cost.

### 5. Customer Khata Ledger (उधार - जमा हिसाब)
- Chronological transaction ledger for each customer:
  - Date & Time
  - Bill Ref / Items taken / Description
  - Debit (सामान लिया / Udhar)
  - Credit (रुपये जमा किये / Jama)
  - Running Outstanding Balance (शेष बकाया)
- **"जमा करें (Receive Payment)"** quick modal to log cash / UPI payments and clear debt.

### 6. Catalog & Quick 10-Second Inventory
- Fast item creation with minimal required fields (Name Hi/En, Category, Unit, Sale Price, Stock).
- Preloaded with 30+ popular Kirana items across 10 categories.
- Low-stock threshold alerts (कम स्टॉक चेतावनी).
- 1-Click quick stock adjustments (+ / - stock).

### 7. Monthly & Annual Debt Reports (वार्षिक उधारी रिपोर्ट)
- **Yearly Selector** (e.g. 2024, 2025, 2026, 2027) with 12-month breakdown:
  - कुल बिक्री (Total Sales)
  - कुल नकद वसूली (Cash Collected)
  - नया उधार दिया (New Credit Given)
  - उधार जमा हुआ (Old Debt Recovered)
  - शुद्ध बकाया (Net Outstanding at Month End)
- **Top Debtors Ranking**: Highlights highest outstanding customers.
- **1-Click CSV / Excel Export**: Complete audit reports downloadable for accounting.

### 8. Database Strategy (100% ₹0 Cost Forever)
- **Primary / Offline-First**: Client-side IndexedDB powered by `Dexie.js`. Loads in 100ms, works without internet, and never loses data.
- **Google Sheets Real-time Cloud Sync**: Connects to a private Google Sheet via a 100% free Google Apps Script Webhook. Invoices and ledger entries automatically sync to separate tabs ("Invoices", "Ledger").
- **JSON Backup & Restore**: 1-click full database export and import.

### 9. Android App & Play Store Strategy
- **Instant Installable PWA (₹0 Free)**:
  - Open in mobile Chrome/Safari and tap "Add to Home Screen" or the in-app banner.
  - Launches in standalone full screen (no browser address bar).
  - Uses device camera for live barcode scanning.
- **Play Store Ready (TWA)**:
  - Can be packaged into an `.apk` or `.aab` using `PWABuilder` or `Bubblewrap` whenever the shopkeeper chooses to register their Google Play account ($25 one-time developer fee).

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite 6
- **Styling**: Tailwind CSS v4
- **Database**: IndexedDB via Dexie.js (Offline-First)
- **PDF Generation**: jsPDF
- **QR Code**: qrcode.react
- **Barcode Scanning**: html5-qrcode
- **Icons**: Lucide React
- **PWA**: vite-plugin-pwa (Service Worker + Web App Manifest)

---

## 💻 Getting Started (लोकल रन करें)

### Prerequisites
- Node.js (v18+) and npm

### Installation & Run

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build production bundle with PWA service worker
npm run build

# 4. Preview production build locally
npm run preview
```

---

## ☁️ Google Sheets Sync Setup (2-Minute Guide)

1. Open [sheets.new](https://sheets.new) in your Google account.
2. In Google Sheets, go to **Extensions** > **Apps Script**.
3. Copy the script provided in `DEN Settings` > **"Google Sheets 2-मिनट सेटअप"** and paste it into the editor.
4. Click **Deploy** > **New deployment**.
5. Choose type: **Web app**, Execute as: **Me**, Who has access: **Anyone**.
6. Copy the generated Web App URL and paste it into **DEN Settings** > **Google Sheets URL**.
7. Click **"अभी सिंक करें"** — your invoices and khata will sync directly to your private Google Sheet!

---

## 📄 License

MIT License. Designed and built with ❤️ for Indian Kirana Store Owners.
