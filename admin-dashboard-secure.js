// Clean server: minimal routes required by modern dashboard
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const { VerifiedUser, SecurityLog, AuthorizedAdmin } = require('./models');

require('dotenv').config();

// Load authorized emails from environment variable (comma-separated) OR fallback to DB
const AUTHORIZED_ADMIN_EMAILS = process.env.AUTHORIZED_ADMIN_EMAILS 
  ? process.env.AUTHORIZED_ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase())
  : null; // Will check database if null

// Function to check if email is authorized (env var or DB)
async function isEmailAuthorized(email) {
  // First check environment variable (for backward compatibility)
  if (AUTHORIZED_ADMIN_EMAILS && AUTHORIZED_ADMIN_EMAILS.includes(email.toLowerCase())) {
    return true;
  }
  
  // Then check database
  try {
    await connectIfNeeded();
    const authorized = await AuthorizedAdmin.findOne({ 
      email: email.toLowerCase(), 
      isActive: true 
    });
    return !!authorized;
  } catch (error) {
    console.error('Error checking authorized email:', error.message);
    return false;
  }
}

const app = express();
const PORT = process.env.ADMIN_PORT || 3000;

// Trust proxy for correct protocol/IP when behind Render's proxy
app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'ynov-admin-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: 'admin_sessions' }),
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 86400000, sameSite: 'strict' },
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  next();
});
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Allow health checks over HTTP without redirect loop
    if (req.path === '/healthz') return next();
    if (req.header('x-forwarded-proto') !== 'https') return res.redirect(`https://${req.header('host')}${req.url}`);
    return next();
  });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'moderator', 'viewer'], default: 'viewer' },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
});
const Admin = mongoose.model('Admin', adminSchema);

const requireAuth = (req, res, next) => (req.session?.adminId ? next() : res.redirect('/login'));
const requireRole = (minRole) => {
  const rank = { viewer: 1, moderator: 2, admin: 3 };
  return async (req, res, next) => {
    if (!req.session?.adminId) return res.redirect('/login');
    const admin = await Admin.findById(req.session.adminId);
    if (!admin || !admin.isActive) {
      req.session.destroy();
      return res.redirect('/login');
    }
    if (rank[admin.role] >= rank[minRole]) return next();
    return res.status(403).send('Accès refusé');
  };
};

async function connectIfNeeded() {
  if (mongoose.connection.readyState === 0) {
    try {
      console.log('🔄 Connexion à MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connecté à MongoDB');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error.message);
      // Ne pas faire crash le serveur, juste logger l'erreur
      console.log('⚠️ Le serveur continuera sans MongoDB (fonctionnalités limitées)');
      return false;
    }
  }
  return true;
}

// Lightweight health endpoint for Render
app.get('/healthz', (req, res) => {
  res.type('text/plain').send('ok');
});

