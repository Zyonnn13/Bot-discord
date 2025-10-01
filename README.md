# 🎓 Bot Discord Ynov - Version Enterprise

Bot Discord professionnel avec système de vérification par email @ynov.com, conçu pour gérer des milliers d'utilisateurs avec une sécurité renforcée.

## ✨ Fonctionnalités

### 🔐 Sécurité avancée
- ✅ Vérification par **email réel** avec code à 6 chiffres
- ✅ **Rate limiting** intelligent (3 tentatives, cooldown de 60 minutes)
- ✅ **Logs de sécurité** détaillés avec rotation automatique
- ✅ **Base de données MongoDB** persistante et scalable
- ✅ **Système de sauvegarde** automatique quotidien

### 🤖 Gestion automatique
- ✅ Détection automatique des nouveaux membres
- ✅ Attribution de rôles temporaires et définitifs
- ✅ Envoi d'emails de vérification professionnels
- ✅ Gestion des utilisateurs déjà vérifiés
- ✅ **Dashboard web d'administration**

### 📊 Monitoring
- ✅ Dashboard web temps réel
- ✅ Statistiques complètes
- ✅ Logs de sécurité consultables
- ✅ Gestion des vérifications en cours

## 🚀 Installation

### 1. Prérequis
- Node.js 16+ 
- Compte MongoDB Atlas (gratuit)
- Bot Discord configuré
- Email Gmail avec mot de passe d'application

### 2. Configuration
1. Clonez ou téléchargez ce projet
2. Installez les dépendances : `npm install`
3. Configurez votre fichier `.env` (voir section suivante)
4. Testez la configuration : `npm test`
5. Démarrez le bot : `npm start`

### 3. Configuration du fichier .env

```env
# Discord Configuration
DISCORD_TOKEN=votre_token_de_bot
GUILD_ID=id_de_votre_serveur
UNVERIFIED_ROLE_ID=id_role_non_verifie
VERIFIED_ROLE_ID=id_role_etudiant_ynov

# MongoDB Configuration  
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ynov-bot

# Email Configuration (Gmail recommandé)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre_email@gmail.com
EMAIL_PASS=votre_mot_de_passe_app
EMAIL_FROM=noreply@ynov.com

# Rate Limiting
MAX_VERIFICATION_ATTEMPTS=3
VERIFICATION_COOLDOWN_MINUTES=60

# Admin Dashboard
ADMIN_PORT=3000
```

## 🔧 Configuration MongoDB Atlas

1. Créez un compte sur [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Créez un nouveau cluster (gratuit M0)
3. Configurez un utilisateur de base de données
4. Ajoutez votre IP dans la whitelist (0.0.0.0/0 pour tous)
5. Récupérez votre connection string

## 📧 Configuration Email (Gmail)

1. Activez la **2FA** sur votre compte Gmail
2. Générez un **mot de passe d'application** :
   - Google Account → Sécurité → 2FA → Mots de passe d'application
3. Utilisez ce mot de passe dans `EMAIL_PASS`

## 🎭 Configuration Discord

### Rôles requis
Créez ces rôles sur votre serveur Discord :

1. **"Non vérifié"** - Rôle temporaire limitant l'accès
2. **"Étudiant Ynov"** - Rôle final avec accès complet

### Permissions du bot
Le bot nécessite ces permissions :
- Gérer les rôles
- Envoyer des messages
- Lire l'historique des messages
- Envoyer des messages privés

## 🚀 Utilisation

### Démarrage
```bash
# Test de configuration
npm test

# Démarrer le bot
npm start

# Démarrer en mode développement
npm run dev

# Lancer le dashboard admin
npm run admin

# Créer une sauvegarde manuelle
npm run backup
```

### Dashboard Admin
Accédez au dashboard sur `http://localhost:3000` pour :
- 📊 Voir les statistiques en temps réel
- 👥 Gérer les vérifications en cours
- 🔒 Consulter les logs de sécurité
- ✅ Voir les utilisateurs vérifiés

## 🔄 Flux de vérification

1. **Nouveau membre rejoint** → Rôle "Non vérifié" attribué
2. **Bot envoie un DM** → Demande l'email @ynov.com
3. **Utilisateur répond** → `prenom.nom@ynov.com`
4. **Validation email** → Code 6 chiffres envoyé par email
5. **Code confirmé** → Rôle "Étudiant Ynov" attribué
6. **Accès accordé** → Utilisateur peut accéder au serveur

## 📁 Structure des fichiers

```
ynov-discord-bot/
├── main-mongodb.js        # Bot principal avec MongoDB
├── models.js             # Schémas MongoDB
├── emailService.js       # Service d'envoi d'emails
├── logger.js            # Système de logs avancé
├── backupService.js     # Système de sauvegarde
├── admin-dashboard.js   # Interface web d'admin
├── test-connection.js   # Script de test
├── .env                 # Configuration
├── package.json         # Dépendances
├── logs/               # Dossier des logs
└── backups/           # Dossier des sauvegardes
```

## 🔒 Sécurité

### Mesures implémentées
- ✅ Rate limiting (3 tentatives max)
- ✅ Cooldown automatique (60 minutes)
- ✅ Validation stricte des emails @ynov.com
- ✅ Codes temporaires (expiration 10 minutes)
- ✅ Logs détaillés de toutes les actions
- ✅ Détection d'emails déjà utilisés
- ✅ Sauvegarde automatique des données

### Pour des milliers d'utilisateurs
Ce bot est conçu pour gérer une charge importante :
- Base de données MongoDB scalable
- Logs avec rotation automatique
- Système de sauvegarde robuste
- Dashboard de monitoring
- Rate limiting intelligent

## 📊 Monitoring et Maintenance

### Logs disponibles
- `logs/error.log` - Erreurs uniquement
- `logs/security.log` - Actions de sécurité
- `logs/combined.log` - Tous les logs

### Sauvegardes automatiques
- **Quotidienne** à 2h00 - Sauvegarde complète
- **Hebdomadaire** - Archivage des logs anciens
- **Rétention** - 30 jours de sauvegardes

### Surveillance
- Dashboard web en temps réel
- Alertes dans les logs
- Statistiques d'utilisation
- Métriques de performance

## 🆘 Dépannage

### Problèmes courants

**Bot ne se connecte pas**
- Vérifiez le token Discord
- Vérifiez la connexion MongoDB

**Emails non envoyés**  
- Vérifiez les identifiants Gmail
- Confirmez que la 2FA est activée
- Utilisez un mot de passe d'application

**Erreurs de rôles**
- Vérifiez les IDs des rôles
- Confirmez les permissions du bot

### Support
En cas de problème, consultez :
1. Les logs dans le dossier `logs/`
2. Le résultat de `npm test`  
3. Le dashboard admin pour les statistiques

## 📝 Développement

### Contribuer
Pour contribuer au projet :
1. Fork le repository
2. Créez une branche feature
3. Testez vos modifications
4. Soumettez une pull request

### Structure du code
- **Modulaire** - Chaque fonctionnalité dans son fichier
- **Async/Await** - Gestion moderne des promesses  
- **Error handling** - Gestion robuste des erreurs
- **Logging** - Traçabilité complète
- **Documentation** - Code commenté

---

## 🎉 Version Enterprise prête !

Ce bot est maintenant prêt pour un usage professionnel avec des milliers d'utilisateurs. Toutes les mesures de sécurité, monitoring et sauvegarde sont en place.

**Bon déploiement ! 🚀**