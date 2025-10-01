const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { PendingVerification, VerifiedUser, SecurityLog, Stats } = require('./models');
const logger = require('./logger');

// Charger les variables d'environnement
require('dotenv').config();

const app = express();
const PORT = process.env.ADMIN_PORT || 3000;

// Configuration des sessions sécurisées
app.use(session({
    secret: process.env.SESSION_SECRET || 'ynov-admin-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'admin_sessions'
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS forcé en production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 heures
        sameSite: 'strict' // Protection CSRF
    }
}));

// Headers de sécurité
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
    next();
});

// Redirection HTTPS forcée en production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Schéma pour les administrateurs
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

// Middleware d'authentification
const requireAuth = (req, res, next) => {
    if (req.session && req.session.adminId) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Middleware de vérification de rôle
const requireRole = (minRole) => {
    const roleHierarchy = { 'viewer': 1, 'moderator': 2, 'admin': 3 };
    
    return async (req, res, next) => {
        if (!req.session.adminId) {
            return res.redirect('/login');
        }
        
        try {
            const admin = await Admin.findById(req.session.adminId);
            if (!admin || !admin.isActive) {
                req.session.destroy();
                return res.redirect('/login');
            }
            
            if (roleHierarchy[admin.role] >= roleHierarchy[minRole]) {
                req.admin = admin;
                next();
            } else {
                res.status(403).send('Accès refusé - Privilèges insuffisants');
            }
        } catch (error) {
            logger.error('Role verification error', { error: error.message });
            res.status(500).send('Erreur serveur');
        }
    };
};

// Connexion à MongoDB (si pas déjà connecté)
async function connectIfNeeded() {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
    }
}

// Page de connexion
app.get('/login', (req, res) => {
    if (req.session && req.session.adminId) {
        return res.redirect('/');
    }
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Connexion Admin - Bot Ynov</title>
        <meta charset="UTF-8">
        <style>
            body { 
                font-family: Arial, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0; padding: 0; height: 100vh;
                display: flex; align-items: center; justify-content: center;
            }
            .login-container { 
                background: white; padding: 40px; border-radius: 15px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: 400px; width: 100%;
            }
            .logo { text-align: center; margin-bottom: 30px; }
            .logo h1 { color: #667eea; margin: 0; font-size: 2em; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
            input[type="text"], input[type="password"] { 
                width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px;
                font-size: 16px; transition: border-color 0.3s;
            }
            input[type="text"]:focus, input[type="password"]:focus {
                outline: none; border-color: #667eea;
            }
            .btn { 
                width: 100%; padding: 12px; background: #667eea; color: white; 
                border: none; border-radius: 8px; font-size: 16px; font-weight: bold;
                cursor: pointer; transition: background 0.3s;
            }
            .btn:hover { background: #5a6fd8; }
            .error { color: #e74c3c; text-align: center; margin-top: 15px; }
            .info { color: #666; text-align: center; margin-top: 20px; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="login-container">
            <div class="logo">
                <h1>🎓 Admin Ynov</h1>
                <p>Dashboard de gestion du bot Discord</p>
            </div>
            
            <form method="POST" action="/login">
                <div class="form-group">
                    <label for="username">Nom d'utilisateur :</label>
                    <input type="text" id="username" name="username" required>
                </div>
                
                <div class="form-group">
                    <label for="password">Mot de passe :</label>
                    <input type="password" id="password" name="password" required>
                </div>
                
                <button type="submit" class="btn">Se connecter</button>
            </form>
            
            <div class="info">
                🔒 Accès réservé aux modérateurs autorisés
            </div>
        </div>
    </body>
    </html>
    `);
});

// Traitement de la connexion
app.post('/login', async (req, res) => {
    try {
        await connectIfNeeded();
        
        const { username, password } = req.body;
        
        const admin = await Admin.findOne({ 
            username: username.toLowerCase(),
            isActive: true 
        });
        
        if (!admin) {
            logger.warn('Failed login attempt - user not found', { username });
            return res.redirect('/login?error=invalid');
        }
        
        const isValidPassword = await bcrypt.compare(password, admin.password);
        
        if (!isValidPassword) {
            logger.warn('Failed login attempt - wrong password', { 
                username, 
                adminId: admin._id 
            });
            return res.redirect('/login?error=invalid');
        }
        
        // Connexion réussie
        req.session.adminId = admin._id;
        admin.lastLogin = new Date();
        await admin.save();
        
        logger.info('Admin login successful', { 
            username: admin.username,
            role: admin.role,
            adminId: admin._id 
        });
        
        res.redirect('/');
        
    } catch (error) {
        logger.error('Login error', { error: error.message });
        res.redirect('/login?error=server');
    }
});

// Déconnexion
app.get('/logout', (req, res) => {
    if (req.session.adminId) {
        logger.info('Admin logout', { adminId: req.session.adminId });
        req.session.destroy();
    }
    res.redirect('/login');
});

// Route principale - Dashboard (protégée)
app.get('/', requireAuth, requireRole('viewer'), (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Dashboard Admin - Bot Ynov</title>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;
                display: flex; justify-content: space-between; align-items: center;
            }
            .user-info { display: flex; align-items: center; gap: 15px; }
            .logout-btn { 
                background: rgba(255,255,255,0.2); color: white; padding: 8px 16px;
                border: none; border-radius: 5px; cursor: pointer; text-decoration: none;
            }
            .logout-btn:hover { background: rgba(255,255,255,0.3); }
            .container { max-width: 1200px; margin: 0 auto; }
            .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
            .stat-box { text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; }
            .stat-number { font-size: 2em; font-weight: bold; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .status-waiting { color: #f39c12; }
            .status-verified { color: #27ae60; }
            .status-failed { color: #e74c3c; }
            .btn { padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 2px; }
            .btn:hover { background: #0056b3; }
            .btn-danger { background: #dc3545; }
            .btn-danger:hover { background: #c82333; }
            .refresh-btn { float: right; }
            .role-badge { 
                padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;
                background: #28a745; color: white;
            }
            .role-admin { background: #dc3545; }
            .role-moderator { background: #ffc107; color: #333; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div>
                    <h1>🎓 Dashboard Admin - Bot Ynov</h1>
                    <p>Gestion sécurisée du bot Discord</p>
                </div>
                <div class="user-info">
                    <span id="admin-username">Chargement...</span>
                    <span id="admin-role" class="role-badge">Chargement...</span>
                    <a href="/logout" class="logout-btn">🚪 Déconnexion</a>
                </div>
            </div>
            
            <div class="card">
                <h2>📊 Statistiques en temps réel 
                    <button class="btn refresh-btn" onclick="location.reload()">🔄 Actualiser</button>
                </h2>
                <div class="stats" id="stats">
                    <div class="stat-box">
                        <div>👥 Utilisateurs en attente</div>
                        <div class="stat-number" id="pending-count">-</div>
                    </div>
                    <div class="stat-box">
                        <div>✅ Utilisateurs vérifiés</div>
                        <div class="stat-number" id="verified-count">-</div>
                    </div>
                    <div class="stat-box">
                        <div>🔒 Actions de sécurité (24h)</div>
                        <div class="stat-number" id="security-count">-</div>
                    </div>
                    <div class="stat-box">
                        <div>⚠️ Tentatives échouées (24h)</div>
                        <div class="stat-number" id="failed-count">-</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h2>⏳ Vérifications en cours</h2>
                <table id="pending-table">
                    <thead>
                        <tr>
                            <th>Utilisateur</th>
                            <th>Email</th>
                            <th>Statut</th>
                            <th>Tentatives</th>
                            <th>Date d'arrivée</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="pending-body">
                        <tr><td colspan="6">Chargement...</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="card">
                <h2>✅ Derniers utilisateurs vérifiés</h2>
                <table id="verified-table">
                    <thead>
                        <tr>
                            <th>Utilisateur</th>
                            <th>Email</th>
                            <th>Date de vérification</th>
                            <th>Méthode</th>
                        </tr>
                    </thead>
                    <tbody id="verified-body">
                        <tr><td colspan="4">Chargement...</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="card">
                <h2>🔒 Logs de sécurité récents</h2>
                <table id="security-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Utilisateur</th>
                            <th>Action</th>
                            <th>Détails</th>
                            <th>Succès</th>
                        </tr>
                    </thead>
                    <tbody id="security-body">
                        <tr><td colspan="5">Chargement...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <script>
            // Charger les données au chargement de la page
            document.addEventListener('DOMContentLoaded', async () => {
                await loadAdminInfo();
                await loadData();
            });

            async function loadAdminInfo() {
                try {
                    const response = await fetch('/api/admin/profile');
                    const admin = await response.json();
                    
                    document.getElementById('admin-username').textContent = admin.username;
                    const roleElement = document.getElementById('admin-role');
                    roleElement.textContent = admin.role;
                    roleElement.className = \`role-badge role-\${admin.role}\`;
                } catch (error) {
                    console.error('Erreur chargement profil admin:', error);
                }
            }

            async function loadData() {
                try {
                    // Charger les statistiques
                    const statsResponse = await fetch('/api/stats');
                    const stats = await statsResponse.json();
                    
                    document.getElementById('pending-count').textContent = stats.pendingCount;
                    document.getElementById('verified-count').textContent = stats.verifiedCount;
                    document.getElementById('security-count').textContent = stats.securityCount;
                    document.getElementById('failed-count').textContent = stats.failedCount;

                    // Charger les vérifications en cours
                    const pendingResponse = await fetch('/api/pending');
                    const pending = await pendingResponse.json();
                    
                    const pendingBody = document.getElementById('pending-body');
                    pendingBody.innerHTML = pending.map(user => \`
                        <tr>
                            <td>\${user.username}</td>
                            <td>\${user.email || 'En attente'}</td>
                            <td class="status-\${user.status}">\${getStatusText(user.status)}</td>
                            <td>\${user.attempts}/3</td>
                            <td>\${new Date(user.joinedAt).toLocaleString('fr-FR')}</td>
                            <td>
                                <button class="btn btn-danger" onclick="removeUser('\${user.userId}')">Supprimer</button>
                            </td>
                        </tr>
                    \`).join('');

                    // Charger les utilisateurs vérifiés
                    const verifiedResponse = await fetch('/api/verified');
                    const verified = await verifiedResponse.json();
                    
                    const verifiedBody = document.getElementById('verified-body');
                    verifiedBody.innerHTML = verified.map(user => \`
                        <tr>
                            <td>\${user.username}</td>
                            <td>\${user.email}</td>
                            <td>\${new Date(user.verifiedAt).toLocaleString('fr-FR')}</td>
                            <td>\${user.verificationMethod}</td>
                        </tr>
                    \`).join('');

                    // Charger les logs de sécurité
                    const securityResponse = await fetch('/api/security-logs');
                    const securityLogs = await securityResponse.json();
                    
                    const securityBody = document.getElementById('security-body');
                    securityBody.innerHTML = securityLogs.map(log => \`
                        <tr>
                            <td>\${new Date(log.timestamp).toLocaleString('fr-FR')}</td>
                            <td>\${log.username}</td>
                            <td>\${log.action}</td>
                            <td>\${log.details}</td>
                            <td>\${log.success ? '✅' : '❌'}</td>
                        </tr>
                    \`).join('');

                } catch (error) {
                    console.error('Erreur lors du chargement des données:', error);
                }
            }

            function getStatusText(status) {
                switch(status) {
                    case 'waiting_email': return 'Attente email';
                    case 'waiting_code': return 'Attente code';
                    case 'verified': return 'Vérifié';
                    case 'failed': return 'Échec';
                    default: return status;
                }
            }

            async function removeUser(userId) {
                if (confirm('Êtes-vous sûr de vouloir supprimer cette vérification ?')) {
                    try {
                        await fetch(\`/api/pending/\${userId}\`, { method: 'DELETE' });
                        loadData(); // Recharger les données
                    } catch (error) {
                        alert('Erreur lors de la suppression');
                    }
                }
            }
        </script>
    </body>
    </html>
    `);
});

// API Routes (toutes protégées)

// Profil admin
app.get('/api/admin/profile', requireAuth, async (req, res) => {
    try {
        const admin = await Admin.findById(req.session.adminId).select('-password');
        res.json(admin);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Statistiques
app.get('/api/stats', requireAuth, requireRole('viewer'), async (req, res) => {
    try {
        await connectIfNeeded();
        
        const pendingCount = await PendingVerification.countDocuments();
        const verifiedCount = await VerifiedUser.countDocuments();
        
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const securityCount = await SecurityLog.countDocuments({ 
            timestamp: { $gte: yesterday } 
        });
        const failedCount = await SecurityLog.countDocuments({ 
            timestamp: { $gte: yesterday },
            success: false 
        });
        
        res.json({
            pendingCount,
            verifiedCount,
            securityCount,
            failedCount
        });
    } catch (error) {
        logger.error('Error fetching stats', { error: error.message });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Vérifications en cours
app.get('/api/pending', requireAuth, requireRole('viewer'), async (req, res) => {
    try {
        await connectIfNeeded();
        
        const pending = await PendingVerification.find()
            .sort({ joinedAt: -1 })
            .limit(50);
        
        res.json(pending);
    } catch (error) {
        logger.error('Error fetching pending verifications', { error: error.message });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Utilisateurs vérifiés
app.get('/api/verified', requireAuth, requireRole('viewer'), async (req, res) => {
    try {
        await connectIfNeeded();
        
        const verified = await VerifiedUser.find()
            .sort({ verifiedAt: -1 })
            .limit(50);
        
        res.json(verified);
    } catch (error) {
        logger.error('Error fetching verified users', { error: error.message });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Logs de sécurité
app.get('/api/security-logs', requireAuth, requireRole('moderator'), async (req, res) => {
    try {
        await connectIfNeeded();
        
        const logs = await SecurityLog.find()
            .sort({ timestamp: -1 })
            .limit(100);
        
        res.json(logs);
    } catch (error) {
        logger.error('Error fetching security logs', { error: error.message });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer une vérification en cours (modérateurs uniquement)
app.delete('/api/pending/:userId', requireAuth, requireRole('moderator'), async (req, res) => {
    try {
        await connectIfNeeded();
        
        const { userId } = req.params;
        await PendingVerification.deleteOne({ userId });
        
        logger.info('Pending verification removed by admin', { 
            userId, 
            adminId: req.session.adminId 
        });
        res.json({ success: true });
    } catch (error) {
        logger.error('Error removing pending verification', { error: error.message });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Démarrer le serveur
app.listen(PORT, () => {
    logger.info(`Secure admin dashboard started on port ${PORT}`);
    console.log(`🔒 Dashboard admin sécurisé accessible sur: http://localhost:${PORT}`);
    console.log(`🔑 Créez un compte admin avec le script: npm run create-admin`);
});

module.exports = { app, Admin };