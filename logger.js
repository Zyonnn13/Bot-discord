const winston = require('winston');
const path = require('path');

// Configuration des niveaux de log personnalisés
const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        security: 3,
        debug: 4
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        security: 'magenta',
        debug: 'blue'
    }
};

// Format personnalisé pour les logs
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
);

// Configuration du logger
const logger = winston.createLogger({
    levels: customLevels.levels,
    format: logFormat,
    defaultMeta: { service: 'ynov-discord-bot' },
    transports: [
        // Logs d'erreur uniquement
        new winston.transports.File({
            filename: path.join(__dirname, 'logs', 'error.log'),
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5
        }),
        
        // Logs de sécurité
        new winston.transports.File({
            filename: path.join(__dirname, 'logs', 'security.log'),
            level: 'security',
            maxsize: 10485760, // 10MB
            maxFiles: 10
        }),
        
        // Tous les logs
        new winston.transports.File({
            filename: path.join(__dirname, 'logs', 'combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 5
        }),
        
        // Console (uniquement info et plus grave)
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({ colors: customLevels.colors }),
                winston.format.simple()
            ),
            level: 'info'
        })
    ]
});

// Créer le dossier logs s'il n'existe pas
const fs = require('fs');
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Fonctions helper pour les logs
const loggers = {
    info: (message, meta = {}) => logger.info(message, meta),
    warn: (message, meta = {}) => logger.warn(message, meta),
    error: (message, meta = {}) => logger.error(message, meta),
    security: (message, meta = {}) => logger.log('security', message, meta),
    debug: (message, meta = {}) => logger.debug(message, meta),
    
    // Logs spécialisés pour le bot Discord
    userJoin: (username, userId, guildId) => {
        logger.log('security', 'User joined server', {
            action: 'user_join',
            username,
            userId,
            guildId,
            timestamp: new Date().toISOString()
        });
    },
    
    verificationAttempt: (username, userId, email, success) => {
        logger.log('security', 'Email verification attempt', {
            action: 'verification_attempt',
            username,
            userId,
            email,
            success,
            timestamp: new Date().toISOString()
        });
    },
    
    verificationSuccess: (username, userId, email) => {
        logger.info('User successfully verified', {
            action: 'verification_success',
            username,
            userId,
            email,
            timestamp: new Date().toISOString()
        });
    },
    
    rateLimited: (username, userId, attempts) => {
        logger.warn('User rate limited', {
            action: 'rate_limited',
            username,
            userId,
            attempts,
            timestamp: new Date().toISOString()
        });
    },
    
    suspiciousActivity: (username, userId, reason) => {
        logger.log('security', 'Suspicious activity detected', {
            action: 'suspicious_activity',
            username,
            userId,
            reason,
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = loggers;