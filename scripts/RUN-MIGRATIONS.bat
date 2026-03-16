@echo off
echo.
echo ========================================
echo   OPENING MIGRATION FILES
echo ========================================
echo.
echo Opening Supabase SQL Editor...
start https://supabase.com/dashboard/project/uwoddeszgeewevrydmoc/sql/new
timeout /t 2 /nobreak >nul
echo Opening migration file in VS Code...
code "D:\aehconnect-new\COMBINED_MIGRATIONS.sql"
echo.
echo ========================================
echo   READY TO RUN MIGRATIONS!
echo ========================================
echo.
echo STEP 1: In VS Code
echo   - Press Ctrl+A (select all)
echo   - Press Ctrl+C (copy)
echo.
echo STEP 2: In Browser (Supabase SQL Editor)
echo   - Press Ctrl+V (paste)
echo   - Click RUN button
echo.
echo STEP 3: Wait 30-60 seconds
echo.
echo STEP 4: Go to Table Editor to verify
echo.
pause
