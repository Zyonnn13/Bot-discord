require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const readline = require('readline');

// Schéma Admin (dupliqué du dashboard sécurisé)
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['admin', 'moderator', 'viewer'], 
        default: 'viewer' 
    },
    discordId: String,
    lastLogin: Date,
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
});

const Admin = mongoose.model('Admin', adminSchema);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

function questionHidden(prompt) {
    return new Promise((resolve) => {
        process.stdout.write(prompt);
        const stdin = process.stdin;
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');
        
        let password = '';
        stdin.on('data', function(char) {
            char = char + '';
            switch (char) {
                case '\n':
                case '\r':
                case '\u0004':
                    stdin.setRawMode(false);
                    stdin.pause();
                    resolve(password);
                    break;
                case '\u0003':
                    process.exit();
                    break;
                default:
                    if (char.charCodeAt(0) === 8) { // Backspace
                        password = password.slice(0, -1);
                        process.stdout.write('\b \b');
                    } else {
                        password += char;
                        process.stdout.write('*');
                    }
                    break;
            }
        });
    });
}

async function createAdmin() {
    try {
        console.log('🔐 Création d\'un compte administrateur pour le dashboard Ynov\n');
        
        // Connexion à MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connecté à MongoDB Atlas\n');
        
        // Collecte des informations
        const username = await question('👤 Nom d\'utilisateur: ');
        const email = await question('📧 Email: ');
        
        console.log('🔑 Mot de passe: ');
        const password = await questionHidden('');
        console.log('\n');
        
        console.log('📋 Rôles disponibles:');
        console.log('   1. viewer    - Consultation uniquement');
        console.log('   2. moderator - Consultation + actions de modération');
        console.log('   3. admin     - Accès complet');
        
        const roleChoice = await question('🎭 Choisissez un rôle (1-3): ');
        const roles = { '1': 'viewer', '2': 'moderator', '3': 'admin' };
        const role = roles[roleChoice] || 'viewer';
        
        const discordId = await question('🎮 Discord ID (optionnel): ');
        
        // Validation
        if (!username || !email || !password) {
            console.log('❌ Tous les champs sont requis');
            process.exit(1);
        }
        
        if (password.length < 8) {
            console.log('❌ Le mot de passe doit faire au moins 8 caractères');
            process.exit(1);
        }
        
        // Vérifier si l'utilisateur existe déjà
        const existingAdmin = await Admin.findOne({
            $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
        });
        
        if (existingAdmin) {
            console.log('❌ Un administrateur avec ce nom d\'utilisateur ou cet email existe déjà');
            process.exit(1);
        }
        
        // Hachage du mot de passe
        console.log('🔐 Hachage du mot de passe...');
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Création de l'administrateur
        const admin = new Admin({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            role: role,
            discordId: discordId || undefined,
            createdAt: new Date(),
            isActive: true
        });
        
        await admin.save();
        
        console.log('\n🎉 Compte administrateur créé avec succès !');
        console.log('📋 Détails:');
        console.log(`   👤 Utilisateur: ${admin.username}`);
        console.log(`   📧 Email: ${admin.email}`);
        console.log(`   🎭 Rôle: ${admin.role}`);
        console.log(`   📅 Créé le: ${admin.createdAt.toLocaleString('fr-FR')}`);
        
        console.log('\n🔗 Connexion:');
        console.log(`   URL: http://localhost:${process.env.ADMIN_PORT || 3000}/login`);
        console.log(`   Nom d'utilisateur: ${admin.username}`);
        console.log(`   Mot de passe: [celui que vous avez saisi]`);
        
        // Compter les admins
        const totalAdmins = await Admin.countDocuments({ isActive: true });
        console.log(`\n📊 Total d'administrateurs actifs: ${totalAdmins}`);
        
    } catch (error) {
        if (error.code === 11000) {
            console.log('❌ Erreur: Un utilisateur avec ce nom ou cet email existe déjà');
        } else {
            console.log('❌ Erreur lors de la création:', error.message);
        }
        process.exit(1);
    } finally {
        rl.close();
        await mongoose.connection.close();
        process.exit(0);
    }
}

async function listAdmins() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const admins = await Admin.find({ isActive: true }).select('-password');
        
        console.log('👥 Administrateurs actifs:\n');
        
        if (admins.length === 0) {
            console.log('   Aucun administrateur trouvé');
        } else {
            admins.forEach((admin, index) => {
                console.log(`${index + 1}. ${admin.username}`);
                console.log(`   📧 ${admin.email}`);
                console.log(`   🎭 ${admin.role}`);
                console.log(`   📅 Créé: ${admin.createdAt.toLocaleString('fr-FR')}`);
                if (admin.lastLogin) {
                    console.log(`   🔑 Dernière connexion: ${admin.lastLogin.toLocaleString('fr-FR')}`);
                }
                console.log('');
            });
        }
        
    } catch (error) {
        console.log('❌ Erreur:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

// Gestion des arguments de ligne de commande
const command = process.argv[2];

if (command === 'list') {
    listAdmins();
} else {
    createAdmin();
}