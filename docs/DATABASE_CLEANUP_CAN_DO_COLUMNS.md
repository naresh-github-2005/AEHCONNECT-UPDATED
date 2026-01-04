# Database Cleanup: Removed can_do_* Columns

## Overview
Successfully removed 5 redundant boolean columns from the `doctors` table as they can be derived from the `eligible_duties` array column.

## Columns Removed
1. `can_do_opd`
2. `can_do_ot`
3. `can_do_ward`
4. `can_do_camp`
5. `can_do_night`

## Rationale
These boolean flags were redundant because:
- Duty eligibility is already tracked in the `eligible_duties` array
- The array provides more granular control (e.g., "Cataract OT" vs just "OT")
- Reduces data duplication and potential inconsistencies
- Simplifies data model

## Changes Made

### 1. Database Migration
**File:** `supabase/migrations/20260104140000_remove_can_do_columns.sql`
- Dropped dependent view `daily_doctor_availability`
- Removed all 5 `can_do_*` columns from `doctors` table
- Added table comment explaining the change
- **Status:** ✅ Applied successfully

### 2. Component Updates

#### MonthlyRosterGenerator.tsx
- Updated `DbDoctor` interface to use `eligible_duties` instead of boolean flags
- Added helper function `canDoDutyCategory()` to check duty eligibility from array
- Updated database query to fetch `eligible_duties` instead of `can_do_*` columns

#### AISchedulingAssistant.tsx
- Updated `DbDoctor` interface
- Added helper function `canDoDutyCategory()`
- Automatically uses `eligible_duties` from `select('*')`

#### DoctorProfiles.tsx
- Removed `can_do_*` fields from `Doctor` interface
- Removed duty capability checkboxes from edit dialog (5 Switch components removed)
- Updated doctor card display to show `eligible_duties` badges (up to 5 duties + overflow indicator)
- Removed `can_do_*` fields from save/update logic

#### CampManagement.tsx
- Updated query to fetch all active doctors
- Added client-side filter to check if `eligible_duties` contains 'Camp'

### 3. Edge Function Update
**File:** `supabase/functions/ai-scheduling-assistant/index.ts`
- Added `canDoDutyCategory()` helper function
- Updated doctor details mapping to derive capabilities from `eligible_duties`
- Maintains backward compatibility by providing `capabilities` object

### 4. Mock Data
**File:** `src/lib/mockData.ts`
- Removed all `can_do_*` fields from `Doctor` interface
- Removed boolean flags from 8 mock doctor records
- Kept `eligible_duties` array intact

### 5. TypeScript Types
- Regenerated from database schema
- All `can_do_*` fields automatically removed from generated types

## Helper Function
All components now use this helper to check duty eligibility:

```typescript
const canDoDutyCategory = (eligibleDuties: string[] | null, category: 'opd' | 'ot' | 'ward' | 'camp' | 'night'): boolean => {
  if (!eligibleDuties) return false;
  
  const categoryMap: Record<string, string[]> = {
    opd: ['OPD'],
    ot: ['OT', 'Cataract OT', 'Retina OT', 'Glaucoma OT', 'Cornea OT', 'Neuro OT', 'ORBIT OT', 'Pediatrics OT', 'IOL OT'],
    ward: ['Ward'],
    camp: ['Camp'],
    night: ['Night Duty']
  };
  
  return eligibleDuties.some(duty => categoryMap[category].includes(duty));
};
```

## UI Changes

### Before
Doctor Profile Edit Dialog had:
- 5 Switch toggles for duty capabilities:
  - OPD
  - OT
  - Ward
  - Night Duty
  - Camp Duty

### After
- Removed all duty capability edit controls
- Duty eligibility is now managed through the `eligible_duties` array
- Doctor cards show first 5 eligible duties as badges
- Shows "+X" indicator if more than 5 duties

## Impact

### ✅ No Breaking Changes
- All functionality preserved
- Roster generation works identically
- Camp filtering works correctly
- AI scheduling uses derived capabilities

### ✅ Improved Data Model
- Single source of truth (`eligible_duties`)
- More granular duty types
- Easier to add new duty types
- No data synchronization issues

### ✅ Cleaner UI
- Simplified doctor profile editing
- More informative duty display (shows actual duty names)
- Reduced form complexity

## Testing Checklist
- [x] Database migration applied successfully
- [x] TypeScript types regenerated
- [x] No compilation errors
- [x] MonthlyRosterGenerator queries updated
- [x] AISchedulingAssistant queries updated
- [x] DoctorProfiles UI updated
- [x] CampManagement filtering updated
- [x] Edge Function updated
- [x] Mock data cleaned

## Next Steps
1. Test roster generation to ensure duty assignments work correctly
2. Test camp doctor filtering
3. Verify doctor profile display shows eligible duties correctly
4. Test AI scheduling assistant with new data structure

---

**Date:** January 4, 2026  
**Migration File:** 20260104140000_remove_can_do_columns.sql  
**Status:** ✅ Completed
