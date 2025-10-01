require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Schéma Admin
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['admin', 'moderator', 'viewer'], 
        default: 'admin' 
    },
    discordId: String,
    lastLogin: Date,
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
});

const Admin = mongoose.model('Admin', adminSchema);

async function createDefaultAdmin() {
    try {
        console.log('🔐 Création automatique d\'un admin par défaut...\n');
        
        // Connexion à MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connecté à MongoDB Atlas');
        
        // Données par défaut
        const defaultAdmin = {
            username: 'admin',
            email: 'clementbelmondo@gmail.com',
            password: 'Clement13#@#', // Sera haché
            role: 'admin',
            discordId: ''
        };
        
        // Vérifier si l'admin existe déjà
        const existing = await Admin.findOne({ username: defaultAdmin.username });
        if (existing) {
            console.log('❌ Un admin avec ce nom existe déjà');
            console.log('✅ Utilisez ces identifiants :');
            console.log(`   👤 Nom d'utilisateur: ${defaultAdmin.username}`);
            console.log(`   🔑 Mot de passe: [votre mot de passe existant]`);
            process.exit(0);
        }
        
        // Hachage du mot de passe
        console.log('🔐 Hachage du mot de passe...');
        const hashedPassword = await bcrypt.hash(defaultAdmin.password, 12);
        
        // Création
        const admin = new Admin({
            username: defaultAdmin.username,
            email: defaultAdmin.email,
            password: hashedPassword,
            role: defaultAdmin.role,
            createdAt: new Date(),
            isActive: true
        });
        
        await admin.save();
        
        console.log('\n🎉 Admin créé avec succès !');
        console.log('📋 Identifiants de connexion :');
        console.log(`   👤 Nom d'utilisateur: ${defaultAdmin.username}`);
        console.log(`   🔑 Mot de passe: ${defaultAdmin.password}`);
        console.log(`   🎭 Rôle: ${defaultAdmin.role}`);
        
        console.log('\n🔗 Pour vous connecter :');
        console.log(`   1. Lancez: npm run admin-secure`);
        console.log(`   2. Allez sur: http://localhost:3000/login`);
        console.log(`   3. Utilisez les identifiants ci-dessus`);
        
    } catch (error) {
        console.log('❌ Erreur:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

createDefaultAdmin();