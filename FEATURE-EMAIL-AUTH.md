# 📧 Fonctionnalité: Authentification par Email Autorisé

## Description

Cette fonctionnalité permet de restreindre la création de comptes administrateur aux seules adresses email autorisées par l'administrateur principal. Cela améliore significativement la sécurité du dashboard en empêchant la création de comptes non autorisés.

## 🚀 Fonctionnalités

- ✅ **Restriction de signup** : Seuls les emails autorisés peuvent créer un compte
- ✅ **Interface de gestion** : Ajout/suppression d'emails via le dashboard
- ✅ **Historique** : Suivi des emails ajoutés avec dates et notes
- ✅ **Sécurité** : Seuls les admins peuvent gérer les autorisations
- ✅ **Scripts CLI** : Outils en ligne de commande pour la gestion

## 📋 Prérequis

1. Avoir MongoDB configuré
2. Être connecté en tant qu'administrateur sur le dashboard
3. Avoir les variables d'environnement configurées

## 🔧 Installation et Configuration

### 1. Initialiser votre premier email admin

```bash
# Méthode 1: Script npm (recommandée)
npm run init-admin votre-email@domaine.com

# Méthode 2: Script direct
node init-admin-email.js votre-email@domaine.com
```

### 2. Créer votre compte admin

1. Aller sur `/signup`
2. Utiliser l'email que vous venez d'autoriser
3. Créer votre compte administrateur

### 3. Gérer les emails autorisés

Une fois connecté au dashboard, cliquer sur "📧 Emails Autorisés" dans la sidebar.

## 📱 Interface Dashboard

### Navigation
- **Overview** : Statistiques générales
- **📧 Emails Autorisés** : Gestion des emails (nouvelle section)

### Fonctionnalités disponibles
- ➕ **Ajouter un email** : Formulaire avec email et notes optionnelles
- 📋 **Liste des emails** : Affichage de tous les emails autorisés
- 🗑️ **Supprimer un email** : Désactivation d'un email autorisé
- 🔄 **Actualiser** : Rechargement de la liste

## 🛠️ Scripts CLI Disponibles

### Gestion des emails
```bash
# Ajouter un email
node manage-authorized-emails.js add email@domaine.com

# Supprimer un email
node manage-authorized-emails.js remove email@domaine.com

# Lister tous les emails
node manage-authorized-emails.js list
```

### Initialisation
```bash
# Initialiser le premier email admin
npm run init-admin votre-email@admin.com
```

## 🔒 Sécurité

### Contrôles d'accès
- **Signup** : Vérification obligatoire de l'email autorisé
- **Dashboard** : Seuls les admins peuvent gérer les emails
- **API** : Routes protégées par authentification et rôle

### Protection contre
- ❌ Création de comptes non autorisés
- ❌ Accès non autorisé à la gestion des emails
- ❌ Suppression accidentelle (désactivation au lieu de suppression)

## 📚 Structure des Données

### Modèle AuthorizedAdmin
```javascript
{
  email: String,        // Email autorisé (unique, lowercase)
  addedBy: String,      // Qui a ajouté cet email
  addedAt: Date,        // Date d'ajout
  isActive: Boolean,    // Actif/inactif
  notes: String         // Notes optionnelles
}
```

## 🐛 Résolution de Problèmes

### Problèmes courants

1. **"Email non autorisé" au signup**
   - Vérifier que l'email est bien dans la liste des autorisés
   - Vérifier que l'email est actif (isActive: true)

2. **Ne peut pas accéder à la gestion des emails**
   - Vérifier que vous êtes connecté en tant qu'admin
   - Vérifier votre rôle dans la base de données

3. **Erreur de connexion MongoDB**
   - Vérifier la variable MONGODB_URI
   - Vérifier que MongoDB est accessible

### Debug
```bash
# Vérifier les emails en base
node manage-authorized-emails.js list

# Vérifier les logs du serveur
npm run dev
```

## 🚀 Déploiement

### Variables d'environnement
```env
MONGODB_URI=mongodb://...
SESSION_SECRET=votre-secret-session
NODE_ENV=production
```

### Sur Render.com
1. Déployer le code
2. Configurer les variables d'environnement
3. Exécuter l'initialisation via console Render :
   ```bash
   node init-admin-email.js votre-email@admin.com
   ```

## 📈 Améliorations Futures

- [ ] Notifications email lors d'ajout/suppression
- [ ] Expiration automatique des autorisations
- [ ] Logs d'audit des modifications
- [ ] Import/export en masse des emails
- [ ] Validation de domaine email

## 🎯 Utilisation en Équipe

Cette fonctionnalité facilite le travail en équipe Git :

1. **Chaque développeur** peut avoir son email autorisé
2. **Branche feature** dédiée à cette fonctionnalité
3. **Tests** sur l'environnement de développement
4. **Merge** sécurisé vers la branche principale

---

**Auteur**: Équipe Ynov Bot Discord  
**Version**: 1.0.0  
**Date**: Octobre 2025