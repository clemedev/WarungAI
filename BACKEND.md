
# WarungAI Backend Architecture

This document describes WarungAI’s current backend architecture, database design, authentication, security policies, service modules, transaction processing, and deployment configuration.

## Technology Stack

### Frontend

- React 18
- Vite 5
- JavaScript
- CSS Modules
- Chart.js

### Backend Services

- Supabase Authentication
- Supabase PostgreSQL
- Supabase Row Level Security
- Supabase PostgreSQL RPC
- Supabase JavaScript client

### Browser Processing

- Tesseract.js for receipt OCR
- Web Speech API for voice recognition
- Natural-language parsing
- Fuzzy product matching
- Deterministic financial calculations

### Deployment

- Vercel
- GitHub

---

## System Architecture

```text
React + Vite application
        │
        ├── Supabase Authentication
        │       ├── Email registration
        │       ├── Email confirmation
        │       ├── Email and password login
        │       ├── Logout
        │       └── Persistent sessions
        │
        ├── Supabase PostgreSQL
        │       ├── products
        │       ├── expenses
        │       ├── sales
        │       └── sale_items
        │
        ├── Row Level Security
        │       └── User ownership enforced with auth.uid()
        │
        ├── PostgreSQL RPC
        │       └── create_single_item_sale(...)
        │
        ├── Browser processing
        │       ├── Tesseract.js OCR
        │       ├── Web Speech API
        │       ├── Natural-language parser
        │       └── Fuzzy product matching
        │
        └── Vercel
                └── Production deployment
```

Supabase is the persistent source of truth for authentication and business records.

---

## Environment Variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

The Vite frontend may contain only browser-safe configuration.

Never add the following values to a variable beginning with `VITE_`:

```text
Supabase secret key
Supabase service-role key
Database password
Database connection string
Private server token
OpenAI API key
Anthropic API key
Private signing key
```

All `VITE_` values are included in the browser bundle and can be inspected by users.

The Supabase publishable key identifies the application. It does not provide unrestricted database access. Database security is enforced through Supabase Authentication and PostgreSQL Row Level Security.

---

## Supabase Client

File:

```text
src/lib/supabase.js
```

Responsibilities:

- Initialize the Supabase JavaScript client
- Read Vite environment variables
- Persist authentication sessions
- Automatically refresh authentication tokens
- Detect authentication information in callback URLs

The Supabase client is shared by all authentication and database service modules.

---

## Authentication

Files:

```text
src/lib/supabaseAuth.js
src/components/LoginScreen/LoginScreen.jsx
src/App.jsx
```

Supported authentication features:

- Email registration
- Email confirmation
- Email and password login
- Persistent login sessions
- Authentication-state subscriptions
- Logout
- Shop or vendor display name

### Authentication contracts

```js
await signUp(
  email,
  password,
  displayName,
);

await signIn(
  email,
  password,
);

await signOut();

await getCurrentUser();

const unsubscribe =
  onAuthStateChange((user) => {
    // Respond to login, logout,
    // or session restoration.
  });
```

### Display name

The shop or vendor name is stored in Supabase user metadata:

```js
user.user_metadata.display_name
```

The application uses this display order:

```text
display_name
→ email address
→ generic WarungAI user label
```

### Session flow

```text
Application starts
        ↓
Supabase checks the existing session
        ↓
Authenticated user restored
        ↓
Authentication state listener starts
        ↓
Application displays user-owned data
```

Signed-out users cannot access protected application data.

---

## Database Tables

WarungAI currently uses four primary business tables:

```text
products
expenses
sales
sale_items
```

Every user-owned table is protected by Row Level Security.

---

## Products

Table:

```text
public.products
```

Purpose:

- Store menu items belonging to authenticated users
- Store selling prices and cost prices
- Track current stock
- Track low-stock warning levels
- Support product archiving

### Columns

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

### Important constraints

```text
selling_price >= 0
cost_price >= 0
current_stock >= 0
low_stock_threshold >= 0
```

### Product archiving

Products are archived rather than permanently deleted:

```sql
update public.products
set
  is_active = false,
  updated_at = now()
where id = product_id;
```

Archived products:

