# 📊 Accountee - Complete Accounting Management System

A comprehensive accounting and business management system built with Next.js 14, TypeScript, and Supabase. This application provides complete financial management capabilities for small to medium businesses.

## ✨ Features

### 📈 Financial Management
- **Income & Expense Tracking**: Complete transaction management with categorization
- **Sales Documents**: Create quotations, invoices, and receipts with automatic workflow
- **Financial Reports**: Profit & Loss statements, Withholding Tax reports, and custom analytics
- **Dashboard Analytics**: Real-time KPIs and financial overview

### 🧾 Sales Document Management
- **Quotation System**: Create professional quotes with auto-expiry (7 days default)
- **Invoice Generation**: Convert quotations to invoices with payment tracking
- **Receipt Management**: Record payments and generate receipts
- **Document Timeline**: Track document progression and status

### 🤖 AI-Powered Features
- **Receipt OCR**: Extract transaction data from receipt images using AI
- **Smart Categorization**: Auto-categorize transactions based on AI learning
- **Data Validation**: AI-assisted data entry and validation

### 💼 Business Management
- **Customer Management**: Complete customer database with contact information
- **Service Catalog**: Manage products and services with pricing
- **Multi-Business Support**: Handle multiple business entities
- **User Authentication**: Secure login and user management

### 🏦 Tax & Compliance
- **VAT Calculations**: Automatic 7% VAT calculations
- **Withholding Tax**: WHT certificate generation and management
- **Tax Reports**: Generate tax reports for compliance
- **Export Functionality**: Export data to Excel for accountants

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **UI Components**: Custom React components with Tailwind
- **File Handling**: Supabase Storage for document attachments
- **PDF Generation**: Client-side PDF generation for reports
- **AI Integration**: Receipt processing and data extraction

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/LOSTXKER/Accountee.git
   cd Accountee
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

## 🔄 Migrate to a new Supabase project (Checklist)

Follow this when switching to a brand-new Supabase project and you want all features to work 100%:

1) Create a new project on Supabase and copy these keys
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (Server only)

2) Update local and Vercel environment variables
   - .env.local (for local dev)
   - Vercel → Project Settings → Environment Variables (Production/Preview/Dev)

3) Bootstrap Storage buckets
   - Required buckets used by the app: `attachments`, `wht_certificates`, `business_assets`, `files`
   - You can run the helper script:
     - node scripts/bootstrap-storage.js

4) Deploy SQL functions (RPCs) and helpers
   - Open Supabase Dashboard → SQL Editor
   - Run first: `sql/bootstrap_schema.sql` (สร้างตารางและ enum ที่ต้องใช้)
   - แล้วค่อยรัน: `sql/sales_document_functions.sql` และ `sql/app_functions.sql`
   - This adds/updates functions:
     - _next_docnumber, create_sales_document, accept_quotation,
       record_invoice_payment, record_payment_and_create_receipt,
       create_receipt_from_invoice, get_sales_document_summary, get_document_timeline

5) Verify database schema and RPC availability (optional helpers)
   - node scripts/health-check.js
   - node scripts/verify-functions.js
   - node scripts/check-schema.js
   - node scripts/check-table.js

6) Smoke tests in the app
   - Login → Create a transaction (income/expense) with attachments → Update statuses
   - Export transactions via UI (calls /api/export-transactions)
   - Generate WHT certificate for a transaction with withholding → checks bucket `wht_certificates`

Troubleshooting
- If a function is missing (error 42883/PGRST202), re-run the SQL from `sql/sales_document_functions.sql`
- If file uploads fail, ensure buckets exist and are public, and your Service Role Key is correct
- If auth/session has issues, verify middleware is active and environment variables are set

4. **Database Setup**
   Run the SQL functions for sales documents:
   ```bash
   npm run deploy:sql
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📱 Application Structure

```
src/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Main application pages
│   ├── api/              # API routes
│   └── auth/             # Authentication pages
├── components/           # React components
│   ├── transactions/     # Transaction management
│   ├── sales/           # Sales document components
│   ├── ui/              # Reusable UI components
│   └── dashboard/       # Dashboard components
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
├── types/               # TypeScript type definitions
└── styles/              # Global styles
```

## 🎯 Key Features Explained

### Transaction Management
- **Income Tracking**: Record all business income with categorization
- **Expense Management**: Track business expenses with receipt attachments
- **Status Workflow**: Multi-stage approval process for transactions
- **File Attachments**: Support for receipts, invoices, and supporting documents

### Sales Document Workflow
1. **Quotation** → Create quote with 7-day auto-expiry
2. **Invoice** → Convert approved quotations to invoices
3. **Receipt** → Record payments and generate receipts
4. **Timeline** → Track complete document lifecycle

### AI Features
- **Smart Receipt Processing**: Upload receipt images for auto data extraction
- **Intelligent Categorization**: AI learns from user patterns
- **Data Validation**: AI-assisted error checking and suggestions

### Reporting
- **Financial Reports**: Comprehensive P&L statements
- **Tax Reports**: VAT and Withholding Tax summaries
- **Export Options**: Excel exports for external accounting
- **Dashboard Analytics**: Real-time business metrics

## 🔧 Configuration

### Auto-Date Filling
Documents automatically set due dates and expiry dates to 7 days from issue date.

### VAT Settings
- Default VAT rate: 7% (configurable)
- Automatic VAT calculations on all transactions
- VAT-inclusive and exclusive pricing support

### File Storage
- Supabase Storage for all file attachments
- Support for PDF, images, and documents
- Organized storage buckets for different file types

## 📊 Database Schema

The application uses Supabase PostgreSQL with the following main tables:
- `businesses` - Business entity information
- `transactions` - Financial transactions
- `sales_documents` - Quotations, invoices, receipts
- `customers` - Customer database
- `services` - Product/service catalog
- `categories` - Transaction categories

## 🚀 Deployment

### Vercel (Recommended)
Your app is already configured for Vercel deployment!

1. **Environment Variables Setup**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Find your "accountee" project
   - Go to Settings → Environment Variables
   - Add these three variables for Production, Preview, and Development:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
     ```

2. **Deploy**
   - Push any commit to GitHub to trigger auto-deployment
   - Or use: `vercel --prod` from command line
   - Or manually redeploy from Vercel dashboard

3. **Live URL**: Your app will be available at:
   `https://accountee-[unique-id].vercel.app`

### Manual Deployment
1. Push to GitHub
2. Connect Vercel to your repository
3. Configure environment variables
4. Deploy automatically

### Manual Deployment
1. Build the application: `npm run build`
2. Deploy to your hosting provider
3. Configure environment variables
4. Set up Supabase connection

### GitHub Actions → Vercel
This repo includes `.github/workflows/vercel-deploy.yml` which deploys on pushes to `main`.

Add repository secrets in GitHub → Settings → Secrets and variables → Actions:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Ensure your Vercel project has these Environment Variables (Production/Preview/Dev):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 🔒 Security Features

- **Row Level Security (RLS)**: Database-level access control
- **User Authentication**: Secure login with Supabase Auth
- **Business Isolation**: Multi-tenant architecture
- **File Security**: Protected file storage with access controls

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation in the `/docs` folder
- Review the SQL setup scripts in `/sql` folder

## 🏗️ Development Roadmap

- [ ] Mobile app development
- [ ] Advanced AI features
- [ ] Multi-currency support
- [ ] Inventory management
- [ ] API integrations

---

**Built with ❤️ for small businesses in Thailand**
