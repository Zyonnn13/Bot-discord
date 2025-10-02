# 🔥 Guide Firebase pour le Collègue

## 🎯 Mission
Remplacer le système d'authentification MongoDB actuel par Firebase Auth.

## 📋 Étapes de Configuration

### 1️⃣ Créer le Projet Firebase
1. Aller sur https://firebase.google.com/
2. "Commencer" → "Créer un projet"
3. Nom : "YnovBot-Auth" (ou similaire)
4. Désactiver Google Analytics (pas nécessaire)

### 2️⃣ Configurer Authentication
1. Menu gauche → "Authentication"
2. "Commencer"
3. Onglet "Sign-in method"
4. Activer "E-mail/Mot de passe"
5. ✅ Activer "E-mail/Mot de passe"
6. ❌ Laisser "Lien e-mail" désactivé

### 3️⃣ Ajouter une App Web
1. Page d'accueil Firebase → Icône "</>"
2. Nom de l'app : "YnovBot-Dashboard"
3. ❌ Ne pas configurer Firebase Hosting
4. **COPIER la configuration** qui ressemble à :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "ynovbot-auth.firebaseapp.com",
  projectId: "ynovbot-auth",
  storageBucket: "ynovbot-auth.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

### 4️⃣ Ajouter les Emails Autorisés
Dans la console Firebase → Authentication → Users :
1. "Ajouter un utilisateur"
2. Email : `cclementbelmondo@gmail.com`
3. Mot de passe temporaire : `TempPass123!`
4. Répéter pour chaque admin

## 📦 Dépendances à Ajouter

```bash
npm install firebase firebase-admin
```

## 🔧 Code à Implémenter

### Fichier: `public/js/firebase-config.js`
```javascript
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// REMPLACER par la vraie config Firebase
const firebaseConfig = {
  // ... votre config ici
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Emails autorisés (temporaire, peut être géré via Firebase Admin)
const AUTHORIZED_EMAILS = [
    'cclementbelmondo@gmail.com',
    // Ajouter d'autres emails ici
];

export async function loginUser(email, password) {
    if (!AUTHORIZED_EMAILS.includes(email.toLowerCase())) {
        return { success: false, error: 'Email non autorisé' };
    }
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: getErrorMessage(error.code) };
    }
}

export async function signupUser(email, password) {
    if (!AUTHORIZED_EMAILS.includes(email.toLowerCase())) {
        return { success: false, error: 'Email non autorisé' };
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: getErrorMessage(error.code) };
    }
}

function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/user-not-found':
            return 'Aucun compte trouvé avec cet email.';
        case 'auth/wrong-password':
            return 'Mot de passe incorrect.';
        case 'auth/email-already-in-use':
            return 'Un compte existe déjà avec cet email.';
        default:
            return 'Une erreur est survenue.';
    }
}

export { auth };
```

### Modification: `views/login.html`
Remplacer le script actuel par :
```html
<script type="module">
    import { loginUser } from '/js/firebase-config.js';
    
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        
        const result = await loginUser(email, password);
        
        if (result.success) {
            window.location.href = '/dashboard';
        } else {
            // Afficher l'erreur
            document.getElementById('message').textContent = result.error;
        }
    });
</script>
```

### Modification: `views/signup.html`
Similaire à login, utiliser `signupUser` au lieu de `loginUser`.

### Modification: `admin-dashboard-secure.js`
Supprimer ces routes (plus nécessaires) :
- `app.post('/api/login', ...)`
- `app.post('/api/signup', ...)`
- `app.get('/api/authorized-emails', ...)`
- Tout le système `AuthorizedAdmin`

## 🔒 Sécurité Firebase

### Rules Firestore (si utilisé)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Configuration environnement
Ajouter au `.env` :
```env
# Firebase (pour admin SDK si nécessaire)
FIREBASE_PROJECT_ID=ynovbot-auth
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@ynovbot-auth.iam.gserviceaccount.com
```

## 🧪 Tests à Faire

1. **Créer un compte** via signup
2. **Se connecter** via login  
3. **Accéder au dashboard** après connexion
4. **Tester email non autorisé** (doit être refusé)
5. **Déconnexion** fonctionnelle

## 📞 Questions/Aide

Si problèmes :
1. Vérifier la configuration Firebase
2. Vérifier les emails autorisés
3. Regarder la console navigateur pour erreurs
4. Tester avec des emails différents

## 🎯 Objectif Final

Après migration :
- ✅ Plus de gestion de mots de passe côté serveur
- ✅ Sécurité Firebase niveau entreprise  
- ✅ Interface simple pour ajouter/supprimer admins
- ✅ MongoDB uniquement pour données Discord
- ✅ Séparation claire : Auth vs Data

---

**Contact** : Si questions, demander aide sur Discord/Slack
**Priorité** : Tester d'abord en local avant déploiement