# Script PowerShell pour démarrer le projet Jure DRF

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Démarrage du projet Jure DRF" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Poetry est installé
if (-not (Get-Command poetry -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Poetry n'est pas installé!" -ForegroundColor Red
    Write-Host "Installez Poetry avec: pip install poetry" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Poetry détecté" -ForegroundColor Green

# Vérifier si les dépendances sont installées
if (-not (Test-Path ".venv") -and -not (Test-Path "poetry.lock")) {
    Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
    poetry install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation des dépendances" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Dépendances installées" -ForegroundColor Green
}

# Vérifier si les migrations sont appliquées
Write-Host ""
Write-Host "🔍 Vérification des migrations..." -ForegroundColor Yellow
poetry run python manage.py showmigrations --list | Select-String "\[ \]" | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "📝 Application des migrations..." -ForegroundColor Yellow
    poetry run python manage.py migrate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'application des migrations" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Migrations appliquées" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Démarrage du serveur..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Serveur accessible sur: http://localhost:8000" -ForegroundColor Green
Write-Host "📚 API Docs: http://localhost:8000/api/docs/" -ForegroundColor Green
Write-Host "🔧 Admin: http://localhost:8000/admin/" -ForegroundColor Green
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arrêter le serveur" -ForegroundColor Yellow
Write-Host ""

# Démarrer le serveur
poetry run python manage.py runserver









