# Quick Open Files Script
# This script opens all the important setup files for you

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SUPABASE SETUP FILES" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Opening setup files in VS Code...`n" -ForegroundColor Green

# Open the main SQL file
Write-Host "📦 Opening COMBINED_MIGRATIONS.sql..." -ForegroundColor White
code "D:\aehconnect-new\COMBINED_MIGRATIONS.sql"
Start-Sleep -Milliseconds 500

# Open the quick start guide
Write-Host "⚡ Opening QUICK_START.txt..." -ForegroundColor White
code "D:\aehconnect-new\QUICK_START.txt"
Start-Sleep -Milliseconds 500

# Open the detailed guide
Write-Host "📖 Opening SUPABASE_SETUP_GUIDE.md..." -ForegroundColor White
code "D:\aehconnect-new\SUPABASE_SETUP_GUIDE.md"
Start-Sleep -Milliseconds 500

Write-Host "`n✅ All files opened!`n" -ForegroundColor Green

Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Read QUICK_START.txt (already opened)" -ForegroundColor White
Write-Host "2. Go to: https://supabase.com/dashboard/project/uwoddeszgeewevrydmoc" -ForegroundColor White
Write-Host "3. Click 'SQL Editor' > 'New Query'" -ForegroundColor White
Write-Host "4. Copy ALL content from COMBINED_MIGRATIONS.sql" -ForegroundColor White
Write-Host "5. Paste and run in Supabase SQL Editor" -ForegroundColor White
Write-Host "6. Wait for completion (30-60 seconds)" -ForegroundColor White
Write-Host "7. Run SEED_DATA.sql (optional)" -ForegroundColor White
Write-Host "`n"

# Ask if user wants to open Supabase dashboard
$openDashboard = Read-Host "Do you want to open the Supabase Dashboard now? (Y/N)"
if ($openDashboard -eq 'Y' -or $openDashboard -eq 'y') {
    Write-Host "`nOpening Supabase Dashboard..." -ForegroundColor Green
    Start-Process "https://supabase.com/dashboard/project/uwoddeszgeewevrydmoc"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Good luck with your setup! 🚀" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan
