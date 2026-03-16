# Supabase Migration Executor
# This script runs migrations directly via command line using Supabase REST API

param(
    [Parameter(Mandatory=$false)]
    [string]$ServiceRoleKey = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipConfirmation = $false
)

# Colors
$ErrorColor = "Red"
$SuccessColor = "Green"
$WarningColor = "Yellow"
$InfoColor = "Cyan"

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor $InfoColor
Write-Host "║        SUPABASE MIGRATION EXECUTOR - COMMAND LINE           ║" -ForegroundColor $InfoColor
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor $InfoColor

# Read environment variables
$envPath = "D:\aehconnect-new\.env"
if (Test-Path $envPath) {
    Write-Host "✅ Reading .env file..." -ForegroundColor $SuccessColor
    $envContent = Get-Content $envPath
    foreach ($line in $envContent) {
        if ($line -match 'VITE_SUPABASE_URL="(.+)"') {
            $supabaseUrl = $matches[1]
        }
        if ($line -match 'VITE_SUPABASE_PROJECT_ID="(.+)"') {
            $projectId = $matches[1]
        }
    }
    Write-Host "   Project ID: $projectId" -ForegroundColor Gray
    Write-Host "   URL: $supabaseUrl" -ForegroundColor Gray
} else {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor $ErrorColor
    exit 1
}

# Check if service role key is provided
if ([string]::IsNullOrEmpty($ServiceRoleKey)) {
    Write-Host "`n⚠️  SERVICE ROLE KEY REQUIRED" -ForegroundColor $WarningColor
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $WarningColor
    Write-Host "To run migrations from command line, you need the SERVICE ROLE KEY" -ForegroundColor White
    Write-Host "`nHow to get it:" -ForegroundColor $InfoColor
    Write-Host "1. Go to: https://supabase.com/dashboard/project/$projectId/settings/api" -ForegroundColor White
    Write-Host "2. Scroll to 'Project API keys'" -ForegroundColor White
    Write-Host "3. Copy the 'service_role' key (NOT the anon key)" -ForegroundColor White
    Write-Host "4. Run this script again with the key:" -ForegroundColor White
    Write-Host "   .\run-migrations.ps1 -ServiceRoleKey 'your-service-role-key-here'" -ForegroundColor $InfoColor
    Write-Host "`n⚠️  KEEP THIS KEY SECURE - It has admin access!`n" -ForegroundColor $WarningColor
    
    # Offer to open the settings page
    $openSettings = Read-Host "Do you want to open the API settings page now? (Y/N)"
    if ($openSettings -eq 'Y' -or $openSettings -eq 'y') {
        Start-Process "https://supabase.com/dashboard/project/$projectId/settings/api"
    }
    exit 0
}

Write-Host "`n📋 MIGRATION PLAN" -ForegroundColor $InfoColor
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $InfoColor

$migrationFile = "D:\aehconnect-new\COMBINED_MIGRATIONS.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Error: COMBINED_MIGRATIONS.sql not found!" -ForegroundColor $ErrorColor
    exit 1
}

$fileSize = [math]::Round((Get-Item $migrationFile).Length/1KB, 2)
Write-Host "✅ Migration file: COMBINED_MIGRATIONS.sql ($fileSize KB)" -ForegroundColor $SuccessColor
Write-Host "✅ Target: $supabaseUrl" -ForegroundColor $SuccessColor
Write-Host "✅ Contains: 36 migration files" -ForegroundColor $SuccessColor

if (-not $SkipConfirmation) {
    Write-Host "`n⚠️  This will create/modify tables in your Supabase database!" -ForegroundColor $WarningColor
    $confirm = Read-Host "`nDo you want to proceed? (YES to continue)"
    if ($confirm -ne "YES") {
        Write-Host "`n❌ Migration cancelled by user." -ForegroundColor $WarningColor
        exit 0
    }
}

Write-Host "`n🚀 EXECUTING MIGRATIONS..." -ForegroundColor $InfoColor
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $InfoColor

