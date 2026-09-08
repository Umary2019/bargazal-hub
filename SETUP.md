# Bargazal Hub - Setup & Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase account (free tier available at https://supabase.com)
- Git installed

### Step 1: Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Get Supabase credentials:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create a new project or use existing one
   - Go to **Settings > API**
   - Copy `URL` and `anon public key`

3. **Update `.env.local`:**
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

   > ⚠️ **Service Role Key**: Go to Settings > API > Service Role Key (keep this secret!)

### Step 2: Database Setup

1. **Open Supabase SQL Editor:**
   - Go to your Supabase project
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

2. **Run migrations in order:**
   - Run every SQL file in `drizzle/migrations/` in filename order, from `0000_bargazal_bms_core.sql` through the latest migration.
   - Do not run only `0000`; later migrations add portals, approvals, quotes, delivery workflows, public invoice links, and security hardening.
   - Paste each file into the SQL Editor and click **Run**, waiting for completion before continuing.
   - For an existing installation, run only migrations that have not already been applied.

3. **Verify tables created:**
   - Go to **Table Editor** in left sidebar
   - You should see these tables:
     - profiles
     - user_roles
     - business_settings
     - clients
     - service_categories
     - services
     - projects
     - invoices
     - invoice_items
     - payments
     - expenses
     - activity_logs
     - integration_logs

### Step 3: Create Super Admin User

#### Option A: Using Setup Script (Recommended)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run setup script:**
   ```bash
   node scripts/setup-superadmin.js
   ```

3. **Script will create:**
   - Email: your administrator email
   - Password: your private password
   - Role: Administrator

#### Option B: Manual Setup (Supabase Console)

1. **Create user in Supabase:**
   - Go to **Authentication > Users**
   - Click **Add user**
   - Email: your administrator email
   - Password: your private password
   - Click **Create user**

2. **Create profile:**
   - Go to **Table Editor > profiles**
   - Click **Insert Row**
   - Fill: id (copy from users), email, full_name
   - Click **Save**

3. **Create admin role:**
   - Go to **Table Editor > user_roles**
   - Click **Insert Row**
   - Fill: user_id (copy from users), role: `admin`
   - Click **Save**

### Step 4: Run Application

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Application opens at http://localhost:5173
```

### Step 5: Login

- **URL:** http://localhost:5173/login
- **Email:** your administrator email
- **Password:** your private password

---

## 📁 Project Structure

```
/src
├── routes/           # Page components (login, dashboard, clients, etc.)
├── components/       # Reusable UI components
│   ├── app/         # Layout components (header, sidebar, etc.)
│   └── ui/          # shadcn/ui components
├── data/            # Data layer (API hooks)
├── hooks/           # Custom React hooks (useAuth, useMobile)
├── integrations/    # Supabase setup
├── lib/             # Utilities and helpers
└── styles.css       # Global styles

/drizzle
├── schema.ts        # Database schema definition
└── migrations/      # SQL migrations
```

---

## 🎯 Features Overview

### 📊 Dashboard
- Real-time financial metrics
- Revenue vs Expenses charts
- Project status breakdown
- Top services by revenue
- Business statistics

### 👥 Clients
- Complete client database
- Contact information
- Company details
- Advanced search and filtering
- Create, edit, delete clients

### 📋 Services
- Service catalog with 35+ pre-configured services
- 5 service categories
- Pricing information
- Service status tracking

### 📁 Projects
- Project tracking with status
- Progress monitoring
- Timeline management
- Resource allocation
- Auto-generated project numbers (BTS-PROJ-XXXX)

### 💰 Invoices
- Professional invoice creation
- Auto-numbered invoices (BTS-INV-YYYY-XXXX)
- Item management
- Tax calculation
- Payment tracking
- Status management (Draft, Sent, Paid, Overdue, etc.)

### 💳 Payments
- Payment recording
- Multiple payment methods (Cash, Bank Transfer, POS, Online, Other)
- Payment number auto-generation (BTS-PAY-XXXX)
- Amount tracking
- Receipt management

### 📊 Expenses
- Expense tracking with categories
- Vendor information
- Expense numbering (BTS-EXP-XXXX)
- Budget monitoring
- Category-wise breakdown

### 📈 Reports
- Comprehensive business analytics
- Financial reports
- Project performance reports
- Client statistics
- Service performance
- Date range filtering

### ⚙️ Settings
- Business information configuration
- Invoicing settings
- Currency and tax rate
- Company details (name, phone, email, address, website)

---

## 🔧 Build & Deployment

### Local Build
```bash
npm run build
```

Output: `.vercel/output/` with the SSR function and static assets ready for Vercel.

### Deploy to Vercel

1. **Connect to GitHub:**
   ```bash
   git remote add origin https://github.com/your-username/bargazal-hub.git
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click **Add New... > Project**
   - Select your GitHub repo
   - Configure environment variables:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`
    - Set the build command to `npm run build`.
    - Leave the output directory managed by the Nitro Vercel preset.
   - Click **Deploy**

3. **Your app is live!**

---

## 🔐 Security Checklist

- [ ] Supabase RLS (Row Level Security) policies enabled
- [ ] Service Role Key kept secret (never commit to git)
- [ ] HTTPS enabled on production
- [ ] Database backups configured
- [ ] Authentication session management verified
- [ ] Admin-only routes protected
- [ ] Input validation on all forms
- [ ] SQL injection prevention via parameterized queries

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to Supabase"
- **Check:** Environment variables in `.env.local`
- **Verify:** URL format: `https://[project-id].supabase.co`
- **Test:** Can you access Supabase dashboard?

### Issue: "User creation failed"
- **Check:** Service Role Key is correct
- **Verify:** Database migrations were applied
- **Try:** Manual user creation in Supabase console

### Issue: "Login not working"
- **Check:** Administrator email is correct
- **Verify:** Private password matches
- **Try:** Password reset flow if needed

### Issue: "Build errors"
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: "Port 5173 already in use"
```bash
# Use different port
npm run dev -- --port 5174
```

---

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## 📞 Support & Contact

- **Company:** Bargazal and Sons Tech Solution
- **Email:** support@bargazalhub.com
- **Website:** https://bargazalhub.com

---

## 📝 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 19.2.0 |
| Language | TypeScript | 5.8.3 |
| Build | Vite | 8.1.5 |
| Routing | TanStack Router | 1.170.18 |
| State | TanStack Query | 5.101.1 |
| Backend | Supabase | Latest |
| Database | PostgreSQL | 15+ |
| UI Library | shadcn/ui | Latest |
| Styling | Tailwind CSS | 4.2.1 |
| Forms | React Hook Form | 7.71.2 |
| Validation | Zod | 3.24.2 |
| Charts | Recharts | 2.15.4 |
| Notifications | Sonner | 2.0.7 |

---

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

---

## 🚀 Future Enhancements

- [ ] Client Portal
- [ ] Email Notifications
- [ ] PDF Invoice Export
- [ ] SMS Reminders
- [ ] Mobile App
- [ ] API Webhooks
- [ ] Third-party Integrations
- [ ] Advanced Reporting
- [ ] Team Management
- [ ] Custom Workflows

---

**Last Updated:** September 2024
**Version:** 1.0.0
**Status:** Production Ready ✅
