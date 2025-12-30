# Migrate to Your Own Supabase Project

This guide helps you migrate from Lovable Cloud to your own Supabase instance.

---

## Step 1: Create New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **New Project**
3. Fill in:
   - **Name**: `dutycare-connect` (or your choice)
   - **Database Password**: Save this securely!
   - **Region**: Choose closest to your users (e.g., `Mumbai` for India)
4. Wait for project to provision (~2 minutes)

---

## Step 2: Get Your New Credentials

From Supabase Dashboard → **Settings** → **API**:

| Key | Where to find |
|-----|---------------|
| `Project URL` | Under "Project URL" |
| `anon/public key` | Under "Project API keys" → `anon` `public` |
| `service_role key` | Under "Project API keys" → `service_role` (keep secret!) |

---

## Step 3: Run Database Migrations

### Option A: Using Supabase CLI (Recommended)

```powershell
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your NEW project (replace with your project ref)
cd "d:\ACEi App\dutycare-connect"
supabase link --project-ref YOUR_NEW_PROJECT_REF

# Push all migrations
supabase db push
```

### Option B: Manual SQL Execution

1. Go to Supabase Dashboard → **SQL Editor**
2. Run each migration file in order from `supabase/migrations/`:

```
20251223063219_eb31b3ca-13bd-4307-be71-d079f43d8932.sql  (base schema)
20251223063240_cf76fc6c-6afb-4825-a8c2-1fb8f5bfee4d.sql  (trigger fix)
20251223083257_1d0d423f-529d-486f-ae2d-ac9cc4f38002.sql  (doctors+camps)
20251223085252_32e138e7-0d48-495c-92b3-d40d905d29a2.sql  (chat)
20251223085841_3154d4d3-6f22-4c3e-8b5d-2641b9451347.sql  (chat policy)
20251223164204_209b9152-4a63-4313-b877-aa93d80f6bac.sql  (designation)
20251223165939_5cadafc0-6ae5-4660-a9bf-c02114f026d3.sql  (public access)
20251223170600_60d9dc38-26b5-4577-bb02-8ee0caaeb5b0.sql  (RLS tightening)
20251223171253_2da53711-b27c-4c2f-bbdc-ad889ef73717.sql  (swap requests)
20251224133102_303b3907-5cfe-4937-976f-7b1f84a426d2.sql  (attendance)
20251226030730_98b14960-be35-4ee3-8f96-aac9f0faf660.sql  (classes)
```

---

## Step 4: Deploy Edge Functions

```powershell
# Deploy AI scheduling assistant
supabase functions deploy ai-scheduling-assistant --project-ref YOUR_NEW_PROJECT_REF

# Deploy demo user seeder
supabase functions deploy seed-demo-users --project-ref YOUR_NEW_PROJECT_REF
```

---

## Step 5: Set Edge Function Secrets

In Supabase Dashboard → **Edge Functions** → **Secrets**, add:

| Secret Name | Value |
|-------------|-------|
| `LOVABLE_API_KEY` | Your Lovable API key (for AI features) |

Or via CLI:
```powershell
supabase secrets set LOVABLE_API_KEY=your_api_key --project-ref YOUR_NEW_PROJECT_REF
```

> **Note**: If you don't have a Lovable API key, the AI scheduling will fail gracefully. You can:
> - Get one from Lovable
> - Replace with OpenAI/Gemini API directly (requires code change)
> - Disable AI features for hackathon demo

---

## Step 6: Update Frontend Environment

Update your `.env` file:

```env
VITE_SUPABASE_PROJECT_ID="your-new-project-ref"
VITE_SUPABASE_URL="https://your-new-project-ref.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-new-anon-key"
```

---

## Step 7: Seed Demo Data

### Create Demo Users
```powershell
# Call the seed function
curl -X POST "https://YOUR_NEW_PROJECT_REF.supabase.co/functions/v1/seed-demo-users"
```

### Seed 108 Doctors (Optional)
If you have doctor seed data, run it via SQL Editor or create a seed script.

---

## Step 8: Verify Migration

1. Run the app locally:
   ```powershell
   npm run dev
   ```

2. Test:
   - [ ] Login works (admin@hospital.com / admin123)
   - [ ] Doctors list loads
   - [ ] Duty assignments display
   - [ ] Real-time updates work
   - [ ] AI scheduling (if API key configured)

---

## Rollback Plan

If migration fails, simply revert `.env` to Lovable Cloud credentials:

```env
VITE_SUPABASE_PROJECT_ID="ljwkylnzurldtsyrsvxe"
VITE_SUPABASE_URL="https://ljwkylnzurldtsyrsvxe.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJI..."
```

---

## Cost Comparison

| Feature | Lovable Cloud | Supabase Free | Supabase Pro |
|---------|---------------|---------------|--------------|
| Database | 500MB | 500MB | 8GB |
| Auth users | Unlimited | 50,000 MAU | Unlimited |
| Edge Functions | Included | 500K/month | 2M/month |
| Realtime | Included | 200 concurrent | Unlimited |
| **Price** | Free (with Lovable) | **Free** | $25/month |

**For hackathon**: Supabase Free tier is more than enough!
