#!/usr/bin/env node

// Script pour gérer les emails autorisés à créer des comptes admin
// Utilisation: node manage-authorized-emails.js [add|remove|list] [email]

require('dotenv').config();
const mongoose = require('mongoose');
const { AuthorizedAdmin } = require('./models');
const logger = require('./logger');

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connecté à MongoDB');
    } catch (error) {
        console.error('❌ Erreur de connexion MongoDB:', error.message);
        process.exit(1);
    }
}

async function addEmail(email, addedBy = 'system', notes = '') {
    try {
        const existingEmail = await AuthorizedAdmin.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            if (existingEmail.isActive) {
                console.log('⚠️  Email déjà autorisé:', email);
                return;
            } else {
                // Réactiver l'email
                existingEmail.isActive = true;
                existingEmail.addedBy = addedBy;
                existingEmail.notes = notes;
                await existingEmail.save();
                console.log('✅ Email réactivé:', email);
                return;
            }
        }

        const newAuthorized = new AuthorizedAdmin({
            email: email.toLowerCase(),
            addedBy,
            notes,
            isActive: true
        });

        await newAuthorized.save();
        console.log('✅ Email ajouté aux autorisations:', email);
        logger.info('Authorized email added', { email, addedBy });
    } catch (error) {
        console.error('❌ Erreur lors de l\'ajout:', error.message);
        logger.error('Error adding authorized email', { error: error.message, email });
    }
}

async function removeEmail(email) {
    try {
        const result = await AuthorizedAdmin.findOneAndUpdate(
            { email: email.toLowerCase() },
            { isActive: false },
            { new: true }
        );

        if (result) {
            console.log('✅ Email désactivé:', email);
            logger.info('Authorized email deactivated', { email });
        } else {
            console.log('⚠️  Email non trouvé:', email);
        }
    } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error.message);
        logger.error('Error removing authorized email', { error: error.message, email });
    }
}

async function listEmails() {
    try {
        const authorizedEmails = await AuthorizedAdmin.find({ isActive: true })
            .sort({ addedAt: -1 })
            .select('email addedBy addedAt notes');

        console.log('\n📧 Emails autorisés à créer des comptes admin:\n');
        
        if (authorizedEmails.length === 0) {
            console.log('   Aucun email autorisé trouvé.');
            return;
        }

        authorizedEmails.forEach((auth, index) => {
            console.log(`${index + 1}. ${auth.email}`);
            console.log(`   Ajouté par: ${auth.addedBy || 'N/A'}`);
            console.log(`   Date: ${auth.addedAt.toLocaleDateString('fr-FR')}`);
            if (auth.notes) console.log(`   Notes: ${auth.notes}`);
            console.log('');
        });
    } catch (error) {
        console.error('❌ Erreur lors de la liste:', error.message);
        logger.error('Error listing authorized emails', { error: error.message });
    }
}

async function initializeDefaults() {
    try {
        // Vérifier s'il y a déjà des emails autorisés
        const count = await AuthorizedAdmin.countDocuments({ isActive: true });
        
        if (count === 0) {
            console.log('🔧 Initialisation des emails par défaut...');
            
            const defaultEmails = [
                'admin@ynov.com',
                'cclementbelmondo@gmail.com'
            ];

            for (const email of defaultEmails) {
                await addEmail(email, 'initialization', 'Email par défaut du système');
            }
            
            console.log('✅ Emails par défaut initialisés');
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error.message);
    }
}

async function main() {
    const [,, command, email, ...args] = process.argv;
    
    await connectDB();
    
    switch (command) {
        case 'add':
            if (!email) {
                console.log('Usage: node manage-authorized-emails.js add <email> [notes]');
                process.exit(1);
            }
            await addEmail(email, 'admin', args.join(' '));
            break;
            
        case 'remove':
            if (!email) {
                console.log('Usage: node manage-authorized-emails.js remove <email>');
                process.exit(1);
            }
            await removeEmail(email);
            break;
            
        case 'list':
            await listEmails();
            break;
            
        case 'init':
            await initializeDefaults();
            break;
            
        default:
            console.log(`
📧 Gestionnaire d'emails autorisés

Usage:
  node manage-authorized-emails.js add <email> [notes]     - Ajouter un email
  node manage-authorized-emails.js remove <email>         - Supprimer un email  
  node manage-authorized-emails.js list                   - Lister les emails
  node manage-authorized-emails.js init                   - Initialiser les défauts

Exemples:
  node manage-authorized-emails.js add clement@example.com "Développeur principal"
  node manage-authorized-emails.js remove old@example.com
  node manage-authorized-emails.js list
            `);
    }
    
    mongoose.connection.close();
}

// Gestion des erreurs
process.on('uncaughtException', (error) => {
    console.error('❌ Erreur non gérée:', error.message);
    mongoose.connection.close();
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Promise rejetée:', reason);
    mongoose.connection.close();
    process.exit(1);
});

main().catch(console.error);