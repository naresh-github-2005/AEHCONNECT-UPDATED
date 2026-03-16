# 🔧 months_since_joining Fix - Technical Details

## ❌ The Problem

PostgreSQL error when running `ADD_ROSTER_SYSTEM.sql`:

```
ERROR: 42P17: generation expression is not immutable
```

**Why it happened:**
- Original code tried to use `GENERATED ALWAYS AS ... STORED` column
- Used `CURRENT_DATE` in the calculation
- PostgreSQL requires STORED generated columns to be **immutable** (same value forever)
- `CURRENT_DATE` changes every day, so it's **not immutable**

---

## ✅ The Solution

Changed from STORED generated column to regular column with automatic updates.

### **What Was Changed:**

#### **Before (❌ Doesn't Work):**
```sql
ALTER TABLE public.doctors 
ADD COLUMN months_since_joining INTEGER GENERATED ALWAYS AS (
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, joining_date)) * 12 + 
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, joining_date))
) STORED;
```

#### **After (✅ Works):**
```sql
-- 1. Regular column (not generated)
ALTER TABLE public.doctors 
  ADD COLUMN IF NOT EXISTS months_since_joining INTEGER DEFAULT 0;

-- 2. Function to calculate it
CREATE OR REPLACE FUNCTION public.calculate_months_since_joining(p_joining_date DATE)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT CASE 
    WHEN p_joining_date IS NULL THEN 0
    ELSE EXTRACT(YEAR FROM AGE(CURRENT_DATE, p_joining_date))::INTEGER * 12 + 
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, p_joining_date))::INTEGER
  END;
$$;

-- 3. Trigger to auto-update
CREATE OR REPLACE FUNCTION public.update_months_since_joining()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.months_since_joining := public.calculate_months_since_joining(NEW.joining_date);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_months_since_joining
  BEFORE INSERT OR UPDATE OF joining_date ON public.doctors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_months_since_joining();

-- 4. View for easy querying with current calculation
CREATE OR REPLACE VIEW public.doctors_with_months AS
SELECT 
  d.*,
  public.calculate_months_since_joining(d.joining_date) as calculated_months_since_joining
FROM public.doctors d;
```

---

## 🎯 How It Works Now

### **Automatic Updates:**
- When you INSERT a new doctor → trigger calculates and sets `months_since_joining`
- When you UPDATE `joining_date` → trigger recalculates and updates `months_since_joining`
- Column value is stored in the database (fast queries)

### **Always Current Calculation:**
If you need the CURRENT value (today's calculation), use the view:

```sql
-- Option 1: Use stored value (from last update)
SELECT name, months_since_joining FROM doctors;

-- Option 2: Get current calculation (most accurate)
SELECT name, calculated_months_since_joining FROM doctors_with_months;

-- Option 3: Calculate on-the-fly for a specific doctor
SELECT calculate_months_since_joining(joining_date) FROM doctors WHERE id = '...';
```

### **Validation Function Updated:**
The Fellow 3-month restriction check now uses the function:

```sql
-- OLD (using stored column):
IF v_doctor.months_since_joining < 3 THEN...

-- NEW (using function for current value):
IF public.calculate_months_since_joining(v_doctor.joining_date) < 3 THEN...
```

This ensures we always check against TODAY's date, not the last update.

---

## 🔄 When Values Get Updated

| Event | months_since_joining Column | How It Updates |
|-------|----------------------------|----------------|
| **INSERT doctor** | Calculated & stored | Trigger fires automatically |
| **UPDATE joining_date** | Recalculated & updated | Trigger fires automatically |
| **Regular SELECT** | Uses stored value | Fast (no calculation) |
| **View SELECT** | Calculates fresh value | Current (uses today's date) |
| **Validation check** | Uses function | Always current |

---

## 📊 Usage Examples

### **Add New Doctor (Auto-Calculates):**
```sql
INSERT INTO doctors (name, joining_date, designation, specialization_type)
VALUES ('Dr. New Fellow', '2025-11-01', 'FELLOW', 'CORNEA');

-- months_since_joining is automatically calculated and stored
-- As of Jan 2026: (2026-2025)*12 + (1-11) = 2 months
```

### **Check Fellow 3-Month Restriction:**
```sql
-- This happens automatically in validation trigger
-- Uses calculate_months_since_joining() for current value
```

### **Update Joining Date:**
```sql
UPDATE doctors 
SET joining_date = '2023-01-15' 
WHERE id = '...';

-- months_since_joining automatically recalculated
-- As of Jan 2026: (2026-2023)*12 + (1-1) = 36 months
```

### **Query with Current Calculation:**
```sql
-- Use view for most accurate "right now" value
SELECT 
  name,
  joining_date,
  months_since_joining as stored_value,
  calculated_months_since_joining as current_value
FROM doctors_with_months
WHERE designation = 'FELLOW';
```

---

## 🎯 Why This Solution is Better

| Aspect | Old (STORED) | New (Trigger + View) |
|--------|--------------|---------------------|
| **Works?** | ❌ Error | ✅ Yes |
| **Performance** | ⚡ Fast (precomputed) | ⚡ Fast (stored + trigger) |
| **Accuracy** | ❓ Stale (never updates) | ✅ Updates on INSERT/UPDATE |
| **Current Value** | ❌ No | ✅ Yes (via view or function) |
| **Validation** | ❌ Uses old value | ✅ Uses current value |

---

## ✅ Verification

After running the fixed SQL, verify it works:

```sql
-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'calculate_months_since_joining';

-- Check trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_update_months_since_joining';

-- Check view exists
SELECT viewname FROM pg_views WHERE viewname = 'doctors_with_months';

-- Test calculation
SELECT calculate_months_since_joining('2023-01-15'::DATE);
-- Should return 36 (as of Jan 2026)

-- Test view
SELECT * FROM doctors_with_months LIMIT 1;
```

---

## 🚀 What You Need to Do

1. **Re-run the SQL:**
   ```sql
   -- Execute in Supabase SQL Editor
   -- Copy and paste entire ADD_ROSTER_SYSTEM.sql
   ```

2. **Update existing doctors:**
   ```sql
   -- One-time update for existing doctors
   UPDATE doctors 
   SET months_since_joining = calculate_months_since_joining(joining_date)
   WHERE joining_date IS NOT NULL;
   ```

3. **Test it:**
   ```sql
   -- Try inserting a new doctor
   INSERT INTO doctors (name, joining_date, designation)
   VALUES ('Test Fellow', '2025-11-01', 'FELLOW')
   RETURNING months_since_joining;
   -- Should return 2
   ```

---

## 📚 Files Updated

- ✅ `ADD_ROSTER_SYSTEM.sql` - Quick-add script (fixed)
- ✅ `MONTHLY_ROSTER_MIGRATION.sql` - Full migration (fixed)

Both files now use the same solution and will work without errors.

---

**Status: ✅ FIXED - Ready to execute!**
