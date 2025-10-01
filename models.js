const mongoose = require('mongoose');

// Schéma pour les utilisateurs en cours de vérification
const pendingVerificationSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: false // Sera ajouté quand l'utilisateur fournit son email
    },
    verificationCode: {
        type: String,
        required: false // Code à 6 chiffres envoyé par email
    },
    attempts: {
        type: Number,
        default: 0
    },
    lastAttempt: {
        type: Date,
        default: Date.now
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    codeExpiresAt: {
        type: Date,
        required: false
    },
    status: {
        type: String,
        enum: ['waiting_email', 'waiting_code', 'verified', 'failed'],
        default: 'waiting_email'
    }
}, {
    timestamps: true
});

// Schéma pour les utilisateurs vérifiés
const verifiedUserSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true
    },
    guildId: {
        type: String,
        required: true
    },
    verifiedAt: {
        type: Date,
        default: Date.now
    },
    verificationMethod: {
        type: String,
        default: 'email_code'
    }
}, {
    timestamps: true
});

// Schéma pour les logs de sécurité
const securityLogSchema = new mongoose.Schema({
    userId: String,
    username: String,
    action: {
        type: String,
        enum: ['join', 'email_attempt', 'code_attempt', 'verified', 'failed', 'rate_limited', 'suspicious']
    },
    details: String,
    ipAddress: String,
    success: Boolean,
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Schéma pour les statistiques
const statsSchema = new mongoose.Schema({
    date: {
        type: Date,
        default: Date.now
    },
    totalJoins: {
        type: Number,
        default: 0
    },
    totalVerified: {
        type: Number,
        default: 0
    },
    totalFailed: {
        type: Number,
        default: 0
    },
    averageVerificationTime: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index pour optimiser les performances
pendingVerificationSchema.index({ guildId: 1 });
pendingVerificationSchema.index({ email: 1 });
pendingVerificationSchema.index({ lastAttempt: 1 });

verifiedUserSchema.index({ email: 1 });
verifiedUserSchema.index({ guildId: 1 });

securityLogSchema.index({ userId: 1 });
securityLogSchema.index({ action: 1 });
securityLogSchema.index({ timestamp: -1 });

// Auto-suppression des vérifications expirées (après 24h)
pendingVerificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// Schéma pour les emails autorisés à créer des comptes admin
const authorizedAdminSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    addedBy: {
        type: String,
        required: false // Email de l'admin qui a ajouté cet email
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    notes: {
        type: String,
        required: false // Notes optionnelles
    }
}, {
    timestamps: true
});

// Index pour optimiser les performances
authorizedAdminSchema.index({ email: 1 });
authorizedAdminSchema.index({ isActive: 1 });

const AuthorizedAdmin = mongoose.model('AuthorizedAdmin', authorizedAdminSchema);

const PendingVerification = mongoose.model('PendingVerification', pendingVerificationSchema);
const VerifiedUser = mongoose.model('VerifiedUser', verifiedUserSchema);
const SecurityLog = mongoose.model('SecurityLog', securityLogSchema);
const Stats = mongoose.model('Stats', statsSchema);

module.exports = {
    PendingVerification,
    VerifiedUser,
    SecurityLog,
    Stats,
    AuthorizedAdmin
};