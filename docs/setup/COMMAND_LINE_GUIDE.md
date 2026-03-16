# ✅ COMMAND LINE MIGRATION - COMPLETE GUIDE

## What I Just Did For You

I opened two things:
1. **Supabase SQL Editor** in your browser
2. **COMBINED_MIGRATIONS.sql** in VS Code

## What You Need To Do Now (Simple 4 Steps)

### STEP 1: In VS Code
- Press `Ctrl+A` to select all
- Press `Ctrl+C` to copy

### STEP 2: In Browser (Supabase SQL Editor)
- Press `Ctrl+V` to paste
- Click the **RUN** button (or press `Ctrl+Enter`)

### STEP 3: Wait
- It will take 30-60 seconds to execute
- Watch for "Success" message or errors

### STEP 4: Verify
- Click "Table Editor" tab in Supabase
- You should see 20+ tables created

---

## Scripts I Created For You

You can run these anytime to open the files again:

### PowerShell (Recommended)
```powershell
.\RUN-NOW.ps1
```

### Command Prompt / Batch
```cmd
RUN-MIGRATIONS.bat
```

Both do the same thing:
- Open Supabase SQL Editor
- Open migration file in VS Code

---

## After Migrations Complete

### Test Your Application
```powershell
npm run dev
```

Then open http://localhost:8081 (or whatever port it shows)

### Verify Tables
Go to: https://supabase.com/dashboard/project/uwoddeszgeewevrydmoc/editor

You should see tables like:
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
- And more...

---

## If You Get Errors

### Common Issues

**Error: "relation already exists"**
- Tables might already be there
- Check Table Editor first
- If needed, drop tables and re-run

**Error: "permission denied"**
- Make sure you're logged into correct Supabase account
- Verify you have admin access

**Error: "syntax error"**
- Make sure you copied the ENTIRE file
- Don't split or modify the SQL

### Get Help
- Read: `TROUBLESHOOTING.md`
- Check: `SUPABASE_SETUP_GUIDE.md`

---

## Why We Can't Run Directly From Command Line

The Supabase CLI cannot be installed via npm globally (it's not supported).
Other methods like psql require database connection strings.

The **EASIEST** way is:
1. Copy SQL from file
2. Paste in Supabase SQL Editor
3. Click Run

This is what you're doing now! ✅

---

## Quick Reference

### Files Location
All files are in: `D:\aehconnect-new\`

### Your Supabase Project
- **Project ID**: uwoddeszgeewevrydmoc
- **URL**: https://uwoddeszgeewevrydmoc.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/uwoddeszgeewevrydmoc

### Main Files
- `COMBINED_MIGRATIONS.sql` - Run this in SQL Editor
- `SEED_DATA.sql` - Optional sample data
- `RUN-NOW.ps1` - Opens files for you
- `RUN-MIGRATIONS.bat` - Same but for CMD

---

## Summary

✅ I opened Supabase SQL Editor
✅ I opened migration file in VS Code
✅ Created scripts to reopen anytime

Now just:
1. Copy from VS Code (Ctrl+A, Ctrl+C)
2. Paste in SQL Editor (Ctrl+V)
3. Click RUN
4. Wait and verify

**That's it! Good luck! 🚀**
