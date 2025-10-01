#!/bin/bash
echo "🚀 Lancement de l'app mobile Ynov Discord Dashboard..."
echo

cd "$(dirname "$0")"

echo "📦 Vérification d'Expo CLI..."
if ! command -v expo &> /dev/null; then
    echo "❌ Expo CLI non trouvé. Installation..."
    npm install -g @expo/cli
fi

echo "📱 Installation des dépendances..."
npm install

echo "🔄 Démarrage de l'app..."
echo
echo "📋 Instructions:"
echo "1. Installe 'Expo Go' sur ton téléphone"
echo "2. Scanne le QR code qui va apparaître"  
echo "3. L'app se lance sur ton téléphone !"
echo

read -p "Appuie sur Entrée pour continuer..."
expo start