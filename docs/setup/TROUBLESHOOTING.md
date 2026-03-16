# Troubleshooting Guide - Supabase Migration

## Common Issues & Solutions

### ❌ Issue 1: "relation already exists" Error

**Symptom:**
```
ERROR: relation "profiles" already exists
```

**Cause:** Tables already exist in your database

**Solutions:**

**Option A: Fresh Start (Recommended)**
1. Go to Supabase Dashboard > Database > Tables
2. Manually delete all tables
3. Re-run the COMBINED_MIGRATIONS.sql

**Option B: Drop All Tables First**
Run this SQL before running migrations:
```sql
-- WARNING: This will delete ALL tables and data!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

**Option C: Skip Existing Tables**
- Edit COMBINED_MIGRATIONS.sql
- Add `IF NOT EXISTS` to CREATE TABLE statements
- Example: `CREATE TABLE IF NOT EXISTS profiles (...)`

---

### ❌ Issue 2: Permission Denied Errors

**Symptom:**
```
ERROR: permission denied for schema public
```

**Cause:** User doesn't have proper permissions

**Solution:**
1. Make sure you're using the Service Role key (not anon key)
2. Check you're logged into correct Supabase account
3. Verify you're the project owner/admin

---

### ❌ Issue 3: Foreign Key Constraint Errors

**Symptom:**
```
ERROR: insert or update on table violates foreign key constraint
```

**Cause:** Migrations run out of order

**Solution:**
- Do NOT split the COMBINED_MIGRATIONS.sql file
- Run it as ONE complete execution
- The file is ordered chronologically - keep that order

---

### ❌ Issue 4: Timeout Errors

**Symptom:**
```
ERROR: Query timeout exceeded
```

**Cause:** Too much SQL to execute at once

**Solution:**

**Option A: Increase timeout**
1. In SQL Editor, click Settings icon
2. Increase statement timeout
3. Try again

**Option B: Run in batches**
Split COMBINED_MIGRATIONS.sql into 3 parts:
1. Migrations from Dec 23-26
2. Migrations from Dec 31 - Jan 2
3. Migrations from Jan 3-4

Run each batch separately.

---

### ❌ Issue 5: Function Already Exists

**Symptom:**
```
ERROR: function "function_name" already exists
```

**Cause:** Function was created previously

**Solution:**
Add `OR REPLACE` to function definitions:
```sql
CREATE OR REPLACE FUNCTION function_name()
```

---

### ❌ Issue 6: Syntax Errors

**Symptom:**
```
ERROR: syntax error at or near "..."
```

**Cause:** Copy-paste issues or file encoding

**Solution:**
1. Make sure you copied the ENTIRE file content
2. Check for missing semicolons
3. Verify file encoding is UTF-8
4. Don't manually edit migration files

---

### ❌ Issue 7: RLS Policy Errors

**Symptom:**
```
ERROR: RLS policy already exists
```

**Cause:** Policies created in previous run

**Solution:**
Drop existing policies first:
```sql
-- Replace 'table_name' and 'policy_name' with actual values
DROP POLICY IF EXISTS policy_name ON table_name;
```

Or modify migration to use:
```sql
CREATE POLICY IF NOT EXISTS policy_name ...
```

---

### ❌ Issue 8: Connection Errors

**Symptom:**
```
Could not connect to database
```

**Cause:** Wrong credentials or project paused

**Solution:**
1. Verify .env has correct VITE_SUPABASE_URL
2. Check project is not paused in Supabase dashboard
3. Verify internet connection
4. Check Supabase status page

---

### ❌ Issue 9: "Column does not exist" in Seed Data

**Symptom:**
```
ERROR: column "column_name" of relation "table_name" does not exist
```

**Cause:** Migrations not run before seed data

**Solution:**
1. FIRST run COMBINED_MIGRATIONS.sql completely
2. THEN run SEED_DATA.sql
3. Don't run them together

---

### ❌ Issue 10: Application Can't Connect After Migration

**Symptom:**
App shows connection errors after migrations

**Cause:** Wrong environment variables

**Solution:**

1. **Check .env file:**
```env
VITE_SUPABASE_PROJECT_ID="uwoddeszgeewevrydmoc"
VITE_SUPABASE_URL="https://uwoddeszgeewevrydmoc.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key-here"
```

2. **Get the correct Anon Key:**
   - Go to Supabase Dashboard
   - Project Settings > API
   - Copy "anon" / "public" key
   - Update .env file

3. **Restart dev server:**
```powershell
npm run dev
```

---

## Verification Checklist

After migrations, verify:

### ✅ Tables Created
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Should return 20+ tables.

### ✅ RLS Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Most tables should have `rowsecurity = true`.

### ✅ Policies Created
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Should return multiple policies.

### ✅ Functions Created
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

Should return several functions.

---

## Getting More Help

### Option 1: Check Supabase Logs
1. Go to Supabase Dashboard
2. Click "Logs" in sidebar
3. Select "Postgres Logs"
4. Look for error details

### Option 2: Check Migration File
1. Note which line number failed
2. Open COMBINED_MIGRATIONS.sql
3. Go to that line
4. Look for the migration comment above it
5. Check original file in supabase/migrations/

### Option 3: Manual Table Creation
If a specific table fails:
1. Find its CREATE TABLE statement
2. Run it separately in SQL Editor
3. Debug the specific error
4. Fix and re-run

### Option 4: Start Fresh
```sql
-- Nuclear option - deletes everything
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```
Then re-run COMBINED_MIGRATIONS.sql

---

## Prevention Tips

### Before Running Migrations:
- [ ] Backup any existing data
- [ ] Verify you're in correct project
- [ ] Check you have admin permissions
- [ ] Read through the migration file first
- [ ] Test on a development project first (if possible)

### During Migrations:
- [ ] Don't interrupt the execution
- [ ] Watch for errors in real-time
- [ ] Note the line number if it fails
- [ ] Don't close browser tab until complete

### After Migrations:
- [ ] Verify tables in Table Editor
- [ ] Test app connection
- [ ] Check RLS policies
- [ ] Test user signup/login
- [ ] Verify data queries work

---

## Emergency Rollback

If everything goes wrong:

1. **Export any important data first** (if any exists)

2. **Reset the database:**
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

3. **Re-run migrations from scratch:**
   - Run COMBINED_MIGRATIONS.sql
   - Run SEED_DATA.sql
   - Test application

---

## Still Stuck?

1. Read SUPABASE_SETUP_GUIDE.md for detailed steps
2. Check MIGRATION_OVERVIEW.md to understand the schema
3. Review individual migration files in supabase/migrations/
4. Check Supabase documentation: https://supabase.com/docs
5. Verify .env configuration

---

**Remember:** The migrations are ordered chronologically and have dependencies. Always run them in order as provided in COMBINED_MIGRATIONS.sql.
