@echo off
REM ============================================================================
REM  RIMPILOT - arranque rapido en Windows
REM
REM  Doble clic y listo. Funciona desde cualquier lado:
REM
REM    - Dentro del proyecto        -> lo actualiza y lo levanta.
REM    - Suelto en Descargas o
REM      en el Escritorio           -> busca TU copia, la actualiza y la levanta.
REM    - Sin ninguna copia          -> clona el proyecto y lo levanta.
REM
REM  Busca antes de clonar a proposito: clonar una copia nueva al lado de la que
REM  ya tenias es como uno termina con dos carpetas y editando la equivocada.
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

REM ---------------------------------------------------------------- 0. git ---
where git >nul 2>nul
if errorlevel 1 (
  echo   [X] No encuentro git. Instalalo desde https://git-scm.com
  echo.
  pause
  exit /b 1
)

REM ------------------------------------------ 1. donde esta TU copia ---------
set "REPO="
if exist ".git" set "REPO=%CD%"
if not defined REPO if exist "Rimpilot\.git" set "REPO=%CD%\Rimpilot"
if not defined REPO if exist "%USERPROFILE%\Rimpilot\.git" set "REPO=%USERPROFILE%\Rimpilot"
if not defined REPO if exist "%USERPROFILE%\Downloads\Rimpilot\.git" set "REPO=%USERPROFILE%\Downloads\Rimpilot"
if not defined REPO if exist "%USERPROFILE%\Desktop\Rimpilot\.git" set "REPO=%USERPROFILE%\Desktop\Rimpilot"
if not defined REPO if exist "%USERPROFILE%\OneDrive\Escritorio\Rimpilot\.git" set "REPO=%USERPROFILE%\OneDrive\Escritorio\Rimpilot"
if not defined REPO if exist "%USERPROFILE%\OneDrive\Documentos\Rimpilot\.git" set "REPO=%USERPROFILE%\OneDrive\Documentos\Rimpilot"

if not defined REPO (
  echo   [1/5] No encuentro ninguna copia tuya. Clonando el proyecto...
  git clone https://github.com/DAM2323/Rimpilot.git "%USERPROFILE%\Rimpilot"
  if errorlevel 1 (
    echo.
    echo   [X] No se pudo clonar. Revisa tu conexion a internet.
    echo.
    pause
    exit /b 1
  )
  set "REPO=%USERPROFILE%\Rimpilot"
)

cd /d "%REPO%"
echo   [1/5] Proyecto: %REPO%

REM Que la carpeta se llame Rimpilot no garantiza que sea este repositorio.
git remote get-url origin 2>nul | findstr /i "Rimpilot" >nul
if errorlevel 1 (
  echo.
  echo   [X] Esa carpeta es un repositorio, pero no es RIMPILOT.
  echo       Mueve este .bat a otro lugar y volve a ejecutarlo.
  echo.
  pause
  exit /b 1
)

REM ------------------------------------------------- 2. traer los cambios ----
echo   [2/5] Trayendo los ultimos cambios...
git fetch origin --quiet
git checkout main --quiet 2>nul
git pull --ff-only origin main --quiet
if errorlevel 1 (
  echo.
  echo   [!] No se pudo actualizar. Sigo con lo que hay en disco.
  echo       Suele pasar si quedaron cambios locales sin guardar.
  echo       Para ver que pasa:  git status
  echo.
) else (
  echo         al dia.
)

REM ------------------------------------------------------------- 3. pnpm ----
where pnpm >nul 2>nul
if errorlevel 1 (
  echo   [X] No encuentro pnpm. Instalalo con:  npm install -g pnpm
  echo.
  pause
  exit /b 1
)

echo   [3/5] Revisando dependencias...
call pnpm install --silent
if errorlevel 1 (
  echo.
  echo   [X] Fallo la instalacion de dependencias.
  echo.
  pause
  exit /b 1
)
echo         listas.

REM ------------------------------------------------------ 4. configuracion --
echo   [4/5] Revisando configuracion...

if not exist ".env" (
  echo.
  echo   [X] Falta el archivo .env en la raiz del proyecto.
  echo       Copia .env.example como .env y completa al menos:
  echo         ASSEMBLYAI_API_KEY, DATABASE_URL,
  echo         STREAM_TOKEN_SECRET, RIMPILOT_INTERNAL_KEY
  echo.
  echo       Carpeta: %REPO%
  echo.
  pause
  exit /b 1
)

if not exist "packages\dashboard\.env.local" (
  echo.
  echo   [X] Falta packages\dashboard\.env.local
  echo       Copia packages\dashboard\.env.local.example y completalo.
  echo.
  echo       Carpeta: %REPO%
  echo.
  pause
  exit /b 1
)

for /f "tokens=1,* delims==" %%a in ('findstr /b "RIMPILOT_INTERNAL_KEY=" ".env"') do set "CLAVE_BACKEND=%%b"
for /f "tokens=1,* delims==" %%a in ('findstr /b "RIMPILOT_INTERNAL_KEY=" "packages\dashboard\.env.local"') do set "CLAVE_PANEL=%%b"
if not "%CLAVE_BACKEND%"=="%CLAVE_PANEL%" (
  echo.
  echo   [!] Revisa que RIMPILOT_INTERNAL_KEY sea igual en .env y en
  echo       packages\dashboard\.env.local. Si no coinciden, el microfono
  echo       falla con "El backend de voz rechazo la sesion".
  echo.
)
echo         ok.

REM ----------------------------------------------------------- 5. arrancar --
echo   [5/5] Levantando backend y panel...
echo.
echo   ----------------------------------------------------------------
echo     Panel:    http://localhost:3000
echo     Backend:  http://localhost:3001
echo.
echo     El navegador se abre solo en unos segundos.
echo     Para parar todo: Ctrl+C y responder S dos veces.
echo   ----------------------------------------------------------------
echo.

REM Aparte, para no bloquear el arranque de los servidores.
start "" cmd /c "timeout /t 15 >nul & start http://localhost:3000"

call pnpm dev

echo.
echo   Servidores detenidos.
pause
