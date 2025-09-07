# 🚀 Deploy SQL Functions to Supabase

## ⚠️ IMPORTANT: You MUST deploy these SQL functions to fix the 404 errors!

The console shows these 404 errors because the SQL functions are not deployed:
- `POST .../rpc/create_sales_document 404 (Not Found)`
- `POST .../rpc/get_document_timeline 404 (Not Found)`

## 📋 Quick Deployment Steps

### 1. Open Supabase Dashboard
- Go to your Supabase project: https://supabase.com/dashboard
- Navigate to your project

### 2. Open SQL Editor
- Click on **"SQL Editor"** in the left sidebar
- Click **"New query"**

### 3. Copy and Paste SQL Functions
- Copy the ENTIRE contents of the file: `sql/sales_document_functions.sql`
- Paste it into the SQL Editor

### 4. Run the Functions
- Click **"Run"** or press `Ctrl+Enter`
- Wait for success confirmation

## ✅ What These Functions Fix

After deployment, these functions will be available:

1. **`create_sales_document()`** - Creates sales documents with proper numbering
2. **`record_payment_and_create_receipt()`** - Handles payment processing  
3. **`get_sales_document_summary()`** - Provides document statistics
4. **`get_document_timeline()`** - Shows document process history

## 🔍 Verify Deployment

After running the SQL:
1. You should see success messages in the SQL Editor
2. The 404 errors in your browser console should disappear
3. Sales document creation should work properly

## 📄 File to Deploy

The file containing all functions:
```
sql/sales_document_functions.sql
```

## 🆘 Need Help?

If you encounter any errors during deployment:
1. Check that you're connected to the correct database
2. Make sure you have proper permissions
3. Try running the functions one at a time if there are issues

---

**Note**: This deployment is required for the sales document creation feature to work. The application has fallback logic, but the RPC functions provide the best performance and features.
