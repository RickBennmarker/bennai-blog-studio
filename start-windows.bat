@echo off
REM Dubbelklik dit bestand om BennAI Blog Studio te starten (Windows).
cd /d "%~dp0"

echo ----------------------------------------
echo    BennAI Blog Studio - opstarten
echo ----------------------------------------
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js is nog niet geinstalleerd.
  echo     Ga naar https://nodejs.org, download de LTS-versie,
  echo     installeer die en dubbelklik dit bestand daarna opnieuw.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [*] Eenmalig installeren... dit kan een paar minuten duren.
  echo.
  call npm install
  if errorlevel 1 (
    echo [x] Installatie mislukt. Probeer opnieuw of vraag hulp in de community.
    pause
    exit /b 1
  )
  echo.
)

echo [>] Studio start op http://localhost:3000
echo     De browser opent zo vanzelf. Laat dit venster open zolang je werkt.
echo     Sluiten? Klik dit venster en druk op Ctrl + C.
echo.

start "" http://localhost:3000
call npm run dev
