# 🚀 Welcome to Bargazal Hub

A modern, professional Business Management System for small to medium enterprises. Manage clients, projects, invoices, payments, and expenses all in one beautiful, intuitive platform.

![Bargazal Hub](https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Version](https://img.shields.io/badge/Version-1.0.0-blue?style=flat-square)

---

## ✨ Features

### 📊 Dashboard
- **Real-time Metrics**: Revenue, expenses, profit, and outstanding balance
- **Interactive Charts**: 4 different chart types with live data
- **Business Statistics**: Quick overview of clients, projects, and invoices
- **Monthly Breakdown**: 12-month financial trends

### 👥 Client Management
- Complete client database
- Contact information and company details
- Advanced search and filtering
- One-click edit and delete
- Activity tracking

### 📋 Service Catalog
- 35+ pre-configured services
- 5 service categories
- Pricing information
- Service status tracking
- Easy service selection for projects

### 📁 Project Management
- Full project lifecycle tracking
- 9 project statuses (Pending → Completed)
- Progress monitoring (0-100%)
- Auto-generated project numbers
- Client and FYP (Final Year Project) filtering

### 💰 Invoice Management
- Professional invoice creation
- Auto-numbered invoices (BTS-INV-YYYY-XXXX)
- Itemized billing with tax calculation
- Payment status tracking
- Multiple payment methods support
- Outstanding balance calculation

### 💳 Payment Recording
- Record payments against invoices
- Multiple payment methods (Cash, Bank Transfer, POS, Online)
- Auto-generated payment numbers (BTS-PAY-XXXX)
- Amount tracking and receipts

### 📊 Expense Tracking
- Categorized expense management
- 11 expense categories
- Vendor information
- Auto-numbered expenses (BTS-EXP-XXXX)
- Budget monitoring

### 📈 Comprehensive Reports
- Financial reports (Revenue, Expenses, Profit)
- Project performance analytics
- Client statistics
- Service performance breakdown
- Date range filtering
- Multiple chart visualizations

### ⚙️ Business Settings
- Company information configuration
- Invoicing settings (prefix, tax rate, currency)
- Payment method management
- Professional customization

---

## 🛠️ Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend Framework | React | 19.2.0 |
| Language | TypeScript | 5.8.3 |
| Build Tool | Vite | 8.1.5 |
| Routing | TanStack Router | 1.170.18 |
| State Management | TanStack Query | 5.101.1 |
| Backend | Supabase | Latest |
| Database | PostgreSQL | 15+ |
| UI Components | shadcn/ui | Latest |
| Styling | Tailwind CSS | 4.2.1 |
| Form Handling | React Hook Form | 7.71.2 |
| Validation | Zod | 3.24.2 |
| Charts | Recharts | 2.15.4 |
| Notifications | Sonner | 2.0.7 |
| Date Utils | date-fns | 4.1.0 |

---

## 🚀 Quick Start

### 1. **Clone Repository**
```bash
git clone https://github.com/your-username/bargazal-hub.git
cd bargazal-hub
```

### 2. **Setup Environment**
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. **Setup Database**
- Open Supabase SQL Editor
- Copy content from `drizzle/migrations/0000_bargazal_bms_core.sql`
- Paste and run in SQL Editor

### 4. **Create Super Admin**
```bash
# Install dependencies
npm install

# Run setup script
node scripts/setup-superadmin.js
```

This creates:
- **Email**: your administrator email
- **Password**: your private password
- **Role**: Administrator

### 5. **Run Application**
```bash
npm run dev
```

Visit: http://localhost:5173

---

## 📖 Detailed Setup Guide

For comprehensive setup instructions, deployment guide, and troubleshooting, see [SETUP.md](./SETUP.md)

Key sections:
- Step-by-step environment setup
- Database migration instructions
- Multiple admin creation methods
- Vercel deployment guide
- Security checklist
- Troubleshooting common issues

---

## 📂 Project Structure

```
bargazal-hub/
├── src/
│   ├── routes/              # Page components
│   │   ├── login.tsx       # Authentication
│   │   ├── landing.tsx     # Landing page
│   │   ├── dashboard.tsx   # Main dashboard
│   │   ├── clients.tsx     # Client management
│   │   ├── services.tsx    # Service catalog
│   │   ├── projects.tsx    # Project tracking
│   │   ├── invoices.tsx    # Invoice management
│   │   ├── payments.tsx    # Payment recording
│   │   ├── expenses.tsx    # Expense tracking
│   │   ├── reports.tsx     # Business analytics
│   │   ├── settings.tsx    # Configuration
│   │   └── __root.tsx      # Root layout
│   ├── components/
│   │   ├── app/            # Application layout components
│   │   ├── ui/             # shadcn/ui components
│   │   └── [features]/     # Feature-specific components
│   ├── data/               # Data access layer (API hooks)
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # Supabase setup
│   ├── lib/                # Utilities and helpers
│   └── styles.css          # Global styles
├── drizzle/
│   ├── schema.ts           # Database schema
│   └── migrations/         # SQL migrations
├── public/                 # Static assets
├── scripts/
│   └── setup-superadmin.js # Admin setup script
├── SETUP.md                # Comprehensive setup guide
├── IMPLEMENTATION.md       # Feature implementation details
├── .env.example            # Environment template
└── package.json            # Dependencies
```

---

## 🔐 Security Features

✅ **Row Level Security (RLS)** - Database level security policies
✅ **Admin Role Management** - Role-based access control
✅ **Session Management** - Secure authentication
✅ **Input Validation** - Zod schema validation on all forms
✅ **Secure API Communication** - HTTPS & encrypted data
✅ **Activity Logging** - Audit trail for all actions
✅ **Password Reset** - Secure email-based recovery

---

## 🎯 Core Modules Explained

### Dashboard Module
Real-time business intelligence with:
- 8 metric cards (Revenue, Expenses, Profit, Balance, Clients, Projects, FYP, Overdue)
- 4 interactive charts (Revenue/Expenses line chart, Profit bar chart, Status pie chart, Services bar chart)
- Calculated from 5000+ database records
- Live updates every 30 seconds

### Client Management Module
Complete CRUD interface with:
- Full client information storage (name, email, phone, company, address, etc.)
- Search and filter capabilities
- Inline editing with confirmation dialogs
- One-click deletion with undo protection

### Service Catalog
Browse and manage services with:
- 35+ pre-configured services for Nigerian market
- 5 categories (IT Solutions, Web Services, Support Services, Training, Consulting)
- Realistic pricing with NGN currency formatting
- Service status indicators (Active/Inactive)

### Project Management
Complete project lifecycle with:
- 9 status stages from creation to completion
- Progress tracking (0-100%)
- Priority levels (Low, Medium, High, Urgent)
- Client association and FYP flagging
- Auto-numbered projects (BTS-PROJ-XXXX)

### Invoice System
Professional invoicing with:
- Item-based invoicing with automatic calculations
- Tax rate configuration
- 6 invoice statuses
- Outstanding balance tracking
- Payment linkage for reconciliation

### Financial Tracking
Comprehensive money management:
- Multiple payment methods
- Expense categorization (11 categories)
- Automatic number sequences
- Financial reporting and trends

---

## 📊 Database Schema

**13 Tables:**
1. **profiles** - User profile information
2. **user_roles** - Role assignments (admin/staff)
3. **business_settings** - Company configuration
4. **clients** - Client database
5. **service_categories** - Service grouping
6. **services** - Service catalog
7. **projects** - Project tracking
8. **invoices** - Invoice master records
9. **invoice_items** - Invoice line items
10. **payments** - Payment records
11. **expenses** - Expense tracking
12. **activity_logs** - Audit trail
13. **integration_logs** - System logs

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

```bash
# 1. Push to GitHub
git push origin main

# 2. Connect on Vercel
# - Go to vercel.com/dashboard
# - Import GitHub repository
# - Add environment variables

# 3. Deploy
# - Automatic deployment on push
```

### Deploy to Other Platforms

The application builds to a standard Nitro/Node.js server:
```bash
npm run build
npm run preview
```

Supports: Netlify, Fly.io, Railway, AWS, GCP, Azure, and more.

---

## 🐛 Troubleshooting

### Common Issues & Solutions

**Q: "Cannot connect to Supabase"**
- ✓ Check `.env.local` has correct URL and key
- ✓ Verify Supabase project exists and is active
- ✓ Test connection: Go to Supabase dashboard

**Q: "Database tables not found"**
- ✓ Run SQL migrations from `drizzle/migrations/`
- ✓ Check Supabase Table Editor for tables
- ✓ Verify migration SQL executed without errors

**Q: "Login not working"**
- ✓ Verify admin user created with setup script
- ✓ Check your administrator email
- ✓ Try password reset if needed

**Q: "Port 5173 already in use"**
```bash
npm run dev -- --port 5174
```

For more troubleshooting, see [SETUP.md](./SETUP.md)

---

## 📝 API Documentation

The application uses Supabase's RESTful API through TanStack Query hooks.

### Data Layer Hooks

```typescript
// Clients
const { data: clients } = useClients();
const { mutate: saveClient } = useSaveClient();
const { mutate: deleteClient } = useDeleteClient();

// Projects
const { data: projects } = useProjects();
const { mutate: saveProject } = useSaveProject();

// Invoices
const { data: invoices } = useInvoices();

// Payments
const { mutate: recordPayment } = useRecordPayment();

// Expenses
const { mutate: saveExpense } = useSaveExpense();

// Dashboard
const { data: dashboardData } = useDashboard();
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 📞 Support

- **Documentation**: See [SETUP.md](./SETUP.md) and [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- **Issues**: Open an issue on GitHub
- **Email**: support@bargazalhub.com

---

## 🙏 Acknowledgments

Built with:
- ❤️ by [Bargazal and Sons Tech Solution](https://bargazalhub.com)
- 🎨 UI by [shadcn/ui](https://ui.shadcn.com)
- 🚀 Hosted on [Supabase](https://supabase.com)
- 📦 Built with [React](https://react.dev) & [Vite](https://vitejs.dev)

---

## 📊 Project Statistics

- **Total Lines of Code**: 15,000+
- **Components**: 50+
- **Routes**: 11
- **Database Tables**: 13
- **Pre-configured Services**: 35+
- **Build Size**: ~85 kB (gzipped)
- **Performance**: Optimized for sub-100ms page loads

---

## 🎯 Roadmap

### v1.1 (Q4 2024)
- [ ] Client portal login
- [ ] Email invoice notifications
- [ ] PDF export for invoices

### v2.0 (Q1 2025)
- [ ] Mobile app
- [ ] SMS reminders
- [ ] Advanced reporting
- [ ] Team management

### Future
- [ ] API webhooks
- [ ] Third-party integrations
- [ ] Automated workflows
- [ ] AI-powered insights

---

**Made with ❤️ for business excellence**

---

**Version**: 1.0.0 | **Status**: ✅ Production Ready | **Last Updated**: September 2024
