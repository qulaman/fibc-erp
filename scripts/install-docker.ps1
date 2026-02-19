# ============================================
# АВТОМАТИЧЕСКАЯ УСТАНОВКА DOCKER DESKTOP
# Для Windows 10/11
# ============================================

Write-Host "🐋 Установка Docker Desktop для Windows" -ForegroundColor Cyan
Write-Host ""

# Проверка, установлен ли Docker
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if ($dockerInstalled) {
    Write-Host "✅ Docker уже установлен!" -ForegroundColor Green
    docker --version
    Write-Host ""
    Write-Host "Проверьте, запущен ли Docker Desktop в системном трее." -ForegroundColor Yellow
    exit 0
}

Write-Host "Docker не найден. Начинаем установку..." -ForegroundColor Yellow
Write-Host ""

# URL для скачивания Docker Desktop
$dockerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
$installerPath = "$env:TEMP\DockerDesktopInstaller.exe"

try {
    # Скачивание установщика
    Write-Host "📥 Скачивание Docker Desktop (примерно 500 МБ)..." -ForegroundColor Yellow
    Write-Host "URL: $dockerUrl" -ForegroundColor DarkGray

    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $dockerUrl -OutFile $installerPath -UseBasicParsing
    $ProgressPreference = 'Continue'

    Write-Host "✅ Установочный файл скачан" -ForegroundColor Green
    Write-Host ""

    # Запуск установщика
    Write-Host "🚀 Запуск установщика Docker Desktop..." -ForegroundColor Cyan
    Write-Host "ВАЖНО: Следуйте инструкциям установщика!" -ForegroundColor Yellow
    Write-Host ""

    Start-Process -FilePath $installerPath -Wait

    Write-Host ""
    Write-Host "✅ Установка завершена!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📌 СЛЕДУЮЩИЕ ШАГИ:" -ForegroundColor Cyan
    Write-Host "1. Перезагрузите компьютер (если требуется)" -ForegroundColor White
    Write-Host "2. Запустите Docker Desktop из меню Пуск" -ForegroundColor White
    Write-Host "3. Дождитесь, пока Docker запустится (зеленый значок в трее)" -ForegroundColor White
    Write-Host "4. Выполните команду: docker --version" -ForegroundColor White
    Write-Host "5. Затем запустите: npm run schema:dump" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host "❌ Ошибка при установке Docker:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Попробуйте установить вручную:" -ForegroundColor Yellow
    Write-Host "https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
    exit 1
}
