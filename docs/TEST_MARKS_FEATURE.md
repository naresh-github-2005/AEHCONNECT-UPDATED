# Test Marks Management Feature

## Overview
A complete test marks management system for Fellows and PG doctors in the hospital duty roster application.

## Features Implemented

### 1. Database Schema
**File**: `supabase/migrations/20260104130000_create_test_marks_table.sql`

Created `test_marks` table with:
- Test details (name, date, month, year)
- Marks (obtained, total)
- Doctor reference
- Remarks
- Automatic timestamps
- Row Level Security (RLS) policies
  - Admins can manage all test marks
  - Doctors can view their own test marks

### 2. Admin Dashboard - Test Marks Management
**Route**: `/test-marks`
**File**: `src/pages/TestMarks.tsx`
**Access**: Admin only

Features:
- **Filter by Designation**: Toggle between Fellow and PG doctors
- **Add Test Marks**: 
  - Select doctor from filtered list
  - Enter test name
  - Choose month and year
  - Set test date
  - Input marks (obtained/total)
  - Auto-calculated percentile display
  - Optional remarks
- **View Test Records**: 
  - Comprehensive table showing all test marks
  - Color-coded percentile (Green ≥75%, Yellow ≥50%, Red <50%)
  - Month/year badges
  - Department information
- **Edit Test Marks**: Modify existing entries
- **Delete Test Marks**: Remove records with confirmation

### 3. Doctor View - My Test Marks
**Route**: `/my-test-marks`
**File**: `src/pages/MyTestMarks.tsx`
**Access**: Fellows and PG doctors only

Features:
- **Period Filter**: Select month and year to view specific period
- **Monthly Average Card**:
  - Average percentile display
  - Performance badge (Excellent/Good/Average/Needs Improvement)
  - Progress bar with color coding
  - Test count
- **Test Records Cards**:
  - Individual test cards with details
  - Test name, date, and marks
  - Large percentile display
  - Progress bars showing performance
  - Remarks if available
- **All-Time Summary**:
  - Total tests count
  - Overall average percentile
  - Best score achieved

### 4. UI Components
**Enhanced**: `src/components/ui/progress.tsx`
- Added `indicatorClassName` prop for custom progress bar colors
- Supports dynamic color based on performance

### 5. Navigation & Routing
**Updated**: `src/App.tsx`
- Added routes for `/test-marks` (admin)
- Added routes for `/my-test-marks` (fellows/PG)

**Updated**: `src/components/layout/AppHeader.tsx`
- Added "Test Marks" menu item in kebab menu (admin)
- Added "My Test Marks" menu item (fellows/PG only)
- Icon: ClipboardCheck

**Updated**: `src/contexts/AuthContext.tsx`
- Added `designation` field to AuthUser interface
- Fetches doctor designation during authentication

## Color Coding System

### Percentile Ranges
- **Green** (≥75%): Excellent/Good performance
- **Yellow** (≥50%): Average performance  
- **Red** (<50%): Needs improvement

### Performance Labels
- **Excellent**: ≥90%
- **Good**: ≥75%
- **Average**: ≥50%
- **Needs Improvement**: <50%

## Database Policies

### Admin Access
- Can INSERT, UPDATE, DELETE, and SELECT all test marks
- Based on `user_roles` table role check

### Doctor Access
- Can only SELECT their own test marks
- Filtered by matching `doctor_id` with their profile

## Usage Flow

### Admin Workflow
1. Click kebab menu (⋮) in top-right corner
2. Select "Test Marks"
3. Choose designation filter (Fellow or PG)
4. Click "Add Test Marks" button
5. Fill in test details and marks
6. View auto-calculated percentile
7. Submit to save
8. View, edit, or delete existing records

### Doctor Workflow (Fellows/PG)
1. Click kebab menu (⋮) in top-right corner
2. Select "My Test Marks"
3. Choose month and year to view
4. See monthly average performance
5. Scroll through individual test cards
6. View all-time statistics at bottom

## Technical Details

### Database Validations
- `marks_obtained` ≥ 0
- `total_marks` > 0
- `marks_obtained` ≤ `total_marks`
- `month` between 1-12
- `year` between 2020-2100

### Form Validations
- All required fields must be filled
- Marks obtained cannot exceed total marks
- Month and year must be selected
- Test date is required

### Data Calculations
- Percentile: `(marks_obtained / total_marks) × 100`
- Average: Sum of all percentiles / count of tests
- Best score: Maximum percentile from all tests

## Files Modified/Created

### New Files
1. `supabase/migrations/20260104130000_create_test_marks_table.sql`
2. `src/pages/TestMarks.tsx`
3. `src/pages/MyTestMarks.tsx`

### Modified Files
1. `src/App.tsx` - Added routes
2. `src/components/layout/AppHeader.tsx` - Added menu items
3. `src/contexts/AuthContext.tsx` - Added designation field
4. `src/components/ui/progress.tsx` - Enhanced with color support
5. `src/integrations/supabase/types.ts` - Auto-generated from schema

## Testing Checklist

- [ ] Admin can access Test Marks page
- [ ] Admin can filter by Fellow/PG
- [ ] Admin can add new test marks
- [ ] Percentile auto-calculates correctly
- [ ] Admin can edit existing test marks
- [ ] Admin can delete test marks
- [ ] Fellows can see My Test Marks menu item
- [ ] PG doctors can see My Test Marks menu item
- [ ] Non-fellows/PG cannot see My Test Marks
- [ ] Doctors see only their own test marks
- [ ] Month/year filter works correctly
- [ ] Monthly average calculates correctly
- [ ] All-time statistics display correctly
- [ ] Progress bars show correct colors
- [ ] Performance badges show correct labels

## Future Enhancements (Optional)

1. Export test marks to PDF/Excel
2. Charts/graphs for performance trends
3. Comparison with peer average
4. Email notifications for new test marks
5. Batch upload of test marks via CSV
6. Comments/feedback system on test marks
7. Test categories (Theory/Practical/Viva)
8. Performance improvement suggestions
