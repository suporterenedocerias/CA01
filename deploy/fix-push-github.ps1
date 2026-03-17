# Correr no PowerShell na pasta do projeto se o push falhar por deploy.yml / workflow
Set-Location $PSScriptRoot\..
if (Test-Path .github\workflows) {
    git rm -r --cached .github/workflows 2>$null
    Remove-Item -Recurse -Force .github\workflows -ErrorAction SilentlyContinue
}
git add -A
git status
git commit -m "chore: remove GitHub Actions (evita erro workflow no push)" 2>$null
Write-Host "Agora: git push origin main"
git push origin main
