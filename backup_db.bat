@echo off
setlocal

:: Get date in YYYY-MM-DD format (independent of regional settings)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set YEAR=%datetime:~0,4%
set MONTH=%datetime:~4,2%
set DAY=%datetime:~6,2%
set DATE_STR=%YEAR%-%MONTH%-%DAY%

:: Define directory name
set "BACKUP_DIR=%DATE_STR% backup"

:: Create directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Set database credentials from environment
set PGUSER=admin
set PGPASSWORD=securepassword
set PGHOST=localhost
set PGPORT=5432
set PGDATABASE=audio_fix

:: Define backup filename
set "BACKUP_FILE=%BACKUP_DIR%\%PGDATABASE%_%DATE_STR%.sql"

:: Perform backup
echo Backing up database '%PGDATABASE%' to '%BACKUP_FILE%'...
pg_dump -U %PGUSER% -h %PGHOST% -p %PGPORT% %PGDATABASE% > "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo Backup successful!
) else (
    echo Backup failed!
    echo Ensure PostgreSQL bin directory is in your system PATH.
)

pause
endlocal
