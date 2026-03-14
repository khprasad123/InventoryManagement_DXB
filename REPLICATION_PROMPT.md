# Full Replication Prompt: KaHa Enterprise Cloud

Build a complete **multi-tenant SaaS business management platform** called **KaHa Enterprise Cloud**. Use this as a full specification to recreate the application from scratch.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth v4 with JWT strategy, Credentials provider (email + password)
- **Styling:** TailwindCSS + ShadCN UI (Radix primitives)
- **Validation:** Zod + React Hook Form
- **Charts:** Recharts
- **File storage:** Vercel Blob
- **Package manager:** pnpm

---

## Core Features

### 1. Multi-Tenant (Organizations)
- Each tenant = one Organization (name, slug, address, logoUrl, sealUrl)
- All data scoped by `organizationId`
- Users can belong to multiple organizations
- After login, if `userOrganizations.length > 1`, show **Organization Selector** page (`/select-org`); otherwise redirect to dashboard
- Store `organizationId`, `organizationName`, `role`, `permissions`, `isSuperAdmin` in session; support `session.update({ organizationId })` to switch org

### 2. Auth & Session
- Login: email + password (Credentials provider)
- Register: only when `NEXT_PUBLIC_IS_DEV=true`; creates new org + first user as super admin
- **Registration requires:** org name, address, logo, seal (mandatory; used for invoices)
- Session includes: `id`, `email`, `name`, `role`, `organizationId`, `organizationName`, `permissions[]`, `isSuperAdmin`, `organizations[]`
- JWT callback: on `trigger === "update"` and `session.organizationId`, update token from `organizations` array
- Login → redirect to `/select-org` → if 1 org, redirect to `/dashboard`; if multiple, show selector

### 3. Roles & Permissions
- Roles: ADMIN, INVENTORY, FINANCE, SALES (per org)
- Permissions: `manage_users`, `manage_roles`, `record_payments`, `adjust_stock`, `manage_inventory`, `manage_suppliers`, `manage_clients`, `manage_purchases`, `manage_sales`, `manage_expenses`, `approve_quotation`, `approve_purchase_request`, `view_reports`, `view_audit`
- ADMIN = all permissions; other roles = subsets (inventory, finance, sales)
- **Quotation approval** and **Purchase Request approval** require `approve_quotation` / `approve_purchase_request` (or ADMIN)
- `UserOrganization.isSuperAdmin`: org super admin; only they can edit/remove other super admins
- Super admins cannot be updated or removed by anyone

### 4. Audit Log
- Model: `organizationId`, `userId`, `action` (LOGIN, LOGOUT, CREATE_*, UPDATE_*, DELETE_*), `entityType`, `entityId`, `metadata` (JSON), `createdAt`
- Log all CRUD, login, logout
- Audit Log page at `/settings/audit` with filters (action, entityType, date range, userId)

### 5. Main Business Flows

#### 5.1 INVENTORY
- **Items list** with **categories**
- Fields: SKU, name, category, unit, **default purchase cost**, **default margin (%)**, **current stock**, min stock
- Stock updated from GRN (receipt) and Sales (dispatch)

#### 5.2 CLIENTS
- Client details: name, contact, email, phone
- **Address** (full address fields)
- **Payment terms** (e.g. NET 30, 50% advance + 50% on completion)
- **Agreed due date** (per client)
- **Document attachments** (contracts, agreements, etc.)
- **Order history** – track all quotations, sales orders, invoices for the client

#### 5.3 SUPPLIERS
- Supplier details: name, contact, email, phone
- **Address**
- **Payment terms**
- **Document attachments**
- **Transaction history** – all purchase requests, purchase orders, GRNs, payments

#### 5.4 SALES FLOW (all tagged under **Job ID**)
1. **Quotation** (start with Job ID)
   - Select client
   - Select items – shows **purchase cost** and **margin** (editable)
   - Send for **approval** by authorized person
   - Status: DRAFT → APPROVED
2. **Sales Order** (only from **approved** quotation)
   - Select quotation
   - Items pre-filled from quotation – shows **inclusive price** (cost + margin), quantity; **no margin field** (already applied)
   - **Rule:** Sales order cannot add items not in the quotation
3. **Invoice** (from Sales Order)
   - Generate PDF with:
     - Org logo, seal, company address
     - Client details (name, address, TRN)
     - Item table: S No, Code, Item, Unit, Qty, Rate, Net Amount, Tax %, Tax Amount, Gross Amount
     - Tax % editable per line or globally
     - Totals: Invoice Amount, Deductions, Taxable Value, VAT, Net Amount
     - Amount in words
     - Watermarks/metadata: Created By, Approved By, Generated On, Job ID / Transaction ID
     - Signature section: Prepared By, Approved By, Customer Acknowledgement
   - Payment tracking: payment type, amount, remaining balance
   - Job ID remains **open** until full payment; only after **full payment** does job **close**
   - Client’s agreed due date applied

