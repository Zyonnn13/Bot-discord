require('dotenv').config();
const mongoose = require('mongoose');
const emailService = require('./emailService');
const logger = require('./logger');

console.log('🧪 Test de connexion du système Ynov Bot\n');

async function testConnections() {
    let allGood = true;

    // Test 1: Variables d'environnement
    console.log('1️⃣ Vérification des variables d\'environnement...');
    const requiredVars = [
        'DISCORD_TOKEN',
        'GUILD_ID', 
        'UNVERIFIED_ROLE_ID',
        'VERIFIED_ROLE_ID',
        'MONGODB_URI'
    ];

    for (const varName of requiredVars) {
        if (process.env[varName]) {
            console.log(`   ✅ ${varName}: Configuré`);
        } else {
            console.log(`   ❌ ${varName}: Manquant`);
            allGood = false;
        }
    }

    // Test 2: Connexion MongoDB
    console.log('\n2️⃣ Test de connexion MongoDB...');
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('   ✅ MongoDB Atlas: Connexion réussie');
        
        // Test d'écriture
        const testCollection = mongoose.connection.db.collection('test');
        await testCollection.insertOne({ test: true, timestamp: new Date() });
        await testCollection.deleteOne({ test: true });
        console.log('   ✅ MongoDB Atlas: Test d\'écriture réussi');
        
    } catch (error) {
        console.log(`   ❌ MongoDB Atlas: Erreur - ${error.message}`);
        allGood = false;
    }

    // Test 3: Service Email
    console.log('\n3️⃣ Test du service email...');
    try {
        const emailConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;
        if (emailConfigured) {
            const emailWorking = await emailService.testConnection();
            if (emailWorking) {
                console.log('   ✅ Service email: Configuré et fonctionnel');
            } else {
                console.log('   ⚠️ Service email: Configuré mais connexion échouée');
                console.log('   💡 Vérifiez vos identifiants EMAIL_USER et EMAIL_PASS');
            }
        } else {
            console.log('   ⚠️ Service email: Non configuré');
            console.log('   💡 Ajoutez EMAIL_USER et EMAIL_PASS dans .env pour l\'envoi de codes');
        }
    } catch (error) {
        console.log(`   ❌ Service email: Erreur - ${error.message}`);
    }

    // Test 4: Création des dossiers nécessaires
    console.log('\n4️⃣ Vérification des dossiers...');
    const fs = require('fs');
    const paths = ['./logs', './backups'];
    
    for (const dirPath of paths) {
        try {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            console.log(`   ✅ Dossier ${dirPath}: Prêt`);
        } catch (error) {
            console.log(`   ❌ Dossier ${dirPath}: Erreur - ${error.message}`);
            allGood = false;
        }
    }

    // Test 5: Logger
    console.log('\n5️⃣ Test du système de logs...');
    try {
        logger.info('Test message from connection test');
        console.log('   ✅ Système de logs: Fonctionnel');
    } catch (error) {
        console.log(`   ❌ Système de logs: Erreur - ${error.message}`);
        allGood = false;
    }

    // Résumé
    console.log('\n' + '='.repeat(50));
    if (allGood) {
        console.log('🎉 TOUS LES TESTS SONT PASSÉS !');
        console.log('✅ Votre bot est prêt à fonctionner');
        console.log('\n📋 Commandes disponibles:');
        console.log('   npm start        - Démarrer le bot');
        console.log('   npm run admin    - Lancer le dashboard admin');
        console.log('   npm run backup   - Créer une sauvegarde manuelle');
    } else {
        console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ');
        console.log('⚠️ Corrigez les erreurs avant de démarrer le bot');
    }
    console.log('='.repeat(50));

    // Fermer la connexion
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
    }
    
    process.exit(allGood ? 0 : 1);
}

testConnections().catch(error => {
    console.error('❌ Erreur lors des tests:', error.message);
    process.exit(1);
});