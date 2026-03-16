# ULTIMATE Supabase Migration Executor
# Tries multiple methods to execute migrations from command line

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     SUPABASE MIGRATION - COMMAND LINE EXECUTOR              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$projectId = "uwoddeszgeewevrydmoc"
$supabaseUrl = "https://uwoddeszgeewevrydmoc.supabase.co"
$migrationFile = "D:\aehconnect-new\COMBINED_MIGRATIONS.sql"

Write-Host "🔍 Checking available methods...`n" -ForegroundColor Yellow

# Method 1: Check for Supabase CLI
Write-Host "Method 1: Supabase CLI" -ForegroundColor Cyan
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue
if ($supabaseCli) {
    Write-Host "  ✅ Supabase CLI found!" -ForegroundColor Green
    Write-Host "`n📋 To execute migrations with Supabase CLI:" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "supabase link --project-ref $projectId" -ForegroundColor White
    Write-Host "supabase db push`n" -ForegroundColor White
    
    $useCli = Read-Host "Run migrations with Supabase CLI now? (Y/N)"
    if ($useCli -eq 'Y' -or $useCli -eq 'y') {
        Write-Host "`n🚀 Linking to project..." -ForegroundColor Cyan
        supabase link --project-ref $projectId
        
        Write-Host "`n🚀 Pushing migrations..." -ForegroundColor Cyan
        supabase db push
        
        Write-Host "`n✅ Done! Check above for any errors." -ForegroundColor Green
        exit 0
    }
} else {
    Write-Host "  ❌ Supabase CLI not installed" -ForegroundColor Red
    Write-Host "     Install with: scoop install supabase" -ForegroundColor Gray
    Write-Host "     Or: npm install -g supabase" -ForegroundColor Gray
}

Write-Host "`n" -NoNewline

# Method 2: Check for psql
Write-Host "Method 2: PostgreSQL psql" -ForegroundColor Cyan
$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($psql) {
    Write-Host "  ✅ psql found!" -ForegroundColor Green
    Write-Host "`n⚠️  You need the database connection string from Supabase" -ForegroundColor Yellow
    Write-Host "Get it from: https://supabase.com/dashboard/project/$projectId/settings/database" -ForegroundColor Gray
    Write-Host "`nConnection string format:" -ForegroundColor White
    Write-Host "postgresql://postgres:[YOUR-PASSWORD]@db.$projectId.supabase.co:5432/postgres" -ForegroundColor Gray
    
    $connString = Read-Host "`nEnter connection string (or leave empty to skip)"
    if (-not [string]::IsNullOrEmpty($connString)) {
        Write-Host "`n🚀 Executing migrations with psql..." -ForegroundColor Cyan
        psql $connString -f $migrationFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Migrations executed successfully!" -ForegroundColor Green
        } else {
            Write-Host "`n❌ Errors occurred. Check output above." -ForegroundColor Red
        }
        exit $LASTEXITCODE
    }
} else {
    Write-Host "  ❌ psql not installed" -ForegroundColor Red
    Write-Host "     Install PostgreSQL: https://www.postgresql.org/download/" -ForegroundColor Gray
}

Write-Host "`n" -NoNewline

# Method 3: Manual - Use SQL Editor
Write-Host "Method 3: Supabase SQL Editor (Manual - RECOMMENDED)" -ForegroundColor Cyan
Write-Host "  ✅ Always available" -ForegroundColor Green
Write-Host "`n📋 STEPS TO EXECUTE MANUALLY:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "1. I'll open the SQL Editor for you" -ForegroundColor White
Write-Host "2. I'll open the migration file in VS Code" -ForegroundColor White
Write-Host "3. Copy ALL content from COMBINED_MIGRATIONS.sql [Ctrl+A then Ctrl+C]" -ForegroundColor White
Write-Host "4. Paste into Supabase SQL Editor [Ctrl+V]" -ForegroundColor White
Write-Host "5. Click 'Run' button or press Ctrl+Enter" -ForegroundColor White
Write-Host "6. Wait 30-60 seconds for completion`n" -ForegroundColor White

$openManual = Read-Host "Open SQL Editor and migration file now? (Y/N)"
if ($openManual -eq 'Y' -or $openManual -eq 'y') {
    Write-Host "`n🌐 Opening Supabase SQL Editor..." -ForegroundColor Cyan
    Start-Process "https://supabase.com/dashboard/project/$projectId/sql/new"
    Start-Sleep -Seconds 2
    
    Write-Host "📝 Opening migration file in VS Code..." -ForegroundColor Cyan
    code $migrationFile
    
    Write-Host "`n✅ Files opened!" -ForegroundColor Green
    Write-Host "   Now:" -ForegroundColor Yellow
    Write-Host "   1. Copy ALL from COMBINED_MIGRATIONS.sql [Ctrl+A, Ctrl+C]" -ForegroundColor White
    Write-Host "   2. Paste in Supabase SQL Editor [Ctrl+V]" -ForegroundColor White
    Write-Host "   3. Click RUN" -ForegroundColor White
    Write-Host "`n"
    exit 0
}

Write-Host "`n" -NoNewline

# Method 4: Install Supabase CLI now
Write-Host "Method 4: Install Supabase CLI now" -ForegroundColor Cyan
$installCli = Read-Host "Do you want to install Supabase CLI now? (Y/N)"
if ($installCli -eq 'Y' -or $installCli -eq 'y') {
    Write-Host "`n📦 Installing Supabase CLI..." -ForegroundColor Cyan
    
    # Check for scoop
    $scoop = Get-Command scoop -ErrorAction SilentlyContinue
    if ($scoop) {
        Write-Host "Using scoop to install..." -ForegroundColor Gray
        scoop install supabase
    } else {
        # Check for npm
        $npm = Get-Command npm -ErrorAction SilentlyContinue
        if ($npm) {
            Write-Host "Using npm to install..." -ForegroundColor Gray
            npm install -g supabase
        } else {
            Write-Host "❌ Neither scoop nor npm found!" -ForegroundColor Red
            Write-Host "Install scoop: https://scoop.sh" -ForegroundColor Gray
            Write-Host "Or install Node.js: https://nodejs.org" -ForegroundColor Gray
            exit 1
        }
    }
    
    Write-Host "`n✅ Supabase CLI installed!" -ForegroundColor Green
    Write-Host "Now run this script again to use it." -ForegroundColor Yellow
    exit 0
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📖 For more help, read: SUPABASE_SETUP_GUIDE.md" -ForegroundColor Cyan
Write-Host "🔧 For troubleshooting, read: TROUBLESHOOTING.md" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray
