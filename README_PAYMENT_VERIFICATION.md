# 🚀 Automated Payment Verification & Telegram Marketing System

An end-to-end Automated Payment Verification system integrated with Google Gemini 1.5 Flash Vision OCR, a Telegram Bot, P2P Email Webhooks, NOWPayments Crypto IPN verification, and Telegram Broadcast Marketing Controls.

---

## 🛠️ 1. Architecture & Tech Stack

- **Framework**: Next.js / Node.js (TypeScript)
- **Database**: PostgreSQL / Supabase (`payment_orders`, `payment_screenshots`, `telegram_broadcast_subscribers`)
- **AI OCR**: Google Gemini 1.5 Flash Vision API (`gemini-1.5-flash`)
- **Messaging**: Telegram Bot API with inline admin review controls
- **Webhooks**: 
  - P2P Email Payment Webhook (`POST /api/webhooks/email-payment`)
  - NOWPayments Crypto IPN HMAC-SHA512 Webhook (`POST /api/webhooks/nowpayments`)
  - Telegram Broadcast Marketing API (`POST /api/admin/telegram-broadcast`)

---

## ⚙️ 2. Environment Variables (.env.local)

Copy the configuration template from `.env.example` into your `.env.local`:

```env
TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyZ"
TELEGRAM_ADMIN_CHAT_ID="987654321"
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
NOWPAYMENTS_IPN_SECRET="your_nowpayments_ipn_secret_here"
EMAIL_WEBHOOK_SECRET="your_email_webhook_secret_key"
```

---

## 📡 3. API Endpoints

### 📸 Feature A: Telegram Bot Payment Screenshot OCR
* When a user sends a payment screenshot on Telegram:
  1. The bot downloads the image buffer.
  2. Sends the base64 image to **Gemini 1.5 Flash Vision API** with prompt:
     `Extract details: Platform, Amount, Sender, Memo, Status, Date`.
  3. Searches `payment_orders` for a matching pending order.
  4. **Auto-verifies & activates** matching orders (`✅ Payment Verified! Order #XYZ Activated.`).
  5. Mismatched screenshots are set to `PENDING_ADMIN_REVIEW` and forwarded to `TELEGRAM_ADMIN_CHAT_ID` with inline **`[Approve]`** / **`[Reject]`** buttons.

### 📧 Feature B: Email Payment Webhook Parser
* **Endpoint**: `POST /api/webhooks/email-payment`
* **Headers**: `x-webhook-secret: your_email_webhook_secret_key`
* **Payload**:
```json
{
  "platform": "CashApp",
  "amount": 25.00,
  "sender": "$johnny",
  "note": "Order #SPIN-1001",
  "transactionId": "TX-998811"
}
```

### 🪙 Feature C: NOWPayments Crypto Automated Callback
* **Endpoint**: `POST /api/webhooks/nowpayments`
* **Headers**: `x-nowpayments-sig: <HMAC_SHA512_HEX_SIGNATURE>`
* Validates HMAC-SHA512 signature over alphabetically sorted payload keys using `NOWPAYMENTS_IPN_SECRET`.
* Marks order as `PAID` upon status `finished` or `confirmed`.

### 📢 Feature D: Telegram Marketing & Broadcast Control
* **Endpoint**: `POST /api/admin/telegram-broadcast`
* **Payload**:
```json
{
  "message": "🔥 <b>Weekend Special Promo!</b> Get 50% Bonus Coins today!",
  "campaignType": "Promotional Drip"
}
```

---

## 🧪 4. Testing Local System Setup

Run the verification test script:

```bash
node scripts/test_payment_verification_system.mjs
```
