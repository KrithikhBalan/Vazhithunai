# Vazhithunai — Auto Git Push Script
# Watches for file changes and pushes to GitHub every 60 seconds (or sooner if changes detected)
# Run with: .\scripts\auto-push.ps1

$RepoPath = "D:\Vazhithunai"
$BranchName = "main"
$IntervalSeconds = 60
$LastHash = ""

Write-Host "🚀 Vazhithunai Auto-Push started" -ForegroundColor Cyan
Write-Host "   Repo  : $RepoPath" -ForegroundColor Gray
Write-Host "   Branch: $BranchName" -ForegroundColor Gray
Write-Host "   Push every $IntervalSeconds seconds (or on change)" -ForegroundColor Gray
Write-Host "   Press Ctrl+C to stop`n" -ForegroundColor Gray

function Get-WorktreeHash {
    # Hash of all tracked + untracked non-ignored files
    $status = git -C $RepoPath status --porcelain 2>$null
    return ($status | Out-String).GetHashCode().ToString()
}

function Push-Changes {
    param([string]$CommitMessage)

    Set-Location $RepoPath

    # Stage all changes
    git add -A 2>$null

    # Check if there's anything to commit
    $staged = git diff --cached --name-only 2>$null
    if (-not $staged) {
        Write-Host "  $(Get-Date -Format 'HH:mm:ss') ✓ No changes to push" -ForegroundColor DarkGray
        return
    }

    # Commit
    git commit -m $CommitMessage 2>$null | Out-Null

    # Push
    $result = git push origin $BranchName 2>&1
    $pushed = $result | Where-Object { $_ -match "main" }

    if ($LASTEXITCODE -eq 0 -or ($result -join "") -match "main") {
        $fileCount = ($staged | Measure-Object -Line).Lines
        Write-Host "  $(Get-Date -Format 'HH:mm:ss') ✅ Pushed $fileCount file(s): $CommitMessage" -ForegroundColor Green
    } else {
        Write-Host "  $(Get-Date -Format 'HH:mm:ss') ⚠️  Push issue: $result" -ForegroundColor Yellow
    }
}

# Main loop
while ($true) {
    try {
        $currentHash = Get-WorktreeHash

        if ($currentHash -ne $LastHash) {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            Push-Changes "chore: auto-push [$timestamp]"
            $LastHash = Get-WorktreeHash  # refresh after commit
        }

        Start-Sleep -Seconds $IntervalSeconds

        # Also push on timer even if hash hasn't changed (catches edge cases)
        $currentHash = Get-WorktreeHash
        if ($currentHash -ne $LastHash) {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            Push-Changes "chore: auto-push [$timestamp]"
            $LastHash = Get-WorktreeHash
        } else {
            Write-Host "  $(Get-Date -Format 'HH:mm:ss') · Checked — nothing new" -ForegroundColor DarkGray
        }

    } catch {
        Write-Host "  $(Get-Date -Format 'HH:mm:ss') ❌ Error: $_" -ForegroundColor Red
        Start-Sleep -Seconds 10
    }
}
