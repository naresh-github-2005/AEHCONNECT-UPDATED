# Admin Login Setup Guide

## Problem
When you try to login with `admin@hospital.com`, the user is not redirected to the Admin Dashboard. This happens because the admin role is not set in the database.

## How the System Works

1. **User Signs In** → Email/Password verified by Supabase Auth
2. **System Checks Role** → Looks in `user_roles` table for user's role
3. **Redirect Based on Role**:
   - If `role = 'admin'` → Goes to Admin Dashboard
   - If `role = 'doctor'` (or no role) → Goes to Doctor Dashboard

## The Issue
The `admin@hospital.com` user exists in Supabase Auth, but there's **NO entry in the `user_roles` table** saying they are an admin!

## Solution: Add Admin Role

### Step 1: Sign Up the Admin User First

Before setting the role, the user must exist in Supabase:

1. Go to your app: http://localhost:8081
2. Click **"Create Account"** (sign up)
3. Enter:
   - Email: `admin@hospital.com`
   - Password: `admin123`
4. Create the account

### Step 2: Add Admin Role in Database

Go to Supabase SQL Editor and run this:

```sql
-- Add admin role to admin@hospital.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin@hospital.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify it worked
SELECT u.email, ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@hospital.com';
```

### Step 3: Sign In and Test

1. Go back to login page
2. Click **"Admin Demo"** button (auto-fills credentials)
3. Click **"Sign In"**
4. You should now be redirected to **Admin Dashboard**!

---

## Setup All Demo Users

If you want to set up all 4 demo users at once:

### 1. Sign up all users first:

Create accounts for:
- `admin@hospital.com` / `admin123`
- `doctor@hospital.com` / `doctor123`
- `fellow@hospital.com` / `fellow123`
- `pg@hospital.com` / `pg123`

### 2. Run this SQL to assign roles:

```sql
-- Add admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin@hospital.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Add doctor role to other demo users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'doctor'::app_role
FROM auth.users
WHERE email IN ('doctor@hospital.com', 'fellow@hospital.com', 'pg@hospital.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify all roles
SELECT u.email, ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email IN ('admin@hospital.com', 'doctor@hospital.com', 'fellow@hospital.com', 'pg@hospital.com')
ORDER BY u.email;
```

---

## Alternative: Use Supabase Dashboard (Manual)

If SQL Editor doesn't work:

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Find the user with email `admin@hospital.com`
3. Copy their **UUID** (the long ID like `abc123-def456-...`)
4. Go to **Table Editor** → **user_roles** table
5. Click **"Insert"** → **"Insert row"**
6. Fill in:
   - `user_id`: Paste the UUID
   - `role`: Select **admin**
7. Click **Save**

---

## Troubleshooting

### "User still goes to Doctor Dashboard"
- Clear browser cache and cookies
- Sign out completely
- Close and reopen browser
- Sign in again

### "SQL Error: user does not exist"
- Make sure you created the account first (Step 1)
- Check in Supabase → Authentication → Users
- The user must exist before you can assign a role

### "Cannot insert - policy violation"
You need to either:
- Run the SQL as the Postgres admin (use SQL Editor in Supabase Dashboard)
- Or temporarily disable RLS: `ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;` (not recommended for production)

---

## Quick Test Script

Run this to see current user roles:

```sql
SELECT 
  u.email,
  ur.role,
  CASE 
    WHEN ur.role IS NULL THEN '❌ No role assigned'
    WHEN ur.role = 'admin' THEN '✅ Admin role assigned'
    ELSE '✅ Doctor role assigned'
  END as status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email LIKE '%@hospital.com'
ORDER BY u.email;
```

---

## Summary

✅ **Root Cause**: Admin user exists but has no role in `user_roles` table

✅ **Solution**: 
1. Create the user account (sign up)
2. Insert admin role in `user_roles` table
3. Sign in → redirects to Admin Dashboard

✅ **Files Created**:
- `FIX_ADMIN_ROLE.sql` - SQL script to run
- `ADMIN_SETUP_GUIDE.md` - This guide

---

**Need help?** Run the SQL script in `FIX_ADMIN_ROLE.sql` after signing up the admin user!
