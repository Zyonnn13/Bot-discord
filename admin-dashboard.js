const express = require('express');
const mongoose = require('mongoose');
const { PendingVerification, VerifiedUser, SecurityLog, Stats } = require('./models');
const logger = require('./logger');

// Charger les variables d'environnement
require('dotenv').config();

const app = express();
const PORT = process.env.ADMIN_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Connexion à MongoDB (si pas déjà connecté)
async function connectIfNeeded() {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
    }
}

// Route principale - Dashboard
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Dashboard Admin - Bot Ynov</title>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
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
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎓 Dashboard Admin - Bot Ynov</h1>
            
            <div class="card">
                <h2>📊 Statistiques en temps réel <button class="btn refresh-btn" onclick="location.reload()">🔄 Actualiser</button></h2>
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
            document.addEventListener('DOMContentLoaded', loadData);

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

// API Routes

// Statistiques
app.get('/api/stats', async (req, res) => {
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
app.get('/api/pending', async (req, res) => {
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
app.get('/api/verified', async (req, res) => {
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
app.get('/api/security-logs', async (req, res) => {
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

// Supprimer une vérification en cours
app.delete('/api/pending/:userId', async (req, res) => {
    try {
        await connectIfNeeded();
        
        const { userId } = req.params;
        await PendingVerification.deleteOne({ userId });
        
        logger.info('Pending verification removed by admin', { userId });
        res.json({ success: true });
    } catch (error) {
        logger.error('Error removing pending verification', { error: error.message });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Démarrer le serveur
app.listen(PORT, () => {
    logger.info(`Admin dashboard started on port ${PORT}`);
    console.log(`🌐 Dashboard admin accessible sur: http://localhost:${PORT}`);
});

module.exports = app;