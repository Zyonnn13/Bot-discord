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
        default: 'moderator' 
    },
    discordId: String,
    lastLogin: Date,
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
});

const Admin = mongoose.model('Admin', adminSchema);

// Liste de vos amis modérateurs
const moderators = [
    {
        username: 'mod1',
        email: 'moderateur1@example.com',
        password: 'ModPass123!',
        role: 'moderator'
    },
    {
        username: 'mod2', 
        email: 'moderateur2@example.com',
        password: 'ModPass456!',
        role: 'moderator'
    },
    {
        username: 'viewer1',
        email: 'viewer1@example.com', 
        password: 'ViewPass789!',
        role: 'viewer'
    }
    // Ajoutez autant d'amis que nécessaire
];

async function createModerators() {
    try {
        console.log('👥 Création des comptes modérateurs...\n');
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connecté à MongoDB Atlas\n');
        
        for (const mod of moderators) {
            try {
                // Vérifier si existe déjà
                const existing = await Admin.findOne({ username: mod.username });
                if (existing) {
                    console.log(`⚠️  ${mod.username} existe déjà - ignoré`);
                    continue;
                }
                
                // Créer le compte
                const hashedPassword = await bcrypt.hash(mod.password, 12);
                
                const admin = new Admin({
                    username: mod.username,
                    email: mod.email,
                    password: hashedPassword,
                    role: mod.role,
                    createdAt: new Date(),
                    isActive: true
                });
                
                await admin.save();
                
                console.log(`✅ ${mod.username} créé (${mod.role})`);
                console.log(`   📧 Email: ${mod.email}`);
                console.log(`   🔑 Mot de passe: ${mod.password}`);
                console.log('');
                
            } catch (error) {
                console.log(`❌ Erreur pour ${mod.username}:`, error.message);
            }
        }
        
        // Afficher tous les comptes
        const allAdmins = await Admin.find({ isActive: true }).select('-password');
        console.log('📋 Récapitulatif des comptes actifs:');
        allAdmins.forEach(admin => {
            console.log(`   👤 ${admin.username} (${admin.role}) - ${admin.email}`);
        });
        
    } catch (error) {
        console.log('❌ Erreur:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

createModerators();