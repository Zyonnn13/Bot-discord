# 🎯 Ynov Discord Dashboard

Dashboard PWA moderne pour la gestion et le monitoring du serveur Discord Ynov avec branding personnalisé.

## ✨ Fonctionnalités

- 🎨 **Design Ynov** : Interface avec le branding officiel Ynov (logo, couleurs)
- 📱 **PWA Mobile** : Application web progressive installable sur mobile
- 📊 **Dashboard en temps réel** : Statistiques du serveur Discord 
- 🔐 **Authentification sécurisée** : Système de login/signup avec sessions
- 👥 **Gestion des admins** : Système d'autorisation par email
- 🎯 **Interface moderne** : Design glassmorphism responsive

## 🚀 Installation

```bash
# Installation des dépendances
npm install

# Configuration des variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Démarrage en développement
npm run dev

# Démarrage en production
npm start
```

## 📱 Application Mobile (PWA)

L'application est accessible en version PWA sur mobile :

1. Ouvrir le navigateur mobile
2. Aller sur `https://votre-domain.com/dashboard`
3. Cliquer sur "Installer l'application" ou "Ajouter à l'écran d'accueil"

## 🔧 Configuration

Variables d'environnement requises :

```env
DISCORD_TOKEN=votre_token_discord
MONGODB_URI=votre_uri_mongodb
GUILD_ID=id_de_votre_serveur
SESSION_SECRET=secret_pour_sessions
AUTHORIZED_ADMIN_EMAILS=email1@ynov.com,email2@ynov.com
```

## 👥 Gestion des Admins

```bash
# Ajouter un email autorisé
npm run manage-emails

# Puis suivre les instructions pour ajouter/supprimer des emails
```

## 🎨 Branding

Le dashboard utilise le branding officiel Ynov :
- Couleurs : Violet (#7c3aed) et dégradés
- Logo : YNOV + icône Discord + AIDE
- Interface moderne avec glassmorphism

## 📊 API Endpoints

- `GET /api/modern-stats` - Statistiques du serveur
- `GET /healthz` - Health check
- `POST /api/login` - Connexion
- `POST /api/signup` - Inscription

## 🏗️ Architecture

```
├── admin-dashboard-secure.js  # Serveur principal
├── models.js                  # Modèles MongoDB
├── manage-authorized-emails.js # Gestion des admins
├── views/                     # Pages HTML
│   ├── login.html
│   ├── signup.html
│   └── dashboard.html
├── public/                    # Assets statiques
│   ├── css/
│   ├── js/
│   ├── img/
│   └── manifest.json         # Configuration PWA
└── .env                      # Variables d'environnement
```

## 🚀 Déployment

Le projet est configuré pour Render avec auto-déploiement :

1. Connecter le repo GitHub à Render
2. Configurer les variables d'environnement
3. Le déploiement se fait automatiquement

---

**© 2024 Ynov - Dashboard Discord avec branding officiel**