#### 5.5 PURCHASE FLOW (all tagged and traceable)
1. **Purchase Request (PR)**
   - Can be created **from Sales Order** (pre-fill items) OR **standalone**
   - Add items + quantity; **no price** at this stage
   - Send for **approval** by authorized person
   - Status: DRAFT → APPROVED
2. **Purchase Order (PO)**
   - Created from **approved** Purchase Request
   - Items from PR; select **supplier**
   - Can **remove** items from PO – removed items stay in PR and can be fulfilled by another PO with different supplier
   - **Rule:** Purchase order **cannot** add items not in the Purchase Request
   - Purchase price (editable) per line
3. **GRN (Goods Received Note)**
   - From Purchase Order
   - Select PO; can attach **supplier documents**
   - On GRN creation, **inventory** is updated
   - GRN links to PO

**Business Rules:**
- Purchase Order items must come from Purchase Request only (no manual add)
- Sales Order items must come from Quotation only (no manual add)
- Only approved Quotation can create Sales Order

### 6. Organization (Tenant)
- **Mandatory on registration:** Org name, **address** (full), **LOGO**, **SEAL**
- These are used for invoice creation (company header, seal on invoices)
- Without these, sales/invoice creation is blocked

### 7. Data Model (Prisma) – Revised
- **Organization** (name, slug, **address**, **logoUrl**, **sealUrl**, ...)
- **Currency** (per org)
- **User**, **UserOrganization**, **Role**, **Permission**, **RolePermission**
- **Item** (sku, name, category, unit, **defaultPurchaseCost**, **defaultMargin**, stockQty, minStock)
- **StockMovement** (type, quantity, referenceType, referenceId)
- **Client** (name, contact, email, phone, **address**, taxNumber, **defaultPaymentTerms**, **agreedDueDays**, ...)
- **Supplier** (name, contact, email, phone, **address**, taxNumber, **paymentTerms**, ...)
- **Quotation** (jobId, clientId, status: DRAFT|PENDING_APPROVAL|APPROVED, approvedById, ...)
- **QuotationItem** (itemId, quantity, purchaseCost, margin, sellingPrice)
- **SalesOrder** (quotationId, jobId, ...)
- **SalesOrderItem** (from quotation items only)
- **SalesInvoice** (salesOrderId, jobId, taxPercent, pdfUrl, createdById, approvedById, ...)
- **SalesInvoiceItem** (itemId, quantity, unitPrice, taxPercent, ...)
- **ClientPayment** (invoiceId, amount, paymentType, ...)
- **PurchaseRequest** (jobId?, salesOrderId?, status: DRAFT|PENDING_APPROVAL|APPROVED, ...)
- **PurchaseRequestItem** (itemId, quantity)
- **PurchaseOrder** (purchaseRequestId, supplierId, ...)
- **PurchaseOrderItem** (from PR items; can be marked removed/fulfilled)
- **Grn** (purchaseOrderId, ...), **GrnItem**
- **Document** (documentableType, documentableId)
- **ExpenseCategory**, **Expense**
- Job status: OPEN (payment pending) | CLOSED (fully paid)

### 8. Invoice PDF Template
Use this HTML structure (A4, border-collapse tables, print-friendly):

**Layout:**
- **Header:** Org logo + name, org address (PO Box, city, UAE), Tel, Fax, website, **TAX REGISTRATION NO**
- **Title bar:** Service/product type | "Tax Invoice"
- **Metadata (2 columns):**
  - Left: Invoice No, Customer Name, Address, TRN#, Site Location, Building
  - Right: Invoice Date, Ref No, Project No/Job ID, Customer Ref No, Payment Terms, Due Date, Sales Man
