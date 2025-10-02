# 🤖 Configuration Bot Discord - Guide Rapide

## 🚀 Étapes de Configuration

### 1️⃣ Créer l'Application Discord
1. Allez sur https://discord.com/developers/applications
2. Cliquez "New Application"
3. Donnez un nom (ex: "Ynov Verification Bot")
4. Allez dans l'onglet "Bot"
5. Cliquez "Add Bot"
6. **Copiez le TOKEN** (gardez-le secret !)

### 2️⃣ Inviter le Bot sur votre Serveur
1. Dans "OAuth2" → "URL Generator"
2. Cochez "bot"
3. Permissions nécessaires :
   - ✅ Send Messages
   - ✅ Manage Messages
   - ✅ Manage Channels
   - ✅ Read Message History
   - ✅ Add Reactions
   - ✅ Use Slash Commands
4. Copiez l'URL générée et ouvrez-la
5. Sélectionnez votre serveur et autorisez

### 3️⃣ Configuration des Variables d'Environnement
Créez un fichier `.env` avec :

```env
# Bot Discord
DISCORD_BOT_TOKEN=votre-token-bot-ici

# MongoDB (gardez votre URL existante)
MONGODB_URI=votre-url-mongodb

# Dashboard (gardez vos valeurs existantes)
SESSION_SECRET=votre-secret
ADMIN_PORT=3000
NODE_ENV=development
```

### 4️⃣ Démarrage

```bash
# Démarrer tout le système (bot + dashboard)
npm run start:all

# OU démarrer séparément
npm run bot        # Bot Discord seul
npm run dev        # Dashboard seul
```

## 🎯 Fonctionnement du Bot

### Flux de Vérification
1. **Nouveau membre rejoint** → Bot crée une entrée en attente
2. **Membre clique sur "Commencer"** → Bot envoie un MP
3. **Membre envoie son email** → Bot valide le format (@ynov.com, etc.)
4. **Bot génère un code** → Affiché dans la console (à remplacer par email réel)
5. **Membre envoie le code** → Bot vérifie et donne l'accès

### Emails Acceptés
- ✅ `prenom.nom@ynov.com`
- ✅ `prenom.nom@ynov-nantes.com`
- ✅ `prenom.nom@supinfo.com`
- ❌ Autres domaines refusés

### Canaux Créés
- `#verification` - Canal avec boutons de vérification

## 🔧 Personnalisation

### Modifier les Domaines Email
Dans `discord-bot.js`, ligne ~95 :
```javascript
const emailRegex = /^[^\s@]+@(ynov\.com|ynov-[a-z]+\.com|supinfo\.com)$/i;
```

### Ajouter un Rôle de Vérification
Dans `discord-bot.js`, ligne ~185 :
```javascript
const role = guild.roles.cache.find(r => r.name === 'Vérifié');
if (role) await member.roles.add(role);
```

## 📊 Intégration Dashboard

Le bot expose `global.discordClient` pour le dashboard :
- Statistiques de membres
- Logs de vérification
- Gestion des utilisateurs vérifiés

## 🐛 Dépannage

### Bot ne répond pas
- Vérifiez le TOKEN dans `.env`
- Vérifiez que le bot a les permissions
- Regardez les logs dans la console

### Canal de vérification absent
- Le bot le crée automatiquement
- Vérifiez les permissions "Manage Channels"

### Messages privés bloqués
- L'utilisateur doit autoriser les MP du serveur
- Le bot affiche un message d'aide

## 🚀 Déploiement Production

Pour Render.com, ajoutez les variables d'environnement :
- `DISCORD_BOT_TOKEN`
- `MONGODB_URI`
- `SESSION_SECRET`
- `NODE_ENV=production`

Et modifiez le script de démarrage pour `npm run start:all`

---

**Votre bot est maintenant prêt !** 🎉

Les utilisateurs qui rejoignent votre serveur Discord devront :
1. Aller dans #verification
2. Cliquer sur le bouton
3. Envoyer leur email Ynov en MP
4. Entrer le code reçu
5. Accéder au serveur !