@echo off
REM ============================================================================
REM  RIMPILOT - arranque rapido en Windows
REM
REM  Doble clic y listo: trae los ultimos cambios, actualiza dependencias,
REM  revisa la configuracion y levanta backend y panel.
REM
REM  Sin tildes a proposito: un .bat con acentos se ve roto en algunas consolas
REM  de Windows, y este archivo se lee justo cuando algo no anda.
REM ============================================================================

setlocal
cd /d "%~dp0"
title RIMPILOT

echo.
echo   RIMPILOT
echo   ========================================
echo.

REM ---------------------------------------------------------------- 1. git ---
where git >nul 2>nul
if errorlevel 1 (
  echo   [X] No encuentro git. Instalalo desde https://git-scm.com
  echo.
  pause
  exit /b 1
)

REM Si el .bat esta suelto (Escritorio, Descargas) y no hay repo al lado, lo
REM clona. Asi un solo archivo sirve para empezar de cero y para actualizar.
if not exist ".git" (
  if exist "Rimpilot\.git" (
    cd Rimpilot
  ) else (
    echo   [1/4] No hay repositorio aca. Clonando RIMPILOT...
    git clone https://github.com/DAM2323/Rimpilot.git Rimpilot
    if errorlevel 1 (
      echo.
      echo   [X] No se pudo clonar. Revisa tu conexion.
      echo.
      pause
      exit /b 1
    )
    cd Rimpilot
    echo         clonado en la carpeta Rimpilot.
  )
)

echo   [1/4] Trayendo los ultimos cambios...
git fetch origin --quiet
git checkout main --quiet 2>nul
git pull --ff-only origin main --quiet
if errorlevel 1 (
  echo.
  echo   [!] No se pudo actualizar. Sigo igual con lo que hay en disco.
  echo       Suele pasar si quedaron cambios locales sin guardar.
  echo       Para verlo:  git status
  echo.
) else (
  echo         al dia.
)

REM ------------------------------------------------------------- 2. pnpm -----
where pnpm >nul 2>nul
if errorlevel 1 (
  echo   [X] No encuentro pnpm. Instalalo con:  npm install -g pnpm
  echo.
  pause
  exit /b 1
)

echo   [2/4] Revisando dependencias...
call pnpm install --silent
if errorlevel 1 (
  echo.
  echo   [X] Fallo la instalacion de dependencias.
  echo.
  pause
  exit /b 1
)
echo         listas.

REM --------------------------------------------------------- 3. configuracion -
echo   [3/4] Revisando configuracion...

if not exist ".env" (
  echo.
  echo   [X] Falta el archivo .env en la raiz.
  echo       Copia .env.example como .env y completa al menos:
  echo         ASSEMBLYAI_API_KEY, DATABASE_URL,
  echo         STREAM_TOKEN_SECRET, RIMPILOT_INTERNAL_KEY
  echo.
  pause
  exit /b 1
)

if not exist "packages\dashboard\.env.local" (
  echo.
  echo   [X] Falta packages\dashboard\.env.local
  echo       Copia packages\dashboard\.env.local.example y completalo.
  echo.
  pause
  exit /b 1
)

REM La clave interna tiene que ser identica en los dos archivos: si no, el panel
REM pide el token y el backend lo rechaza con un 403 que no dice por que.
for /f "tokens=1,* delims==" %%a in ('findstr /b "RIMPILOT_INTERNAL_KEY=" ".env"') do set "CLAVE_BACKEND=%%b"
for /f "tokens=1,* delims==" %%a in ('findstr /b "RIMPILOT_INTERNAL_KEY=" "packages\dashboard\.env.local"') do set "CLAVE_PANEL=%%b"
if not "%CLAVE_BACKEND%"=="%CLAVE_PANEL%" (
  echo.
  echo   [!] RIMPILOT_INTERNAL_KEY no coincide entre .env y .env.local
  echo       El microfono va a fallar con "El backend de voz rechazo la sesion".
  echo.
)
echo         ok.

REM ------------------------------------------------------------ 4. arrancar ---
echo   [4/4] Levantando backend y panel...
echo.
echo   ----------------------------------------------------------------
echo     Panel:    http://localhost:3000
echo     Backend:  http://localhost:3001
echo.
echo     El navegador se abre solo en unos segundos.
echo     Para parar todo: Ctrl+C y responder S dos veces.
echo   ----------------------------------------------------------------
echo.

REM Se abre aparte para no bloquear el arranque de los servidores.
start "" cmd /c "timeout /t 15 >nul & start http://localhost:3000"

call pnpm dev

echo.
echo   Servidores detenidos.
pause
