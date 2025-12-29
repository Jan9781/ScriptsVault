# auto-commit.ps1
# This script monitors the current directory for changes and auto-commits them to GitHub.

$interval = 30 # Seconds between checks
$remote = "origin"
$branch = "main"

Write-Host "Starting auto-commit script..." -ForegroundColor Cyan
Write-Host "Monitoring changes every $interval seconds."

while ($true) {
    $status = git status --porcelain
    if ($status) {
        Write-Host "Changes detected. Committing..." -ForegroundColor Yellow
        git add .
        git commit -m "Auto-commit: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        
        # Check if remote is set before pushing
        $hasRemote = git remote
        if ($hasRemote -contains $remote) {
            Write-Host "Pushing to $remote $branch..." -ForegroundColor Green
            git push $remote $branch
        } else {
            Write-Host "No remote '$remote' found. Skipping push." -ForegroundColor Red
        }
    }
    Start-Sleep -Seconds $interval
}