- Remain in the database
- Do not appear in new-sale product selection
- Preserve historical references
- Can be restored by changing `is_active` to `true`

### Product service

File:

```text
src/lib/supabaseProducts.js
```

Exports:

```js
await getProducts();

await saveProduct(product);

await archiveProduct(productId);
```

### Frontend mapping

```text
selling_price
→ sellPrice

cost_price
→ costPrice

current_stock
→ currentStock

low_stock_threshold
→ lowStockThreshold

is_active
→ isActive

created_at
→ createdAt

updated_at
→ updatedAt
```

---

## Expenses

Table:

```text
public.expenses
```

Purpose:

- Store operating expenses
- Support daily net-profit calculation
- Keep expenses isolated by authenticated user

### Columns

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

### Supported categories

```text
bahan
gas
pembungkusan
sewa
lain
```

### Supported sources

```text
manual
receipt
```

### Important constraint

```text
amount > 0
```

### Expense service

File:

```text
src/lib/supabaseExpenses.js
```

Exports:

```js
await getExpenses();

await saveExpense(expense);

await deleteExpense(expenseId);
```

### Frontend expense shape

```js
{
  id,
  date,
  category,
  amount,
  note,
  source,
  createdAt,
  updatedAt
}
```

---

## Sales

Table:

```text
public.sales
```

Purpose:

- Store parent records for confirmed sales
- Store calculated transaction totals
- Associate sales with authenticated users
- Support sales history and dashboard reporting

### Columns

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

### Supported payment methods

```text
cash
qr
```

### Supported sources

```text
manual
chat
voice
ocr
receipt
```

### Financial relationship

```text
gross_profit
=
total_revenue
-
total_cost
```

Operating expenses are not included in the stored sale-level gross profit.

Dashboard net profit is calculated using:

```text
net_profit
=
sum of sale gross profit
-
sum of operating expenses
```

---

## Sale Items

Table:

```text
public.sale_items
```

Purpose:

- Store product-level information for each sale
- Preserve historical product details
- Prevent later product edits from changing earlier financial records

### Columns

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

### Important constraints

```text
quantity > 0
unit_price >= 0
unit_cost >= 0
line_total >= 0
```

### Historical snapshots

Each sale item stores:

```text
product_name_snapshot
unit_price
unit_cost
line_total
```

For example:

```text
Product: Nasi Lemak
Quantity: 3
Unit price: RM4.00
Unit cost: RM2.50
Line total: RM12.00
```

If Nasi Lemak’s current cost later changes, the previous sale continues using the saved RM2.50 cost.

### Foreign-key behavior

```text
sale_id
→ references sales.id
→ on delete cascade
```

Deleting a sale automatically deletes its associated sale items.

```text
product_id
→ references products.id
→ on delete set null
```

Historical sales remain readable through `product_name_snapshot`.

---

## Row Level Security

RLS is enabled on all business tables:

```sql
alter table public.products
enable row level security;

alter table public.expenses
enable row level security;

alter table public.sales
enable row level security;

alter table public.sale_items
enable row level security;
```

The browser uses the Supabase publishable key and the authenticated user’s JWT.

PostgreSQL policies determine whether each operation is allowed.

---

## Product Policies

Users can read only their own products:

```sql
user_id = auth.uid()
```

Users can create products only when the row belongs to the authenticated user:

```sql
with check (
  user_id = auth.uid()
)
```

Product updates require ownership before and after the update:

```sql
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
)
```

Private product data does not have anonymous access.

---

## Expense Policies

Users can:

- Read their own expenses
- Create their own expenses
- Update their own expenses
- Delete their own expenses

Every expense policy uses:

```sql
user_id = auth.uid()
```

An authenticated user cannot retrieve or modify another user’s expense rows.

---

## Sales Policies

Users can:

- Read their own sales
- Create their own sales
- Delete their own sales

Every sales policy uses:

```sql
user_id = auth.uid()
```

---

## Sale-Item Policies

The `sale_items` table does not contain a direct `user_id`.

Ownership is inherited from the parent sale:

```sql
exists (
  select 1
  from public.sales
  where sales.id = sale_items.sale_id
    and sales.user_id = auth.uid()
)
```

