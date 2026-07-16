
# WarungAI 🍛

**AI-assisted bookkeeping for Malaysian warung owners and hawkers**

WarungAI is a mobile-first web application that converts typed, spoken, and scanned sales information into confirmed bookkeeping records.

The application helps Malaysian micro-business owners understand daily sales, expenses, profit, payment breakdowns, and product performance without requiring complicated accounting software.

> **Core journey:** Record a sale → review the extracted information → save a trusted transaction → understand today’s business performance.

## Live Application

- **Live Demo:** https://warung-ai-sepia.vercel.app/
- **GitHub Repository:** https://github.com/clemedev/WarungAI

---

## The Problem

Many Malaysian warung owners, hawkers, and small food-stall operators still record transactions using notebooks, WhatsApp messages, calculators, or memory.

This makes it difficult to answer simple but important questions:

- How much did the business earn today?
- What was the cost of the products sold?
- How much was spent on ingredients, gas, packaging, or utilities?
- What is today’s actual profit?
- Which menu item sells best?
- Is a product being sold below cost?
- How much revenue came from cash versus QR payments?

Existing bookkeeping tools may be too complicated, expensive, or designed primarily for larger businesses.

WarungAI provides a simpler, Bahasa Malaysia-friendly workflow designed around the daily activities of a small food business.

---

## Main Features

### Secure user accounts

- Email registration and login using Supabase Authentication
- Email confirmation for new accounts
- Persistent sessions after browser refresh
- Shop or vendor name saved with the user account
- Secure logout
- User-owned records protected using PostgreSQL Row Level Security
- Data isolation tested using multiple Supabase accounts

### Product management

Users can:

- Add menu products
- Set selling prices
- Set cost prices
- Record current stock
- Configure a low-stock warning level
- Edit product information
- Archive products without deleting historical records
- View the expected margin for each product

### Typed sales entry

Users can enter natural-language sales such as:

```text
Jual 3 nasi lemak RM12
```

WarungAI extracts:

- Product
- Quantity
- Total amount
- Input source

The extracted result is shown in a confirmation form before anything is saved.

### Voice sales entry

Users can record sales using the browser microphone.

Example:

```text
Jual dua teh tarik enam ringgit
```

Voice input uses the same workflow as typed input:

```text
Voice transcript
→ Natural-language parser
→ Product matching
→ User confirmation
→ Supabase transaction
```

### Receipt OCR

Users can upload or photograph a printed receipt.

WarungAI uses Tesseract.js to:

1. Read text from the image
2. Detect potential receipt items
3. Extract product names, quantities, and amounts
4. Ignore totals, payment lines, and common receipt noise
5. Match extracted names against the user’s product list
6. Display editable rows for review
7. Save only the rows confirmed by the user

The parser supports examples such as:

```text
2 x Nasi Lemak 8.00
Nasi Lemak x2 8.00
Nasi Lemak 2 8.00
Nasi Lemak 8.00
```

WarungAI also handles common OCR confusion between:

```text
1
I
l
il
```

### Confirmation before saving

Typed, spoken, and scanned sales are never saved automatically.

Users can review and correct:

- Product
- Quantity
- Total amount
- Payment method
- Included or excluded receipt rows

This prevents an incorrect OCR or parsing result from silently becoming a financial record.

### Expense tracking

Users can record daily operating expenses such as:

- Ingredients
- Gas
- Packaging
- Rent and utilities
- Other costs

Each expense can include:

- Category
- Amount
- Date
- Optional note
- Input source

Expenses are stored in Supabase and isolated by user account.

### Sales history

Users can view confirmed transactions from:

- Typed input
- Voice input
- Receipt OCR
- Manual entry

Each sales record displays:

- Product name
- Quantity
- Revenue
- Cost
- Gross profit
- Payment method
- Input source
- Transaction date

### Business dashboard

The dashboard provides:

- Today’s total sales
- Today’s net profit
- Cash-versus-QR payment split
- Daily sales target
- Target progress
- Seven-day sales chart
- Top-selling products
- Bahasa Malaysia daily summary
- Explainable warnings and recommendations
- WhatsApp summary sharing

### Explainable insights

WarungAI can provide simple recommendations such as:

```text
⚠️ Nasi Lemak dijual bawah kos.
```

or:

```text
🔥 Nasi Lemak paling laris minggu ini. Pastikan stok mencukupi.
```

Financial calculations are deterministic and based on stored transaction records. WarungAI does not ask a generative model to calculate official financial totals.

---

## Technology Stack

### Frontend

- React 18
- Vite 5
- JavaScript
- CSS Modules
- Chart.js
- `react-chartjs-2`

### Input processing

- Tesseract.js for in-browser OCR
- Web Speech API for voice recognition
- Deterministic natural-language parsing
- Levenshtein-based fuzzy product matching
- Rule-based Bahasa Malaysia summaries and recommendations

### Backend services

- Supabase Authentication
- Supabase PostgreSQL
- Supabase Row Level Security
- Supabase Remote Procedure Calls
- PostgreSQL atomic transaction logic