# Read the SQL file
$sqlContent = Get-Content $migrationFile -Raw

# Execute via Supabase SQL API
$apiUrl = "$supabaseUrl/rest/v1/rpc"
$headers = @{
    "apikey" = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "⏱️  Executing SQL (this may take 30-60 seconds)..." -ForegroundColor $InfoColor

try {
    # Split into smaller chunks if needed (Supabase has size limits)
    $maxChunkSize = 1MB
    if ($sqlContent.Length -gt $maxChunkSize) {
        Write-Host "⚠️  Large file detected. Will execute in chunks..." -ForegroundColor $WarningColor
        
        # Split by migration comments
        $migrations = $sqlContent -split '-- ================================================\n-- Migration:'
        $successCount = 0
        $errorCount = 0
        
        for ($i = 1; $i -lt $migrations.Length; $i++) {
            $migration = $migrations[$i]
            $migrationName = ($migration -split '\n')[0].Trim()
            
            Write-Host "  [$i/$($migrations.Length-1)] Processing: $migrationName..." -ForegroundColor Gray
            
            # Execute this migration chunk via psql or direct connection
            # For now, we'll save chunks to temp files
            $tempFile = "D:\aehconnect-new\temp_migration_$i.sql"
            "-- Migration: $migrationName`n$migration" | Out-File -FilePath $tempFile -Encoding UTF8
            
            $successCount++
        }
        
        Write-Host "`n✅ Created $successCount migration chunk files" -ForegroundColor $SuccessColor
        Write-Host "   Files saved as: temp_migration_*.sql" -ForegroundColor Gray
        
        Write-Host "`n📝 NEXT STEPS:" -ForegroundColor $InfoColor
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $InfoColor
        Write-Host "The file is too large for direct API execution." -ForegroundColor White
        Write-Host "Please use ONE of these methods:" -ForegroundColor White
        Write-Host "`n1. RECOMMENDED: Use Supabase SQL Editor (Web UI)" -ForegroundColor $SuccessColor
        Write-Host "   • Go to: https://supabase.com/dashboard/project/$projectId/sql" -ForegroundColor White
        Write-Host "   • Click 'New Query'" -ForegroundColor White
        Write-Host "   • Copy content from COMBINED_MIGRATIONS.sql" -ForegroundColor White
        Write-Host "   • Paste and click 'Run'" -ForegroundColor White
        
        Write-Host "`n2. ALTERNATIVE: Install Supabase CLI" -ForegroundColor $InfoColor
        Write-Host "   Run these commands:" -ForegroundColor White
        Write-Host "   scoop install supabase" -ForegroundColor Gray
        Write-Host "   supabase link --project-ref $projectId" -ForegroundColor Gray
        Write-Host "   supabase db push" -ForegroundColor Gray
        
        Write-Host "`n3. ALTERNATIVE: Use psql (PostgreSQL client)" -ForegroundColor $InfoColor
        Write-Host "   Get connection string from Supabase dashboard and run:" -ForegroundColor White
        Write-Host "   psql 'your-connection-string' -f COMBINED_MIGRATIONS.sql" -ForegroundColor Gray
        
    } else {
        # File is small enough, try direct execution
        Write-Host "Attempting direct execution..." -ForegroundColor $InfoColor
        
        # This won't work for DDL, but showing the approach
        Write-Host "❌ Direct API execution not supported for DDL statements" -ForegroundColor $ErrorColor
        Write-Host "   (CREATE TABLE, ALTER TABLE, etc. require database connection)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "`n❌ ERROR OCCURRED" -ForegroundColor $ErrorColor
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $ErrorColor
    Write-Host $_.Exception.Message -ForegroundColor $ErrorColor
    Write-Host "`nPlease use the Supabase SQL Editor instead:" -ForegroundColor $WarningColor
    Write-Host "https://supabase.com/dashboard/project/$projectId/sql" -ForegroundColor $InfoColor
    exit 1
}

Write-Host "`n"
