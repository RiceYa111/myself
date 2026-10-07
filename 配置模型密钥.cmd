@echo off
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0configure-model.ps1"
if errorlevel 1 pause