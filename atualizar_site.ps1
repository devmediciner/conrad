# Script de Atualização Semanal (Backup + Sitemap)
# Execute este arquivo no terminal ou dê dois cliques (se configurado)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Iniciando Rotina de Backup do CONRAD... " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Baixando os dados mais recentes do Supabase..." -ForegroundColor Yellow
node backup-db.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro no backup! Verifique se as senhas estao no .env" -ForegroundColor Red
    Pause
    exit
}

Write-Host ""
Write-Host "[2/3] Atualizando o mapa do site (Sitemap)..." -ForegroundColor Yellow
npm run sitemap

Write-Host ""
Write-Host "[3/3] Enviando os arquivos para o GitHub..." -ForegroundColor Yellow
git add backup_supabase_db/
git add public/sitemap.xml

# Tenta comitar. Se não houver mudança, o git retorna erro, mas ignoramos
git commit -m "chore: atualizacao local do backup e sitemap"
git push

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host " TUDO PRONTO! Seu site ja vai ser atualizado " -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

Pause
