#!/usr/bin/env node

// Script de démarrage unifié pour Render
// Lance le bot Discord ET le dashboard admin sur le même processus

require('dotenv').config();
const { spawn } = require('child_process');
const logger = require('./logger');

// Vérifier les variables d'environnement essentielles
const requiredEnvVars = [
    'DISCORD_TOKEN',
    'MONGODB_URI',
    'GUILD_ID',
    'VERIFIED_ROLE_ID',
    'UNVERIFIED_ROLE_ID'
];

console.log('🚀 Démarrage du Bot Discord Ynov Enterprise...\n');

// Vérification des variables d'environnement
let missingVars = [];
for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
        missingVars.push(varName);
    }
}

if (missingVars.length > 0) {
    console.error('❌ Variables d\'environnement manquantes:');
    missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    process.exit(1);
}

// Configuration du port pour Render
const PORT = process.env.PORT || 3000;
process.env.ADMIN_PORT = PORT;

console.log(`📊 Dashboard admin sera accessible sur le port ${PORT}`);
console.log(`🤖 Bot Discord en cours de démarrage...\n`);

// Démarrer le bot principal ET le dashboard dans le même processus
async function startServices() {
    try {
        // Importer et démarrer le bot Discord
        console.log('🤖 Initialisation du bot Discord...');
        require('./main-mongodb');
        
        // Attendre un peu que le bot se connecte
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Importer et démarrer le dashboard admin sécurisé
        console.log('🔒 Initialisation du dashboard admin...');
        const { app } = require('./admin-dashboard-secure');
        
        // Le dashboard est déjà configuré pour écouter sur le port
        // Il va se lancer automatiquement
        
        console.log('\n✅ Services démarrés avec succès !');
        console.log(`🌐 Dashboard accessible sur: https://[VOTRE-URL-RENDER].onrender.com`);
        console.log(`🤖 Bot Discord opérationnel`);
        
    } catch (error) {
        console.error('❌ Erreur lors du démarrage:', error.message);
        logger.error('Startup error', { error: error.message });
        process.exit(1);
    }
}

// Gestion des signaux de fermeture
process.on('SIGTERM', () => {
    console.log('📡 Signal SIGTERM reçu, arrêt en cours...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📡 Signal SIGINT reçu, arrêt en cours...');
    process.exit(0);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    console.error('❌ Erreur non capturée:', error.message);
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejetée:', reason);
    logger.error('Unhandled rejection', { reason: reason.toString() });
    process.exit(1);
});

// Démarrer les services
startServices();