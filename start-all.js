// Script pour démarrer à la fois le bot Discord et le dashboard admin
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Démarrage du système complet Ynov Bot...\n');

// Démarrer le bot Discord
console.log('🤖 Démarrage du bot Discord...');
const botProcess = spawn('node', ['discord-bot.js'], {
    stdio: 'pipe',
    cwd: __dirname
});

botProcess.stdout.on('data', (data) => {
    console.log(`[BOT] ${data.toString().trim()}`);
});

botProcess.stderr.on('data', (data) => {
    console.error(`[BOT ERROR] ${data.toString().trim()}`);
});

// Attendre un peu avant de démarrer le dashboard
setTimeout(() => {
    console.log('📊 Démarrage du dashboard admin...');
    
    const dashboardProcess = spawn('node', ['admin-dashboard-secure.js'], {
        stdio: 'pipe',
        cwd: __dirname
    });
    
    dashboardProcess.stdout.on('data', (data) => {
        console.log(`[DASHBOARD] ${data.toString().trim()}`);
    });
    
    dashboardProcess.stderr.on('data', (data) => {
        console.error(`[DASHBOARD ERROR] ${data.toString().trim()}`);
    });
    
    dashboardProcess.on('close', (code) => {
        console.log(`📊 Dashboard arrêté avec le code ${code}`);
    });
    
}, 3000);

botProcess.on('close', (code) => {
    console.log(`🤖 Bot Discord arrêté avec le code ${code}`);
});

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
    console.log('\n🔄 Arrêt du système...');
    botProcess.kill();
    process.exit(0);
});

console.log('\n✅ Système démarré !');
console.log('📋 Services actifs:');
console.log('   🤖 Bot Discord - Gestion des vérifications');
console.log('   📊 Dashboard Admin - http://localhost:3000');
console.log('\n📘 Commandes:');
console.log('   Ctrl+C - Arrêter tous les services');
console.log('   npm run bot - Bot seul');
console.log('   npm run dev - Dashboard seul');
console.log('\n🔍 Logs en temps réel ci-dessous:\n');