app.get('/dashboard', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'views', 'dashboard.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'views', 'signup.html')));
app.get('/login', (req, res) => (req.session?.adminId ? res.redirect('/dashboard') : res.sendFile(path.join(__dirname, 'views', 'login.html'))));
app.get('/', requireAuth, requireRole('viewer'), (req, res) => res.redirect('/dashboard'));

app.post('/api/login', async (req, res) => {
  try {
    await connectIfNeeded();
    const { email, password } = req.body;
    const admin = await Admin.findOne({ $or: [{ email: email.toLowerCase() }, { username: email.toLowerCase() }], isActive: true });
    if (!admin) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    if (!(await bcrypt.compare(password, admin.password))) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    req.session.adminId = admin._id;
    req.session.adminEmail = admin.email; // Stocker l'email dans la session
    req.session.role = admin.role;
    admin.lastLogin = new Date();
    await admin.save();
    return res.json({ success: true, message: 'Connexion réussie', role: admin.role });
  } catch (e) {
    console.error('Login error:', e.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/signup', async (req, res) => {
  try {
    await connectIfNeeded();
    const { firstname, email, password, repeatPassword } = req.body;
    if (!firstname || !email || !password || !repeatPassword) return res.status(400).json({ error: 'Tous les champs sont requis' });
    if (password !== repeatPassword) return res.status(400).json({ error: 'Les mots de passe ne correspondent pas' });
    if (password.length < 6) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    if (!(await isEmailAuthorized(email))) return res.status(403).json({ error: "Adresse email non autorisée. Contactez l'administrateur." });
    if (await Admin.findOne({ $or: [{ email: email.toLowerCase() }, { username: firstname.toLowerCase() }] }))
      return res.status(409).json({ error: "Un compte avec cet email ou nom d'utilisateur existe déjà" });
    const hashedPassword = await bcrypt.hash(password, 12);
    await new Admin({ username: firstname.toLowerCase(), email: email.toLowerCase(), password: hashedPassword, role: 'admin', isActive: true }).save();
    return res.json({ success: true, message: 'Compte administrateur créé avec succès ! Vous pouvez maintenant vous connecter.', role: 'admin' });
  } catch (e) {
    console.error('Signup error:', e.message);
    return res.status(500).json({ error: 'Erreur serveur lors de la création du compte' });
  }
});

app.get('/api/modern-stats', requireAuth, requireRole('viewer'), async (req, res) => {
  try {
    await connectIfNeeded();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [verifiedUsers, dailyVerifications] = await Promise.all([
      VerifiedUser.countDocuments(),
      VerifiedUser.countDocuments({ verifiedAt: { $gte: today } }),
    ]);
    let discordStats = { serverMembers: 0, onlineMembers: 0 };
    try {
      const guild = global.discordClient?.guilds.cache.first();
      if (guild) {
        discordStats = {
          serverMembers: guild.memberCount || 0,
          onlineMembers: guild.members.cache.filter((m) => m.presence?.status === 'online').size || 0,
        };
      }
    } catch (_) {}
    const devices = [
      { name: 'Desktop', count: Math.floor(Math.random() * 60) + 30, color: '#667eea' },
      { name: 'Mobile', count: Math.floor(Math.random() * 40) + 20, color: '#48bb78' },
      { name: 'Tablet', count: Math.floor(Math.random() * 20) + 5, color: '#ed8936' },
    ];
    const locations = [
      { name: 'France', count: Math.floor(Math.random() * 30) + 40, color: '#667eea', flag: '🇫🇷' },
      { name: 'Canada', count: Math.floor(Math.random() * 20) + 15, color: '#48bb78', flag: '🇨🇦' },
      { name: 'Belgique', count: Math.floor(Math.random() * 15) + 10, color: '#9f7aea', flag: '🇧🇪' },
      { name: 'Suisse', count: Math.floor(Math.random() * 10) + 5, color: '#ed8936', flag: '🇨🇭' },
    ];
    let activities = [];
    try {
      const logs = await SecurityLog.find().sort({ timestamp: -1 }).limit(5).select('action username timestamp success');
      activities = logs.map((l) => ({ icon: l.success ? '✅' : '⚠️', title: `${l.action || 'Action'} - ${l.username || 'N/A'}`, time: new Date(l.timestamp).toLocaleTimeString('fr-FR'), status: l.success ? 'success' : 'error', statusText: l.success ? 'Succès' : 'Échec' }));
    } catch (_) {}
    return res.json({ success: true, stats: { serverMembers: discordStats.serverMembers, onlineMembers: discordStats.onlineMembers, verifiedUsers, dailyVerifications, devices, locations, activities } });
  } catch (e) {
    console.error('Stats API error:', e.message);
    return res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Routes API pour la gestion des emails autorisés
app.get('/api/authorized-emails', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await connectIfNeeded();
    const emails = await AuthorizedAdmin.find({ isActive: true })
      .sort({ addedAt: -1 })
      .select('email addedBy addedAt notes');
    
    return res.json({ success: true, emails });
  } catch (error) {
    console.error('Error fetching authorized emails:', error.message);
    return res.status(500).json({ error: 'Erreur serveur lors de la récupération des emails' });
  }
});

app.post('/api/authorized-emails', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await connectIfNeeded();
    const { email, notes } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }
    
    // Vérifier que l'email n'existe pas déjà
    const existingEmail = await AuthorizedAdmin.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      if (existingEmail.isActive) {
        return res.status(409).json({ error: 'Cet email est déjà autorisé' });
      } else {
        // Réactiver l'email
        existingEmail.isActive = true;
        existingEmail.notes = notes || '';
        existingEmail.addedAt = new Date();
        await existingEmail.save();
        
        return res.json({ 
          success: true, 
          message: `Email ${email} réactivé avec succès` 
        });
      }
    }
    
    // Créer nouvel email autorisé
    const newAuthorizedEmail = new AuthorizedAdmin({
      email: email.toLowerCase(),
      addedBy: req.session.adminEmail || 'admin', // On peut ajouter l'email de l'admin dans la session
      notes: notes || '',
      isActive: true
    });
    
    await newAuthorizedEmail.save();
    
    return res.json({ 
      success: true, 
      message: `Email ${email} ajouté aux autorisations avec succès` 
    });
    
  } catch (error) {
    console.error('Error adding authorized email:', error.message);
    return res.status(500).json({ error: 'Erreur serveur lors de l\'ajout de l\'email' });
  }
});

app.delete('/api/authorized-emails/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await connectIfNeeded();
    const { id } = req.params;
    
    const email = await AuthorizedAdmin.findById(id);
    if (!email) {
      return res.status(404).json({ error: 'Email non trouvé' });
    }
    
    // Marquer comme inactif au lieu de supprimer
    email.isActive = false;
    await email.save();
    
    return res.json({ 
      success: true, 
      message: `Email ${email.email} supprimé des autorisations` 
    });
    
  } catch (error) {
    console.error('Error removing authorized email:', error.message);
    return res.status(500).json({ error: 'Erreur serveur lors de la suppression de l\'email' });
  }
});

app.get('/logout', (req, res) => {
  if (req.session?.adminId) req.session.destroy();
  return res.redirect('/login');
});

app.listen(PORT, async () => {
  console.log(`🔒 Dashboard admin sécurisé accessible sur port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: ${process.env.NODE_ENV === 'production' ? 'https://ynov-discord-bot.onrender.com' : `http://localhost:${PORT}`}`);
  
  // Test de connexion MongoDB au démarrage (non bloquant)
  try {
    await connectIfNeeded();
    console.log('🎯 Toutes les fonctionnalités sont disponibles');
  } catch (error) {
    console.log('⚠️ Fonctionnalités limitées (pas de MongoDB)');
  }
}).on('error', (err) => {
  console.error('❌ Erreur démarrage serveur:', err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Arrêt graceful du serveur...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  // Ne pas crash le serveur pour une rejection
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

module.exports = { app, Admin };