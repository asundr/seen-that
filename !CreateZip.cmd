@echo off
set "sz=C:\Program Files\7-Zip\7z.exe"
set "files="*.js" "*.html" "*.css" LICENSE "*.json" "images\*.png""
"%sz%" a seen-that.zip %files%
