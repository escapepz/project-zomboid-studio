:: pzstudio.cmd
@echo off
:: Use quotes around the path to handle potential spaces in folder names
node "%~dp0index.js" %*
pause
