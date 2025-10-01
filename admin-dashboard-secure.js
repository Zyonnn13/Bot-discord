// Clean server: minimal routes required by modern dashboard
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const { VerifiedUser, SecurityLog, AuthorizedAdmin } = require('./models');
const logger = require('./logger');

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
    logger.error('Error checking authorized email', { error: error.message });
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
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI);
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
    req.session.role = admin.role;
    admin.lastLogin = new Date();
    await admin.save();
    return res.json({ success: true, message: 'Connexion réussie', role: admin.role });
  } catch (e) {
    logger.error('Login error', { error: e.message });
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
    logger.error('Signup error', { error: e.message });
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
    logger.error('Stats API error', { error: e.message });
    return res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

app.get('/logout', (req, res) => {
  if (req.session?.adminId) req.session.destroy();
  return res.redirect('/login');
});

app.listen(PORT, () => {
  logger.info(`Secure admin dashboard started on port ${PORT}`);
  console.log(`🔒 Dashboard admin sécurisé accessible sur: http://localhost:${PORT}`);
});

module.exports = { app, Admin };