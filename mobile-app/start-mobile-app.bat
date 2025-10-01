@echo off
echo 🚀 Lancement de l'app mobile Ynov Discord Dashboard...
echo.

cd /d "%~dp0"

echo 📦 Vérification d'Expo CLI...
where expo >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Expo CLI non trouvé. Installation...
    npm install -g @expo/cli
)

echo 📱 Installation des dépendances...
call npm install

echo 🔄 Démarrage de l'app...
echo.
echo 📋 Instructions:
echo 1. Installe "Expo Go" sur ton téléphone
echo 2. Scanne le QR code qui va apparaître
echo 3. L'app se lance sur ton téléphone !
echo.
pause

call expo start