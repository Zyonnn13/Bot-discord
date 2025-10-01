# 🚀 Guide de déploiement sur Render

## ✅ Prérequis
- Compte GitHub (gratuit)
- Compte Render (gratuit)
- Votre bot Discord fonctionne en local

## 📂 Étape 1 : Préparer le code

1. **Créez un repository GitHub :**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Ynov Discord Bot Enterprise"
   git branch -M main
   git remote add origin https://github.com/VOTRE-USERNAME/ynov-discord-bot.git
   git push -u origin main
   ```

2. **Vérifiez que ces fichiers sont présents :**
   - ✅ `start.js` (point d'entrée)
   - ✅ `package.json` (dépendances)
   - ✅ `render.yaml` (configuration)
   - ✅ `.env.production` (exemple de variables)

## 🌐 Étape 2 : Déployer sur Render

### 1. Créer le service
1. Allez sur [render.com](https://render.com)
2. Connectez-vous / Créez un compte (gratuit)
3. Cliquez sur **"New +"** → **"Web Service"**
4. Connectez votre repository GitHub
5. Sélectionnez votre repository `ynov-discord-bot`

### 2. Configuration du service
- **Name:** `ynov-discord-bot`
- **Environment:** `Node`
- **Region:** `Frankfurt` (plus proche de l'Europe)
- **Branch:** `main`
- **Build Command:** `npm install`
- **Start Command:** `node start.js`
- **Plan:** `Free` (0$/mois)

### 3. Variables d'environnement
Dans la section **"Environment"**, ajoutez TOUTES ces variables :

```env
DISCORD_TOKEN=MTQyMjI3OTIwMjUzODkxODExMg.GMSmj4.2qzNTzr-KNeItJ8y6ZV7PnifZYPVOyLZNkPPFs
GUILD_ID=1422220722608017572
UNVERIFIED_ROLE_ID=1422269296050176200
VERIFIED_ROLE_ID=1422223896504963173
MONGODB_URI=mongodb+srv://clementbelmondo_db_user:laLE2FNnOhjtufKX@cluster0.dytwxqk.mongodb.net/ynov-bot?retryWrites=true&w=majority
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=clementbelmondo@gmail.com
EMAIL_PASS=orgarjwltxdvrsjn
EMAIL_FROM=noreply@ynov.com
SESSION_SECRET=ynov-super-secret-key-2024-secure
MAX_VERIFICATION_ATTEMPTS=3
VERIFICATION_COOLDOWN_MINUTES=60
NODE_ENV=production
PORT=3000
```

### 4. Déploiement
1. Cliquez sur **"Create Web Service"**
2. Render va automatiquement :
   - Cloner votre code
   - Installer les dépendances (`npm install`)
   - Démarrer le service (`node start.js`)

## 🎉 Étape 3 : Accès au dashboard

Une fois déployé, vous obtiendrez une URL comme :
```
https://ynov-discord-bot-XXXXX.onrender.com
```

### Connexion au dashboard :
1. Allez sur votre URL Render
2. Vous serez redirigé vers `/login`
3. Connectez-vous avec :
   - **Username:** `admin`
   - **Password:** `Clement13#@#`

## 🔧 Gestion des modérateurs

### Créer des comptes pour vos amis :
1. Connectez-vous en SSH à votre service (ou utilisez les logs)
2. Exécutez : `node create-admin.js`
3. Ou modifiez le fichier `create-moderators.js` et redéployez

### Rôles disponibles :
- **admin** : Accès complet
- **moderator** : Consultation + actions de modération
- **viewer** : Consultation uniquement

## 📊 Monitoring

### Logs disponibles :
- **Render Dashboard** : Logs en temps réel
- **Application Logs** : Dans `/logs/` (downloadable)
- **MongoDB Atlas** : Métriques de base de données

### URLs importantes :
- **Dashboard Admin :** `https://votre-url.onrender.com`
- **Health Check :** `https://votre-url.onrender.com/api/stats`
- **Login :** `https://votre-url.onrender.com/login`

## ⚠️ Limitations du plan gratuit Render

- **750h/mois** (largement suffisant)
- **Se met en veille** après 15min d'inactivité
- **Redémarre automatiquement** à la première requête
- **500MB RAM** maximum
- **1GB stockage** temporaire

## 🔄 Mises à jour

Pour mettre à jour votre bot :
1. Modifiez votre code localement
2. Commit + push sur GitHub
3. Render redéploie automatiquement !

## 🆘 Dépannage

### Bot ne se connecte pas :
- Vérifiez `DISCORD_TOKEN` dans les variables d'environnement
- Vérifiez les logs Render

### Dashboard inaccessible :
- Vérifiez que le service est "Live" (vert)
- Attendez que le service sorte de veille (première requête peut prendre 30s)

### Erreurs MongoDB :
- Vérifiez `MONGODB_URI`
- Vérifiez que votre IP est autorisée dans MongoDB Atlas (0.0.0.0/0)

## 🎊 Félicitations !

Votre bot Discord Ynov Enterprise est maintenant **hébergé gratuitement** et accessible à tous vos modérateurs !

**URL de votre dashboard :** `https://[VOTRE-URL].onrender.com`