### Deployment

- Vercel
- GitHub source control
- Automatic Vercel deployments from GitHub

---

## Application Architecture

```text
React + Vite application
        │
        ├── Supabase Authentication
        │       ├── Email registration
        │       ├── Email confirmation
        │       ├── Login and logout
        │       └── Persistent sessions
        │
        ├── Supabase PostgreSQL
        │       ├── products
        │       ├── expenses
        │       ├── sales
        │       └── sale_items
        │
        ├── Row Level Security
        │       └── Users access only their own business records
        │
        ├── Browser capabilities
        │       ├── Tesseract.js OCR
        │       ├── Web Speech API
        │       └── Chart.js
        │
        └── Vercel
                └── Production deployment
```

---

## Database Design

### `products`

Stores products belonging to each authenticated user.

```text
id
user_id
name
selling_price
cost_price
current_stock
low_stock_threshold
is_active
created_at
updated_at
```

Products are archived using:

```text
is_active = false
```

This avoids permanently deleting products that may be referenced by historical transactions.

### `expenses`

Stores operating expenses belonging to each authenticated user.

```text
id
user_id
category
amount
note
expense_date
source
created_at
updated_at
```

### `sales`

Stores the parent record for each confirmed sale.

```text
id
user_id
sale_date
payment_method
source
total_revenue
total_cost
gross_profit
created_at
```

### `sale_items`

Stores historical product information for each sale.

```text
id
sale_id
product_id
product_name_snapshot
quantity
unit_price
unit_cost
line_total
created_at
```

The snapshot fields ensure that historical transactions remain accurate even when a product is edited or archived later.

For example, changing the current cost of Nasi Lemak does not change the cost stored in an earlier sale.

---

## Secure Sale Creation

WarungAI uses a PostgreSQL function:

```text
create_single_item_sale(...)
```

The function performs the following operations atomically:

1. Confirms that a user is authenticated
2. Verifies that the selected product belongs to that user
3. Confirms that the product is active
4. Reads the official selling price and cost price
5. Calculates the total product cost
6. Calculates gross profit
7. Creates the parent `sales` record
8. Creates the related `sale_items` snapshot
9. Returns the new sale ID

This prevents partially saved transactions and ensures that the browser cannot submit a trusted product cost directly.

---

## Security Model

WarungAI uses only browser-safe Supabase configuration values:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

The frontend does not contain:

```text
Supabase secret key
Supabase service-role key
Database password
Database connection string
OpenAI API key
Claude API key
Private server token
```

Anything using the `VITE_` prefix is visible in the browser bundle. Therefore, only the Supabase project URL and publishable key are used.

The publishable key does not provide unrestricted database access. Security is enforced through:

- Supabase Authentication
- User JSON Web Tokens
- PostgreSQL Row Level Security
- Per-table ownership policies
- `auth.uid()` checks
- User-owned foreign keys

Products, expenses, sales, and sale items were tested using multiple accounts to confirm that one user cannot retrieve another user’s records.

---

## Responsible AI and Data Handling

WarungAI follows these principles:

- Extracted information is treated as a draft
- Users review information before saving
- Unmatched OCR items are not automatically posted
- Failed product matches require manual selection
- Financial calculations use deterministic code
- Product cost and price snapshots preserve historical accuracy
- Data ownership is enforced in the database
- No privileged backend key is exposed in the browser
- Manual entry remains available when OCR or voice recognition fails

---

## Local Development

### Prerequisites

Install:

- Node.js 18 or newer
- npm
- Git

You will also need a Supabase project with the required tables, policies, and database function.

### Clone the repository

```bash
git clone https://github.com/clemedev/WarungAI.git
cd WarungAI
```

### Install dependencies

```bash
npm install
```

### Create environment variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Do not commit `.env.local`.

Confirm that Git ignores the file:

```bash
git check-ignore -v .env.local
```

### Start the development server

```bash
npm run dev
```

Open the URL shown by Vite, normally:

```text
http://localhost:5173
```

---

## Available Commands

Start development mode:

```bash
npm run dev
```

Run the automated tests:

```bash
npm test
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

## Automated Tests

The current automated test suite contains:

```text
16 parser tests
11 storage and insight tests
27 total passing tests
```

Run all tests:

```bash
npm test
```

### Parser test coverage

The parser tests cover:

- Printed receipt item extraction
- Bahasa Malaysia total labels
- Leading quantities
- Trailing quantities
- `product + quantity + total` receipt layouts
- OCR confusion between `1`, `I`, and `l`
- Comma decimal values
- Receipts without an explicit total
- Blurry or invalid OCR output
- Empty and non-string input
- English sales phrases
- Bahasa Malaysia sales phrases
- Bahasa Malaysia number words
- Misspelled product names
- Unknown products
- Empty product lists
- Exact and partial fuzzy matches

### Storage and insight test coverage

The logic tests cover:

- Vendor-scoped local compatibility storage
- Product persistence and updates
- Daily-target settings
- Profit calculations
- Empty-day values
- Seven-day dashboard data
- Bahasa Malaysia summaries
- Cash-versus-QR payment splits
- Below-cost warnings
- Best-selling product insights
- Empty-data behavior

The core Supabase workflows were also manually tested using multiple authenticated accounts:

- Registration and login
- Session persistence
- Product creation, editing, and archiving
- Expense creation and deletion
- Typed sales
- Voice sales
- Receipt OCR sales
- Sales history
- Cascade sale-item deletion
- Dashboard calculations
- Row Level Security isolation

---

## Vercel Deployment

The production application is available at:

https://warung-ai-sepia.vercel.app/

Recommended Vercel configuration:

```text
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
```

Add these variables to the Vercel **Production** and **Preview** environments:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Do not add privileged Supabase keys using the `VITE_` prefix.

After changing an environment variable, create a new deployment.

### Supabase authentication URLs

Configure Supabase Authentication with:

```text
Site URL:
https://warung-ai-sepia.vercel.app/
```

Add these Redirect URLs:

```text
https://warung-ai-sepia.vercel.app/**
http://localhost:5173/**
```

---

## Demo Workflow

A recommended live demonstration:

1. Register or log in as a warung owner
2. Show the shop name and secure session
3. Add products with selling prices and cost prices
4. Type:

   ```text
   Jual 3 nasi lemak RM12
   ```
5. Review the parsed sale
6. Confirm the product, quantity, amount, and payment method
7. Save the transaction
8. Upload a clear printed receipt
9. Review the OCR result
10. Match the extracted row to an existing product
11. Save the confirmed receipt transaction
12. Add an operating expense
13. Open the dashboard
14. Show revenue, profit, payment split, seven-day trend, and top item
15. Share the Bahasa Malaysia summary through WhatsApp

### Example calculation

```text
Nasi Lemak selling price: RM4.00
Nasi Lemak unit cost:     RM2.50
Quantity sold:            3

Revenue:                  RM12.00
Product cost:             RM7.50
Gross profit:             RM4.50
Packaging expense:        RM1.50
Net profit:               RM3.00
```

---

## Project Structure

```text
WarungAI/
├── public/
├── scripts/
│   ├── test-insights.mjs
│   └── test-parsers.mjs
├── src/
│   ├── components/
│   │   ├── ChatEntry/
│   │   ├── ConfirmSale/
│   │   ├── Dashboard/
│   │   ├── ExpenseTracker/
│   │   ├── LoginScreen/
│   │   ├── ProductList/
│   │   ├── ReceiptScanner/
│   │   ├── SalesList/
│   │   └── VoiceEntry/
│   ├── lib/
│   │   ├── auth.js
│   │   ├── dates.js
│   │   ├── insights.js
│   │   ├── nlEntryParser.js
│   │   ├── ocrParser.js
│   │   ├── storage.js
│   │   ├── supabase.js
│   │   ├── supabaseAuth.js
│   │   ├── supabaseDashboard.js
│   │   ├── supabaseExpenses.js
│   │   ├── supabaseProducts.js
│   │   ├── supabaseSales.js
│   │   └── types.js
│   ├── App.jsx
│   ├── App.module.css
│   ├── index.css
│   └── main.jsx
├── .env.example
├── .gitignore
├── BACKEND.md
├── index.html
├── package.json
├── README.md
└── vite.config.js
```

---

## Current Limitations

- OCR works best with clear and well-lit printed receipts
- Handwritten or badly blurred receipts may require manual entry
- OCR items must be matched to products already created in the user’s menu
- Unmatched OCR rows are not automatically saved
- Natural-language parsing currently focuses on one product per confirmation
- Voice recognition depends on browser Web Speech API support
- Microphone permission must be granted by the user
- Receipt images are processed in the browser and are not retained in cloud storage
- Daily target settings currently use lightweight browser storage
- Archived products currently require direct database editing to restore
- Generative-AI explanations are not part of the current production workflow
- The application bundle can be further optimized through code splitting

---

## Roadmap

### Near-term improvements

- Multi-item typed sales
- Multi-item spoken sales
- Restore archived products through the interface
- Cloud-synchronized daily targets
- Automatic stock deduction after confirmed sales
- Low-stock alerts
- OCR confidence indicators
- Receipt-image preprocessing
- Private receipt storage
- Dashboard date filters
- Improved loading and offline states
- Additional Supabase integration tests

### Post-hackathon

- Monthly sales reports
- Invoice generation
- Tax-document preparation assistance
- Staff access and business teams
- Multiple users under one business
- Advanced inventory forecasting
- Secure server-side AI explanations
- Offline synchronization
- Native mobile packaging

---

## Hackathon Context

WarungAI was developed for the **Codex Community Hackathon Kuala Lumpur 2026** under the theme:

> **Raising the Floor: AI for Malaysia Boleh**

The project focuses on practical AI-enabled tools that improve productivity and financial clarity for Malaysian micro, small, and medium enterprises.

---


## License

No license, all inspiration, product, or solution is owned by (c) clemedev. More information, please contact me via LinkedIn.

---

Built for Malaysian warung owners and hawkers. 🇲🇾
