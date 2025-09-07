# Sales Document Database Schema Fix

## The Problem
The application was trying to create sales documents but getting errors:
1. `POST .../rpc/create_sales_document 404 (Not Found)` - RPC function doesn't exist
2. `"Could not find the 'business_id' column of 'sales_documents' in the schema cache"`
3. `'null value in column "docnumber" violates not-null constraint'` - Missing document number

These were caused by:
- Column naming inconsistency between the application code and the database schema
- Missing RPC function in Supabase
- Missing required document number generation

## The Fix Applied

### 1. Fixed Column Naming Consistency
- **Database Schema**: Uses `businessid` (no underscore)
- **Application Code**: Was trying to use both `business_id` and `businessid` inconsistently
- **Solution**: Standardized on `businessid` (no underscore) throughout the application

### 2. Updated `useSalesDocument.ts` Hook
- Removed redundant snake_case parameter keys in RPC calls
- Simplified the fallback insert logic to use only `businessid` format
- Cleaned up the data structure passed to the database

### 3. Created New SQL Functions
Created `sql/sales_document_functions.sql` with:
- `create_sales_document()` - Handles document creation with proper numbering
- `record_payment_and_create_receipt()` - Creates receipts from invoices  
- `get_sales_document_summary()` - Dashboard statistics for sales documents

### 4. Fixed Document Number Generation
- Added automatic document number generation in fallback logic
- Uses format: `QT-YYYY-XXXX`, `INV-YYYY-XXXX`, `RC-YYYY-XXXX`
- Ensures the required `docnumber` field is never null

## Database Deployment Instructions

### Step 1: Deploy the SQL Functions
1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `sql/sales_document_functions.sql`
3. Run the SQL to create the functions

### Step 2: Verify Database Schema
Make sure your `sales_documents` table uses these column names (no underscores):
- `businessid` (not `business_id`)
- `docnumber` (not `doc_number`)
- `customername` (not `customer_name`)
- `customeraddress` (not `customer_address`)
- `issuedate` (not `issue_date`)
- `duedate` (not `due_date`)
- `expirydate` (not `expiry_date`)
- `grandtotal` (not `grand_total`)
- `discountamount` (not `discount_amount`)
- `vatamount` (not `vat_amount`)
- `withholdingtaxamount` (not `withholding_tax_amount`)
- `createdat` (not `created_at`)
- `relatedinvoiceid` (not `related_invoice_id`)
- `relatedreceiptid` (not `related_receipt_id`)

### Step 3: Test the Fix
1. Start your development server: `npm run dev`
2. Navigate to sales documents page
3. Try creating a new quotation or invoice
4. Should now work without the `business_id` column error

## What Changed in the Code

### `src/hooks/useSalesDocument.ts`
- Removed duplicate parameter passing with both naming conventions
- Simplified the commonDataDb object to use only no-underscore keys
- Streamlined the fallback insert logic
- Now consistently uses `businessid` throughout

### Error Handling
- If the RPC function doesn't exist, it falls back to direct insert
- Uses the correct column names for the database schema
- Provides clear error messages for debugging

## Testing
The build now passes successfully:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (25/25)
```

You should now be able to create sales documents (quotations, invoices, receipts) without the database schema error.
