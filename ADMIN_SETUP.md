# 🔑 Super Admin Setup Instructions

## Quick Setup

Create an administrator account using your private Supabase project credentials:

```
📧 Email:    your-admin-email@example.com
🔐 Password: your-private-password
👤 Role:     Administrator (Full Access)
```

---

## How to Login

### Step 1: Start the Application
```bash
npm run dev
```

### Step 2: Go to Login Page
- Open browser: http://localhost:5173/login
- Or click "Login" on landing page

### Step 3: Enter Credentials
- **Email**: your-admin-email@example.com
- **Password**: your-private-password
- **Check**: "Remember me" (optional)
- Click: **Login**

### Step 4: Access Dashboard
- You're now logged in as Administrator
- Full access to all features

---

## Setting Up Admin Account (First Time)

### If Using Setup Script (Recommended)

The account is created automatically when you run:
```bash
node scripts/setup-superadmin.js
```

Requirements:
- Environment variables configured (`.env.local`)
- Database migrations applied
- Supabase project active

### If Setting Up Manually

1. **In Supabase Console:**
   - Go to **Authentication > Users**
   - Click **Add User**
   - Email: your-admin-email@example.com
   - Password: your-private-password
   - Confirm Email: ✓ (checked)
   - Click **Create User**

2. **Create Profile:**
   - Go to **Table Editor > profiles**
   - Click **Insert Row**
   - Fill in:
     - `id`: (copy user ID from auth)
   - `email`: your-admin-email@example.com
   - `full_name`: System Administrator
   - Save

3. **Create Admin Role:**
   - Go to **Table Editor > user_roles**
   - Click **Insert Row**
   - Fill in:
     - `user_id`: (same as above)
     - `role`: admin
   - Save

---

## Changing Password

### From Login Page

1. Click **"Forgot Password?"** link
2. Enter your administrator email
3. Check email for reset link
4. Set new password
5. Login with new password

### From Supabase Console

1. Go to **Authentication > Users**
2. Find the administrator user
3. Click the user
4. Click **Reset Password**
5. Set new password

---

## Creating Additional Admin/Staff Accounts

### Create Another Admin Account

```bash
node scripts/setup-superadmin.js
```

Or manually via Supabase:

1. Create auth user in **Authentication > Users**
2. Create profile in **profiles** table
3. Assign role in **user_roles** table with role: `admin`

### Create Staff Account

1. Create auth user in **Authentication > Users**
2. Create profile in **profiles** table
3. Assign role in **user_roles** table with role: `staff`

---

## Super Admin Permissions

As a Super Admin, you can:

✅ **Clients** - Create, Read, Update, Delete all clients
✅ **Services** - View all services and manage catalog
✅ **Projects** - Create and manage all projects
✅ **Invoices** - Create, edit, and manage invoices
✅ **Payments** - Record and track payments
✅ **Expenses** - Track and manage business expenses
✅ **Reports** - View all business analytics
✅ **Settings** - Configure business information
✅ **Users** - Manage user roles (future feature)

---

## Troubleshooting Login Issues

### "Invalid credentials"
- ✓ Check the administrator email
- ✓ Verify the private password
- ✓ Verify user was created (check Supabase)

### "User not found"
- ✓ Run setup script: `node scripts/setup-superadmin.js`
- ✓ Or create manually via Supabase console

### "Connection refused"
- ✓ Check `.env.local` has Supabase URL
- ✓ Verify Supabase project is running
- ✓ Test: `ping your-project.supabase.co`

### "Database error"
- ✓ Verify migrations were applied
- ✓ Check tables exist in Supabase
- ✓ Run migrations again if needed

---

## Remember Me Feature

On login page:
- Check **"Remember me"** to store email
- Next time you visit, email is pre-filled
- You still need to enter password

---

## Security Notes

⚠️ **Important Security Reminders:**

1. **Change Default Password**
   - Use a strong private password stored outside the repository
   - Use: Settings > Change Password (future feature)
   - Or: Forgot Password on login page

2. **Keep Email Secure**
   - Admin email should be protected
   - Enable 2FA if available
   - Only share with trusted team members

3. **Do Not Share**
   - ❌ Never share password in chat/email
   - ❌ Never hardcode credentials
   - ❌ Never commit `.env.local` to git

4. **Backup Access**
   - Keep recovery codes safe
   - Set up backup authentication methods
   - Keep backup admin email

---

## Need Help?

- **Setup Script Issues**: `node scripts/setup-superadmin.js --help`
- **Supabase Issues**: Check Supabase Documentation
- **Login Problems**: See troubleshooting section above
- **Other Issues**: Check SETUP.md for full guide

---

**Version**: 1.0.0 | **Last Updated**: September 2024