- **Items table:** S No | Code | Item | Unit | Qty | Rate | Net Amount | Tax % | Tax Amount | Gross Amount
- **Totals:** Invoice Amount, Deductions, Taxable Value, VAT Amount, **Net Amount** (bold)
- **Amount in words** (italic)
- **Notes:** Remarks, Payment Terms, Bank details (Acct Name, Bank, Acct#, IBAN)
- **Signature section:** Prepared By | Approved By | Customer Acknowledgement (3 columns)
- **Footer:** Generated timestamp, Page X of Y
- **Watermarks:** Created By, Approved By, Generated On, Job ID / Transaction ID

**Reference HTML (adapt with org logo, seal, and dynamic data):**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tax Invoice</title>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f3f4f6; padding: 20px; }
        .invoice-container { width: 210mm; min-height: 297mm; padding: 10mm; margin: auto; background: white; border: 1px solid #ccc; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid black; padding: 4px 8px; font-size: 11px; }
        .no-border td { border: none !important; }
        @media print { body { background: none; padding: 0; } .invoice-container { border: none; margin: 0; width: 100%; } .no-print { display: none; } }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header: [LOGO] + Org name | Org address, TRN, Tel, Fax, website -->
        <!-- Title: [Service Type] | Tax Invoice -->
        <!-- Metadata: Invoice No, Customer, Address, TRN, Site, Building | Date, Ref, Project, Payment Terms, Due, Sales Man -->
        <!-- Items table: S No | Code | Item | Unit | Qty | Rate | Net | Tax% | Tax Amt | Gross -->
        <!-- Totals: Invoice Amt, Deductions, Taxable Value, VAT, Net Amount -->
        <!-- Amount in words -->
        <!-- Notes, Bank details -->
        <!-- Signatures: Prepared By | Approved By | Customer Acknowledgement -->
        <!-- Footer: timestamp, Page X of Y -->
    </div>
    <div class="no-print"><button onclick="window.print()">Print / Save PDF</button></div>
</body>
</html>
```

### 9. Pages & Routes
- `/` → redirect to /dashboard if logged in, else /login
- `/login`, `/register` (only when NEXT_PUBLIC_IS_DEV=true)
- `/select-org` (protected)
- **Dashboard:** KPIs, charts, due receivables/payables, low stock
- **Inventory:** `/inventory` (list with categories), add, edit
- **Clients:** list, add, [id] (details + order history), edit
- **Suppliers:** list, add, [id] (details + transaction history), edit
- **Sales:** Job-centric; Quotations (create from Job ID, approval), Sales Orders (from approved quotation), Invoices (PDF, payments)
- **Purchases:** Purchase Requests (from Sales Order or standalone), Purchase Orders (from PR), GRN
- **Expenses:** categories, expenses
- **Reports:** placeholder
- **Settings:** users, roles, audit, currencies, **org (with address, logo, seal)**

### 10. Attachments & Documents
- Supplier, Client, Item create forms: optional file upload
- GRN: attach supplier documents
- Documents stored in Vercel Blob; `Document` model links to entity via `documentableType`/`documentableId`

### 11. Org Management (Super Admin Only)
- `/settings/org`: org name/slug; "Delete organization" wipes all org data + blob files, logs user out; login shows "Organization deleted" when `?deleted=1`

### 12. Middleware
- Protect: `/select-org`, `/dashboard/*`, `/inventory/*`, `/suppliers/*`, `/clients/*`, `/purchases/*`, `/sales/*`, `/expenses/*`, `/reports/*`, `/settings/*`
- `/settings/users`: ADMIN only
- Sign-in page: `/login`

### 10. Environment Variables
- `DATABASE_URL` – PostgreSQL connection
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_IS_DEV` – show Register link when true
- `IS_DEV` – when true, seed can clear DB before reseeding (dev only)
- `BLOB_READ_WRITE_TOKEN` – Vercel Blob

### 14. Branding & Assets
- App name: **KaHa Enterprise Cloud**
- Logo variants: `kaha-logo-icon.png`, `kaha-logo-horizontal.png`, `kaha-logo-dark.png`, `kaha-logo-main.png` in `src/lib/logo/`
- Favicons: `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `favicon-64x64.png` in `src/lib/logo/favicon/`
- Use logo on login, register, select-org, sidebar; favicons via layout metadata

### 15. Dependencies
- next, react, react-dom, next-auth, @prisma/client, bcryptjs
- @radix-ui/* (dialog, dropdown, label, select, separator, slot, avatar)
- @hookform/resolvers, react-hook-form, zod
- recharts, lucide-react, clsx, tailwind-merge, class-variance-authority
- @vercel/blob, sharp

### 16. Seed
- Default org (with sample address, logo, seal URLs), AED + USD currencies
- 14 permissions (include `approve_quotation`, `approve_purchase_request`), 4 roles with mapping
- Admin user: admin@example.com / admin123, first user = super admin
- If IS_DEV=true: clear all data before seeding

### 17. Deployment (Vercel)
- vercel.json: `buildCommand: "pnpm db:push && pnpm db:seed && pnpm build"`, `installCommand: "pnpm install"`, framework: nextjs

---

Implement all of the above with clean, maintainable code. Use server actions for mutations, `requireAuth()` / `getServerSession()` for protected pages, and permission checks (`hasPermission`, `canManageUsers`, etc.) before sensitive operations.
