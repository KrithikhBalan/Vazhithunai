# Purpose: Background script to automatically stage, commit, and push changes to GitHub every 60 seconds or whenever changes occur.

$RepoPath = "D:\Vazhithunai"
$BranchName = "main"
$IntervalSeconds = 60

Write-Host "Vazhithunai Auto-Push active on $RepoPath ($BranchName)" -ForegroundColor Cyan

while ($true) {
    try {
        Set-Location $RepoPath
        $status = git status --porcelain
        if ($status) {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            git add -A
            git commit -m "chore: auto-sync updates [$timestamp]"
            git push origin $BranchName
            Write-Host "Pushed changes at $timestamp" -ForegroundColor Green
        }
    } catch {
        Write-Host "Auto-push warning: $_" -ForegroundColor Yellow
    }
    Start-Sleep -Seconds $IntervalSeconds
}