This condition protects:

- Sale-item reads
- Sale-item inserts
- Sale-item deletes

A user can access a sale item only when the parent sale belongs to that user.

---

## Atomic Sale Creation

PostgreSQL function:

```text
public.create_single_item_sale(...)
```

### Inputs

```text
p_product_id
p_quantity
p_total_revenue
p_payment_method
p_source
p_sale_date
```

### Return value

```text
Created sale UUID
```

### Transaction flow

The function:

1. Reads the authenticated user through `auth.uid()`
2. Rejects unauthenticated requests
3. Validates the quantity
4. Validates the total revenue
5. Validates the payment method
6. Validates the input source
7. Finds the selected product
8. Verifies that the product belongs to the authenticated user
9. Verifies that the product is active
10. Reads the official product selling price
11. Reads the official product cost price
12. Calculates the transaction cost
13. Calculates gross profit
14. Creates the parent `sales` row
15. Creates the associated `sale_items` row
16. Stores the product snapshots
17. Returns the created sale ID

### Financial calculation

```text
total_cost
=
product.cost_price
×
quantity
```

```text
gross_profit
=
total_revenue
-
total_cost
```

### Security mode

The function uses:

```sql
security invoker
```

The function runs with the caller’s permissions and respects Row Level Security.

Function execution is granted to:

```text
authenticated
```

Function execution is not granted to:

```text
anon
public
```

---

## Sales Service

File:

```text
src/lib/supabaseSales.js
```

Exports:

```js
await getSales();

await saveSale(sale);

await deleteSale(saleId);
```

### Save contract

```js
await saveSale({
  date,
  productId,
  quantity,
  total,
  source,
  paymentMethod
});
```

### Returned frontend sale shape

```js
{
  id,
  date,
  productId,
  productName,
  quantity,
  unitPrice,
  unitCost,
  total,
  totalCost,
  grossProfit,
  source,
  paymentMethod,
  createdAt
}
```

`saveSale()` calls the atomic PostgreSQL RPC and retrieves the newly created sale with its associated sale item.

---

## Typed Sales Workflow

Files:

```text
src/components/ChatEntry/ChatEntry.jsx
src/components/ConfirmSale/ConfirmSale.jsx
src/lib/nlEntryParser.js
```

Example input:

```text
Jual 3 nasi lemak RM12
```

Workflow:

```text
Typed sentence
        ↓
parseNaturalLanguageEntry()
        ↓
Fuzzy product matching
        ↓
Editable confirmation form
        ↓
saveSale()
        ↓
create_single_item_sale(...)
        ↓
Sales and sale-item records
```

The user can correct:

- Product
- Quantity
- Total amount
- Payment method

before saving.

---

## Voice Sales Workflow

File:

```text
src/components/VoiceEntry/VoiceEntry.jsx
```

The browser Web Speech API uses:

```text
Language: ms-MY
```

Workflow:

```text
Spoken sentence
        ↓
Browser speech recognition
        ↓
Transcript
        ↓
Natural-language parser
        ↓
Product matching
        ↓
Confirmation form
        ↓
Supabase sale
```

Voice and typed sales use the same confirmation and persistence pipeline.

If microphone permission is denied or speech recognition is unavailable, users can continue using typed entry.

---

## Receipt OCR Workflow

Files:

```text
src/components/ReceiptScanner/ReceiptScanner.jsx
src/lib/ocrParser.js
```

Workflow:

```text
User selects a receipt image
        ↓
Tesseract.js recognizes text
        ↓
parseReceiptText(rawText)
        ↓
Potential item rows generated
        ↓
Items matched against user products
        ↓
Editable review table displayed
        ↓
User includes or excludes rows
        ↓
Confirmed rows call saveSale()
        ↓
Supabase records created
```

### Supported receipt formats

```text
2 x Nasi Lemak 8.00
2 Nasi Lemak 8.00
Nasi Lemak x2 8.00
Nasi Lemak 2 8.00
Nasi Lemak 8.00
```

### Ignored receipt lines

The parser ignores common non-item lines such as:

```text
TOTAL
JUMLAH
SUBTOTAL
SUBJUMLAH
TUNAI
BAYARAN
CAJ PERKHIDMATAN
GST
SST
TAX
CHANGE
BAKI
```

### OCR quantity correction

Tesseract may confuse quantity `1` with:

```text
I
l
il
ll
```

The parser may interpret these values as quantity `1` when they appear in the expected quantity position.

### OCR safety

- OCR results are not automatically saved
- Users can edit quantity
- Users can edit the amount
- Users can select the correct product
- Users can exclude incorrect rows
- Unmatched products remain unselected
- Raw OCR text remains available for inspection
- Every selected row is confirmed before saving

Receipt images are processed in the browser and are not permanently stored.

---

## Dashboard Service

File:

```text
src/lib/supabaseDashboard.js
```

Export:

```js
await getDashboardData(
  dailyTarget,
);
```

The service loads sales and expenses in parallel:

```js
const [sales, expenses] =
  await Promise.all([
    getSales(),
    getExpenses(),
  ]);
```

### Returned data

```js
{
  stats: {
    todayTotal,
    todayProfit,
    sevenDayTrend,
    topItems,
    targetProgress
  },
  summary,
  insight,
  split: {
    cash,
    qr
  },
  dailyTarget
}
```

### Dashboard calculations

```text
Today’s total sales
=
sum of today’s total_revenue
```

```text
Today’s gross profit
=
sum of today’s gross_profit
```

```text
Today’s expenses
=
sum of today’s expense amounts
```

```text
Today’s net profit
=
today’s gross profit
-
today’s expenses
```

### Dashboard outputs

- Today’s sales
- Today’s net profit
- Cash-versus-QR split
- Daily target progress
- Seven-day sales trend
- Top-selling products
- Bahasa Malaysia daily summary
- Explainable business insight
- WhatsApp sharing message

---

## Date Handling

File:

```text
src/lib/dates.js
```

WarungAI uses local date helpers instead of relying directly on UTC date slicing.

Malaysia uses UTC+8. Using raw UTC dates can incorrectly assign early-morning transactions to the previous calendar day.

Important helpers:

```js
todayISO();

toLocalISO(date);

lastNDates(count);

shortLabel(date);
```

Sale and expense records use local dates in this format:

```text
YYYY-MM-DD
```

---

## Product Sharing Between Components

`ProductList` loads active products from Supabase.

After loading or modifying products, the component passes the updated array to `App.jsx`.

`App.jsx` shares the authenticated user’s product list with:

- ChatEntry
- ReceiptScanner
- ConfirmSale
- Product dropdowns
- Fuzzy product matching

Only active products belonging to the current user are available for new sales.

---

## Error Handling

Service modules throw user-readable errors when:

- Authentication is missing
- A product does not exist
- Product ownership validation fails
- Input values are invalid
- A Supabase query fails
- A sale cannot be created
- An expense cannot be saved
- A record cannot be retrieved
- A record cannot be deleted

Interfaces should:

- Display errors clearly
- Keep user-entered values after failure
- Disable save buttons while requests are running
- Prevent duplicate submissions
- Allow users to retry
- Avoid clearing drafts before successful persistence

---

## Testing

Run all tests:

```bash
npm test
```

Current verified result:

```text
16 parser tests passed
11 storage and insight tests passed
27 total tests passed
```

### Parser coverage

- Printed receipt formats
- Leading quantities
- Trailing quantities
- Product-name, quantity, and total layouts
- Bahasa Malaysia totals
- Comma decimals
- Missing totals
- Invalid OCR text
- Empty input
- English sales phrases
- Bahasa Malaysia sales phrases
- Bahasa Malaysia number words
- Product misspellings
- Unknown products
- Empty product lists
- Fuzzy product matching

### Financial logic coverage

- Product records
- Settings
- Profit calculations
- Empty days
- Dashboard structures
- Bahasa Malaysia summaries
- Cash-versus-QR totals
- Below-cost warnings
- Best-seller insights
- Empty-data handling

### Supabase verification

The following Supabase workflows have been manually tested:

- Email registration
- Email confirmation
- Login
- Logout
- Session restoration
- Shop-name persistence
- Product creation
- Product editing
- Product archiving
- Product ownership isolation
- Expense creation
- Expense deletion
- Expense ownership isolation
- Typed sales
- Voice sales
- Receipt OCR sales
- Sales history
- Sale deletion
- Cascade sale-item deletion
- Sales ownership isolation
- Dashboard calculations
- Vercel production deployment

Security isolation has been tested using two separate authenticated accounts.

---

## Local Development

Install dependencies:

```bash
npm install
```

Start Vite:

```bash
npm run dev
```

Default local URL:

```text
http://localhost:5173
```

Run tests:

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

## Vercel Deployment

Production URL:

```text
https://warung-ai-sepia.vercel.app/
```

Vercel configuration:

```text
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
```

Environment variables required in Production and Preview:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Do not configure a privileged Supabase key as a Vite environment variable.

### Supabase authentication URLs

Site URL:

```text
https://warung-ai-sepia.vercel.app/
```

Redirect URLs:

```text
https://warung-ai-sepia.vercel.app/**
http://localhost:5173/**
```

---

## Security Checklist

### Frontend

- Only the Supabase project URL is exposed
- Only the Supabase publishable key is exposed
- No secret key is present
- No service-role key is present
- No database password is present
- No private AI key is present
- `.env.local` is ignored by Git

### Authentication

- Email authentication is enabled
- Email confirmation is configured
- Sessions persist across refreshes
- Logout clears the active session
- Database access requires an authenticated user

### Database

- RLS is enabled for every business table
- Product rows are restricted by `user_id`
- Expense rows are restricted by `user_id`
- Sales rows are restricted by `user_id`
- Sale-item access is restricted through parent-sale ownership
- Inserts use `with check`
- Updates use both `using` and `with check`
- Private data does not have open anonymous policies

### Transactions

- Sale creation uses an atomic RPC
- Product ownership is verified
- Product status is verified
- Quantity is validated
- Payment method is validated
- Input source is validated
- Official product cost is loaded from PostgreSQL
- Gross profit is calculated in PostgreSQL
- Historical snapshots are saved with the transaction

### Deployment

- Production uses HTTPS
- Vercel contains only browser-safe environment variables
- Supabase redirects include the production domain
- Production login has been tested
- Multiple-account isolation has been tested

---

## Current Limitations

- Natural-language entry currently confirms one product at a time
- The sale RPC currently creates one sale item per sale
- A receipt with several selected products creates one sale per selected row
- Stock is not automatically deducted after a sale
- Archived products do not yet have a restore screen
- Daily sales target remains a browser preference
- Receipt images are not stored
- OCR accuracy depends on receipt quality
- Voice recognition depends on browser support
- Supabase integration tests are currently manual
- The frontend bundle can be further optimized with code splitting

---

## Planned Backend Improvements

### Sales and inventory

- Multi-item sale RPC
- Automatic stock deduction
- Transaction-safe stock updates
- Low-stock alerts
- Sale editing and voiding
- Discounts and price overrides
- Refund records

### Product management

- Restore archived products
- Product categories
- Units such as portion, cup, pack, and kilogram
- Product search
- Duplicate-name warnings

### Settings

- Supabase user-settings table
- Cloud-synchronized daily targets
- Preferred language
- Business profile information

### Receipts

- Private Supabase Storage bucket
- User-specific receipt paths
- Storage RLS policies
- Signed receipt URLs
- Receipt deletion
- Image preprocessing
- OCR confidence indicators

### Reporting

- Date filtering
- Weekly summaries
- Monthly summaries
- CSV export
- PDF reports
- Invoice generation
- Tax-document assistance

### Security and operations

- Supabase automated integration tests
- Database migration files
- Audit records
- Rate limiting
- Error monitoring
- Backup and recovery procedures
- Multi-user business accounts
- Role-based access

---

## Definition of Done

A backend feature is complete only when:

- Authentication behavior is correct
- RLS policies are implemented
- Input is validated
- Error states are handled
- Duplicate submissions are prevented
- Financial calculations are deterministic
- Historical data remains stable
- Two-account isolation is verified
- Automated tests pass
- Production build passes
- The feature works on Vercel
- Documentation is updated
- No secret is committed or exposed
