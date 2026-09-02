/**
 * Supabase Setup Script
 * 
 * This script seeds the super admin user to your Supabase project.
 * 
 * IMPORTANT: Run this AFTER applying database migrations
 * 
 * Requirements:
 * 1. Set up environment variables:
 *    - VITE_SUPABASE_URL
 *    - VITE_SUPABASE_PUBLISHABLE_KEY
 *    - SUPABASE_SERVICE_ROLE_KEY (from Supabase settings)
 * 
 * 2. Apply migrations to your database first:
 *    - Go to Supabase SQL Editor
 *    - Run the SQL from: drizzle/migrations/0000_bargazal_bms_core.sql
 * 
 * 3. Run this script:
 *    node scripts/setup-superadmin.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
const ADMIN_FULL_NAME = process.env.SUPER_ADMIN_FULL_NAME || 'System Administrator';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure .env.local has:');
  console.error('  - VITE_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (from Supabase Settings > API)');
  console.error('  - SUPER_ADMIN_EMAIL');
  console.error('  - SUPER_ADMIN_PASSWORD');
  process.exit(1);
}

// Import Supabase Admin SDK
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupSuperAdmin() {
  try {
    console.log('🔧 Setting up Super Admin Account...\n');

    const email = ADMIN_EMAIL;
    const password = ADMIN_PASSWORD;
    const fullName = ADMIN_FULL_NAME;

    // Step 1: Create auth user
    console.log('📝 Step 1: Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log('⚠️  User already exists. Updating password...');
        
        // Get the user first
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        
        const user = users.users.find(u => u.email === email);
        if (!user) throw new Error('User not found');

        // Update password
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
          password,
        });
        if (updateError) throw updateError;
        
        console.log(`✅ Password updated for ${email}\n`);
      } else {
        throw authError;
      }
    } else {
      console.log(`✅ Auth user created: ${authData.user.id}\n`);
    }

    // Step 2: Verify profile and role
    console.log('👤 Step 2: Verifying profile...');
    
    // Get user ID
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users.users.find(u => u.email === email);
    
    if (!user) throw new Error('Could not find created user');

    // Check if profile exists
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id);

    if (profiles && profiles.length === 0) {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          email,
          full_name: fullName,
        }]);
      if (profileError) throw profileError;
      console.log('✅ Profile created');
    } else {
      console.log('✅ Profile exists');
    }

    // Step 3: Verify admin role
    console.log('🛡️  Step 3: Verifying admin role...');
    
    const { data: roles } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (roles && roles.length === 0) {
      // Create admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: user.id,
          role: 'admin',
        }]);
      if (roleError) throw roleError;
      console.log('✅ Admin role assigned');
    } else {
      console.log('✅ Admin role verified');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✨ Super Admin Setup Complete!\n');
    console.log('Login Credentials:');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log('\n' + '='.repeat(50));
    console.log('\n📋 Next Steps:');
    console.log('1. Start the app: npm run dev');
    console.log('2. Go to http://localhost:5173/login');
    console.log('3. Login with the credentials above');
    console.log('4. You now have full admin access\n');

  } catch (error) {
    console.error('❌ Error setting up super admin:', error.message);
    process.exit(1);
  }
}

setupSuperAdmin();
