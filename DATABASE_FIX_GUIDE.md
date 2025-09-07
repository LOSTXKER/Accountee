# Database Issues Fix - Step by Step Guide

## Issues Found:
1. ❌ `create_sales_document` function was returning 404 (Not Found)
2. ❌ `get_document_timeline` function failing due to missing `converted_to_invoice_id` field
3. ⚠️ Chrome extension warnings (unrelated to your app - can be ignored)

## Solution Steps:

### Step 1: Deploy Database Fix
1. **Open Supabase Dashboard**: https://muatjdalljmzdpxrfdwl.supabase.co/project/muatjdalljmzdpxrfdwl/sql
2. **Create a new query**
3. **Copy and paste the SQL** from: `sql/fix_database_schema.sql`
4. **Click "Run"** to execute

This will:
- Add missing columns (`converted_to_invoice_id`, `relatedreceiptid`, `relatedinvoiceid`) if they don't exist
- Fix the `create_sales_document` function to handle missing required fields
- Fix the `get_document_timeline` function to gracefully handle missing columns

### Step 2: Verify Fix
Run this command to verify everything is working:
```bash
node scripts/verify-functions.js
```

You should see all functions marked as ✅ or ⚠️ (which means they exist but test data caused errors - this is expected).

### Step 3: Test Your App
1. Try creating a new sales document
2. Check if the timeline displays properly
3. The errors should be resolved

## What Was Fixed:

### DocumentProcessTimeline Component
- Added better error handling for missing database functions
- Added fallback behavior when timeline data is unavailable
- Made the component more resilient to database schema changes

### Database Functions
- Fixed `create_sales_document` to properly handle required fields like `issuedate`
- Fixed `get_document_timeline` to gracefully handle missing relationship columns
- Added database schema updates to include missing relationship columns

### Chrome Extension Warnings
These are unrelated to your app and come from browser extensions:
```
ethereum.js:2 You are trying to access `chrome.runtime` inside the injected content script...
```
You can safely ignore these - they don't affect your accounting app functionality.

## Testing
After deploying the fix:
1. ✅ Creating sales documents should work
2. ✅ Document timeline should display without errors
3. ✅ No more 404/400 errors in console for these functions

## Files Modified:
- `src/components/sales/document/DocumentProcessTimeline.tsx` - Better error handling
- `sql/fix_database_schema.sql` - Database schema and function fixes
- `scripts/verify-functions.js` - Verification script
- `scripts/check-table.js` - Table structure checker

## Note:
The chrome extension warnings in your console are from browser extensions (like MetaMask or other crypto wallets) and are completely unrelated to your accounting application. They can be safely ignored.
