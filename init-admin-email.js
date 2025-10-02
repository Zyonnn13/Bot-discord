#!/usr/bin/env node

// Script pour initialiser le premier email admin autorisé
// Utilisation: node init-admin-email.js votre-email@domaine.com

require('dotenv').config();
const mongoose = require('mongoose');
const { AuthorizedAdmin } = require('./models');

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connecté à MongoDB');
    } catch (error) {
        console.error('❌ Erreur de connexion MongoDB:', error.message);
        process.exit(1);
    }
}

async function initAdminEmail(email) {
    try {
        // Vérifier si l'email existe déjà
        const existingEmail = await AuthorizedAdmin.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            if (existingEmail.isActive) {
                console.log('⚠️  Email déjà autorisé:', email);
                return;
            } else {
                // Réactiver l'email
                existingEmail.isActive = true;
                existingEmail.addedBy = 'system-init';
                existingEmail.notes = 'Email administrateur principal - initialisé automatiquement';
                await existingEmail.save();
                console.log('✅ Email administrateur réactivé:', email);
                return;
            }
        }

        // Créer le nouvel email autorisé
        const adminEmail = new AuthorizedAdmin({
            email: email.toLowerCase(),
            addedBy: 'system-init',
            notes: 'Email administrateur principal - initialisé automatiquement',
            isActive: true
        });

        await adminEmail.save();
        console.log('✅ Email administrateur initialisé avec succès:', email);
        console.log('🎯 Vous pouvez maintenant créer votre compte admin avec cet email sur /signup');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error.message);
    }
}

async function main() {
    const email = process.argv[2];
    
    if (!email) {
        console.log('❌ Usage: node init-admin-email.js <votre-email@domaine.com>');
        console.log('📧 Exemple: node init-admin-email.js admin@ynov.com');
        process.exit(1);
    }

    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.log('❌ Format d\'email invalide:', email);
        process.exit(1);
    }

    console.log('🔄 Initialisation de l\'email administrateur...');
    console.log('📧 Email:', email);
    
    await connectDB();
    await initAdminEmail(email);
    
    console.log('✨ Initialisation terminée !');
    process.exit(0);
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
    console.error('❌ Erreur non gérée:', error.message);
    process.exit(1);
});

// Exécuter le script
main();