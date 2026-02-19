# Получение схемы базы данных Supabase

Write-Host "Dumping database schema..." -ForegroundColor Green
Set-Location "c:\Users\Turing\fibc-erp"

# Полная схема
Write-Host "Creating full schema dump..." -ForegroundColor Cyan
npx supabase db dump --schema public | Out-File -FilePath "supabase\current_schema.sql" -Encoding UTF8

Write-Host ""
Write-Host "✅ Schema saved to: supabase\current_schema.sql" -ForegroundColor Green
Write-Host ""

# Показать размер файла
$fileInfo = Get-Item "supabase\current_schema.sql"
Write-Host "File size: $($fileInfo.Length / 1KB) KB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Done! Now I can read the schema file." -ForegroundColor Green
