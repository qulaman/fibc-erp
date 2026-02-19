# Подключение к Supabase проекту
$ProjectRef = "mgslapkswztsonyooogm"

Write-Host "Linking to Supabase project..." -ForegroundColor Green
Write-Host ""
Write-Host "Project ID: $ProjectRef" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please enter your database password from:" -ForegroundColor Yellow
Write-Host "Supabase Dashboard -> Settings -> Database" -ForegroundColor Yellow
Write-Host ""

Set-Location "c:\Users\Turing\fibc-erp"
npx supabase link --project-ref $ProjectRef
