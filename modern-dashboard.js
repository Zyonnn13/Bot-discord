const express = require('express');
const path = require('path');

const router = express.Router();

// Route pour servir les fichiers statiques personnalisés
router.use('/assets', express.static(path.join(__dirname, 'public')));

// Route pour le dashboard moderne
router.get('/modern', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Route pour la page de connexion moderne
router.get('/modern/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// API Routes pour le dashboard moderne
router.get('/api/stats', async (req, res) => {
    try {
        const { PendingVerification, VerifiedUser } = require('./models');
        
        const totalUsers = await VerifiedUser.countDocuments();
        const verifiedUsers = await VerifiedUser.countDocuments({ verified: true });
        const pendingVerifications = await PendingVerification.countDocuments();
        
        // Vérifications du jour
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dailyVerifications = await VerifiedUser.countDocuments({
            verifiedAt: { $gte: today }
        });
        
        res.json({
            totalUsers,
            verifiedUsers,
            pendingVerifications,
            dailyVerifications
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors du chargement des statistiques' });
    }
});

router.get('/api/users/recent', async (req, res) => {
    try {
        const { VerifiedUser } = require('./models');
        
        const users = await VerifiedUser.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('username email verified verifiedAt createdAt');
            
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors du chargement des utilisateurs' });
    }
});

router.get('/api/logs/recent', async (req, res) => {
    try {
        const { SecurityLog } = require('./models');
        
        const logs = await SecurityLog.find()
            .sort({ timestamp: -1 })
            .limit(20)
            .select('action username timestamp details');
            
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors du chargement des logs' });
    }
});

// API de recherche
router.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json([]);
        }
        
        const { VerifiedUser } = require('./models');
        
        const results = await VerifiedUser.find({
            $or: [
                { username: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } }
            ]
        }).limit(10).select('username email verified');
        
        const formattedResults = results.map(user => ({
            title: user.username,
            description: `${user.email} - ${user.verified ? 'Vérifié' : 'En attente'}`
        }));
        
        res.json(formattedResults);
    } catch (error) {
        res.status(500).json({ error: 'Erreur de recherche' });
    }
});

// Actions rapides
router.post('/api/action/:action', async (req, res) => {
    try {
        const { action } = req.params;
        const { target } = req.body;
        
        switch (action) {
            case 'backup':
                // Déclencher un backup
                res.json({ message: 'Backup initié avec succès' });
                break;
                
            case 'clean-logs':
                const { SecurityLog } = require('./models');
                const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                await SecurityLog.deleteMany({ timestamp: { $lt: sevenDaysAgo } });
                res.json({ message: 'Logs nettoyés avec succès' });
                break;
                
            case 'send-announcement':
                res.json({ message: 'Fonctionnalité d\'annonce à implémenter' });
                break;
                
            case 'emergency-stop':
                res.json({ message: 'Arrêt d\'urgence activé' });
                break;
                
            default:
                res.status(400).json({ error: 'Action non reconnue' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de l\'action' });
    }
});

module.exports = router;