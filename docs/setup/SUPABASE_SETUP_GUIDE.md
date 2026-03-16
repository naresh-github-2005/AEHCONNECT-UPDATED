# Supabase Database Setup Guide

## Overview
This guide will help you set up all tables and data in your new Supabase instance.

## Your New Supabase Instance
- **Project ID**: uwoddeszgeewevrydmoc
- **URL**: https://uwoddeszgeewevrydmoc.supabase.co

## Files Created
I've created two consolidated SQL files for you:

1. **COMBINED_MIGRATIONS.sql** (157 KB) - Contains all 36 migration files in chronological order
2. **SEED_DATA.sql** (314 bytes) - Contains sample duty data

## Setup Steps

### Method 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**
   - Go to https://supabase.com/dashboard/project/uwoddeszgeewevrydmoc
   - Click on "SQL Editor" in the left sidebar

2. **Run the Combined Migrations**
   - Click "New Query"
   - Open the file `COMBINED_MIGRATIONS.sql` from your project root
   - Copy the entire content
   - Paste it into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)
   - Wait for execution to complete (this may take 30-60 seconds)

3. **Run the Seed Data (Optional)**
   - After migrations complete successfully
   - Click "New Query" again
   - Open the file `SEED_DATA.sql`
   - Copy and paste the content
   - Click "Run"

4. **Verify Tables Were Created**
   - Click on "Table Editor" in the left sidebar
   - You should see all tables including:
     - profiles
     - doctor_profiles
     - duty_assignments
     - leave_requests
     - attendance
     - surgery_logs
     - chat_channels
     - chat_messages
     - notes
     - publications
     - test_marks
     - conference_requests
     - And many more...

### Method 2: Using Supabase CLI (If you install it)

If you want to use the CLI in the future:

```powershell
# Install Supabase CLI
scoop install supabase

# Or using npm
npm install -g supabase

# Link to your project
supabase link --project-ref uwoddeszgeewevrydmoc

# Push all migrations
supabase db push
```

## Migration Files Included (36 total)

The combined file includes all migrations from:
- December 23, 2025 to January 4, 2026
- Creates all core tables, functions, triggers, and policies
- Sets up RLS (Row Level Security) policies
- Creates sample data and seed data

### Key Features Created:
- ✅ Authentication and user profiles
- ✅ Doctor profiles and specializations
- ✅ Duty assignment and roster management
- ✅ Leave request system
- ✅ Attendance tracking
- ✅ Surgery logs
- ✅ Chat/messaging system
- ✅ Notes and documentation
- ✅ Publications tracking
- ✅ Test marks management
- ✅ Conference requests
- ✅ Academic classes and materials
- ✅ Camp management

## Troubleshooting

### If you get errors during execution:

1. **"relation already exists" errors**
   - Some tables might already exist
   - You can either:
     - Drop the existing tables first, OR
     - Skip those specific CREATE TABLE statements

2. **Permission errors**
   - Make sure you're logged into the correct Supabase account
   - Verify you have admin access to the project

3. **Timeout errors**
   - The combined file is large
   - Try running migrations in smaller batches:
     - First 10 migrations
     - Next 10 migrations
     - And so on...

4. **Foreign key constraint errors**
   - Make sure you run migrations in order
   - Don't skip any migrations

## After Setup

Once all migrations are complete:

1. **Test the connection**
   - Go back to your app
   - Run: `npm run dev`
   - Try logging in or creating an account

2. **Verify in Supabase Dashboard**
   - Check "Table Editor" to see all tables
   - Check "Authentication" to see if users can sign up
   - Check "Database" > "Roles" for proper permissions

3. **Check RLS Policies**
   - Go to each table in Table Editor
   - Click on the table
   - Check the "Policies" tab
   - Ensure RLS policies are enabled and configured

## Need Help?

If you encounter any issues:
1. Check the error message in the SQL Editor
2. Note which migration file is causing the issue
3. You can manually review that specific migration file in `supabase/migrations/`

## Additional SQL Files

If you need to add more sample duties later:
- `docs/ADD_SAMPLE_DUTIES.sql` - Adds more duty types
- `docs/SEED_SAMPLE_DUTIES.sql` - Adds sample duty assignments

These are already included in `SEED_DATA.sql`.
