$projectId = "uwoddeszgeewevrydmoc"
Write-Host "`n" -NoNewline
Write-Host "Opening Supabase SQL Editor..." -ForegroundColor Green
Start-Process "https://supabase.com/dashboard/project/$projectId/sql/new"
Start-Sleep -Seconds 2
Write-Host "Opening COMBINED_MIGRATIONS.sql..." -ForegroundColor Green
code "D:\aehconnect-new\COMBINED_MIGRATIONS.sql"
Write-Host "`nREADY! Now:`n" -ForegroundColor Yellow
Write-Host "1. In VS Code: Ctrl+A then Ctrl+C to copy all" -ForegroundColor White
Write-Host "2. In Browser SQL Editor: Ctrl+V to paste" -ForegroundColor White
Write-Host "3. Click RUN button`n" -ForegroundColor White
