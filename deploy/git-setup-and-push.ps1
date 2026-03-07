# Ahlan House — Git noldan sozlash va GitHub'ga push (Windows PowerShell)
# Loyiha papkasida ishga tushiring: .\deploy\git-setup-and-push.ps1

$ErrorActionPreference = "Stop"
$repoUrl = "https://github.com/aiziyrak-coder/ahlanhouse.git"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Ahlan House — Git setup va GitHub push" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Loyiha root (skript deploy/ da ekani uchun bir daraja yuqoriga)
$root = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $root

# .git o'chirish
if (Test-Path .git) {
    Write-Host "[1/5] .git o'chirilmoqda..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .git
} else {
    Write-Host "[1/5] .git topilmadi, davom etilmoqda." -ForegroundColor Gray
}

# git init
Write-Host "[2/5] git init..." -ForegroundColor Yellow
git init
git branch -M main

# add va commit
Write-Host "[3/5] Fayllar qo'shilmoqda va commit..." -ForegroundColor Yellow
git add .
git status
git commit -m "Initial commit: Ahlan House CRM" -ErrorAction SilentlyContinue

# remote
Write-Host "[4/5] Remote qo'shilmoqda..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin $repoUrl

# push
Write-Host "[5/5] GitHub'ga push qilinmoqda (main)..." -ForegroundColor Yellow
git push -u origin main

Write-Host ""
Write-Host "Tugadi. Repo: $repoUrl" -ForegroundColor Green
