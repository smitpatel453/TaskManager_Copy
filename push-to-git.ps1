# Git push script for Task2 project
Write-Host "🚀 Pushing code to git repository..." -ForegroundColor Cyan

# Check if git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if we're in a git repository
if (-not (Test-Path .git)) {
    Write-Host "❌ Not in a git repository. Please navigate to the project root." -ForegroundColor Red
    exit 1
}

# Show current status
Write-Host "`n📊 Current git status:" -ForegroundColor Yellow
git status --short

# Get commit message
Write-Host "`n💬 Enter commit message (or press Enter for default):" -ForegroundColor Green
$commitMessage = Read-Host "Commit message"

if (-not $commitMessage) {
    $commitMessage = "chore: update code $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}

Write-Host "`n📝 Committing with message: '$commitMessage'" -ForegroundColor Cyan

# Stage all changes
Write-Host "📦 Staging changes..." -ForegroundColor Cyan
git add .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to stage changes" -ForegroundColor Red
    exit 1
}

# Commit
Write-Host "💾 Creating commit..." -ForegroundColor Cyan
git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Commit failed (may be no changes to commit)" -ForegroundColor Yellow
}

# Get current branch
$branch = git rev-parse --abbrev-ref HEAD

# Push to remote
Write-Host "🔼 Pushing to remote ($branch branch)..." -ForegroundColor Cyan
git push origin $branch

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Successfully pushed to git! 🎉" -ForegroundColor Green
    Write-Host "Branch: $branch" -ForegroundColor Green
} else {
    Write-Host "`n❌ Failed to push to remote" -ForegroundColor Red
    exit 1
}

# Show latest commits
Write-Host "`n📋 Latest commits:" -ForegroundColor Yellow
git log --oneline -5
