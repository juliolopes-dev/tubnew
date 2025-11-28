@echo off
echo ========================================
echo   TubNew Desktop - Instalador
echo ========================================
echo.
echo Instalando dependencias...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
echo.
echo ========================================
echo   Instalacao concluida!
echo ========================================
echo.
echo Pressione qualquer tecla para iniciar o TubNew...
pause >nul
python app.py
