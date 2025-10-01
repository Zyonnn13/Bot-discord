const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { VerifiedUser, SecurityLog, PendingVerification } = require('./models');

class BackupService {
    constructor() {
        this.backupDir = path.join(__dirname, 'backups');
        this.ensureBackupDirectory();
        this.scheduleBackups();
    }

    // Créer le dossier de sauvegarde s'il n'existe pas
    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
            logger.info('Backup directory created', { path: this.backupDir });
        }
    }

    // Planifier les sauvegardes automatiques
    scheduleBackups() {
        // Sauvegarde quotidienne à 2h du matin
        const dailyBackup = () => {
            const now = new Date();
            const nextBackup = new Date();
            nextBackup.setHours(2, 0, 0, 0); // 2h00 du matin
            
            if (nextBackup <= now) {
                nextBackup.setDate(nextBackup.getDate() + 1);
            }
            
            const timeout = nextBackup.getTime() - now.getTime();
            
            setTimeout(() => {
                this.createFullBackup();
                setInterval(() => {
                    this.createFullBackup();
                }, 24 * 60 * 60 * 1000); // Répéter chaque 24h
            }, timeout);
            
            logger.info('Daily backup scheduled', { nextBackup: nextBackup.toISOString() });
        };

        // Sauvegarde hebdomadaire des logs le dimanche
        const weeklyLogBackup = () => {
            const now = new Date();
            const nextSunday = new Date();
            nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
            nextSunday.setHours(3, 0, 0, 0); // 3h00 du matin le dimanche
            
            const timeout = nextSunday.getTime() - now.getTime();
            
            setTimeout(() => {
                this.archiveOldLogs();
                setInterval(() => {
                    this.archiveOldLogs();
                }, 7 * 24 * 60 * 60 * 1000); // Répéter chaque semaine
            }, timeout);
            
            logger.info('Weekly log archive scheduled', { nextArchive: nextSunday.toISOString() });
        };

        dailyBackup();
        weeklyLogBackup();
    }

    // Créer une sauvegarde complète
    async createFullBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(this.backupDir, `full_backup_${timestamp}.json`);
            
            logger.info('Starting full backup', { file: backupFile });
            
            // Récupérer toutes les données
            const [verifiedUsers, securityLogs, pendingVerifications] = await Promise.all([
                VerifiedUser.find({}).lean(),
                SecurityLog.find({}).lean(),
                PendingVerification.find({}).lean()
            ]);
            
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                collections: {
                    verifiedUsers: {
                        count: verifiedUsers.length,
                        data: verifiedUsers
                    },
                    securityLogs: {
                        count: securityLogs.length,
                        data: securityLogs
                    },
                    pendingVerifications: {
                        count: pendingVerifications.length,
                        data: pendingVerifications
                    }
                },
                metadata: {
                    totalRecords: verifiedUsers.length + securityLogs.length + pendingVerifications.length,
                    backupSize: 0 // Sera calculé après l'écriture
                }
            };
            
            // Écrire le fichier de sauvegarde
            await fs.promises.writeFile(backupFile, JSON.stringify(backupData, null, 2));
            
            // Calculer la taille du fichier
            const stats = await fs.promises.stat(backupFile);
            backupData.metadata.backupSize = stats.size;
            
            // Écrire à nouveau avec la taille
            await fs.promises.writeFile(backupFile, JSON.stringify(backupData, null, 2));
            
            logger.info('Full backup completed successfully', {
                file: backupFile,
                totalRecords: backupData.metadata.totalRecords,
                size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`
            });
            
            // Nettoyer les anciennes sauvegardes
            await this.cleanOldBackups();
            
            return backupFile;
            
        } catch (error) {
            logger.error('Full backup failed', { error: error.message });
            throw error;
        }
    }

    // Créer une sauvegarde des utilisateurs vérifiés uniquement
    async createUsersBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(this.backupDir, `users_backup_${timestamp}.json`);
            
            const verifiedUsers = await VerifiedUser.find({}).lean();
            
            const backupData = {
                timestamp: new Date().toISOString(),
                type: 'users_only',
                count: verifiedUsers.length,
                data: verifiedUsers
            };
            
            await fs.promises.writeFile(backupFile, JSON.stringify(backupData, null, 2));
            
            logger.info('Users backup completed', {
                file: backupFile,
                count: verifiedUsers.length
            });
            
            return backupFile;
            
        } catch (error) {
            logger.error('Users backup failed', { error: error.message });
            throw error;
        }
    }

    // Archiver les anciens logs
    async archiveOldLogs() {
        try {
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const archiveFile = path.join(this.backupDir, `security_logs_archive_${timestamp}.json`);
            
            // Récupérer les logs de plus d'une semaine
            const oldLogs = await SecurityLog.find({
                timestamp: { $lt: oneWeekAgo }
            }).lean();
            
            if (oldLogs.length === 0) {
                logger.info('No old logs to archive');
                return;
            }
            
            const archiveData = {
                timestamp: new Date().toISOString(),
                type: 'security_logs_archive',
                period: `Before ${oneWeekAgo.toISOString()}`,
                count: oldLogs.length,
                data: oldLogs
            };
            
            await fs.promises.writeFile(archiveFile, JSON.stringify(archiveData, null, 2));
            
            // Supprimer les anciens logs de la base de données
            await SecurityLog.deleteMany({
                timestamp: { $lt: oneWeekAgo }
            });
            
            logger.info('Security logs archived and cleaned', {
                archiveFile,
                count: oldLogs.length,
                cutoffDate: oneWeekAgo.toISOString()
            });
            
        } catch (error) {
            logger.error('Log archiving failed', { error: error.message });
        }
    }

    // Nettoyer les anciennes sauvegardes (garder seulement les 30 derniers jours)
    async cleanOldBackups() {
        try {
            const files = await fs.promises.readdir(this.backupDir);
            const backupFiles = files.filter(file => file.endsWith('.json'));
            
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            
            for (const file of backupFiles) {
                const filePath = path.join(this.backupDir, file);
                const stats = await fs.promises.stat(filePath);
                
                if (stats.mtime.getTime() < thirtyDaysAgo) {
                    await fs.promises.unlink(filePath);
                    logger.info('Old backup file deleted', { file });
                }
            }
            
        } catch (error) {
            logger.error('Backup cleanup failed', { error: error.message });
        }
    }

    // Restaurer depuis une sauvegarde
    async restoreFromBackup(backupFile) {
        try {
            logger.warn('Starting database restore', { backupFile });
            
            if (!fs.existsSync(backupFile)) {
                throw new Error('Backup file not found');
            }
            
            const backupData = JSON.parse(await fs.promises.readFile(backupFile, 'utf8'));
            
            if (!backupData.collections) {
                throw new Error('Invalid backup format');
            }
            
            // Sauvegarder l'état actuel avant restauration
            const emergencyBackup = await this.createFullBackup();
            logger.info('Emergency backup created before restore', { file: emergencyBackup });
            
            // Vider les collections existantes
            await Promise.all([
                VerifiedUser.deleteMany({}),
                SecurityLog.deleteMany({}),
                PendingVerification.deleteMany({})
            ]);
            
            // Restaurer les données
            const restorePromises = [];
            
            if (backupData.collections.verifiedUsers?.data?.length > 0) {
                restorePromises.push(VerifiedUser.insertMany(backupData.collections.verifiedUsers.data));
            }
            
            if (backupData.collections.securityLogs?.data?.length > 0) {
                restorePromises.push(SecurityLog.insertMany(backupData.collections.securityLogs.data));
            }
            
            if (backupData.collections.pendingVerifications?.data?.length > 0) {
                restorePromises.push(PendingVerification.insertMany(backupData.collections.pendingVerifications.data));
            }
            
            await Promise.all(restorePromises);
            
            logger.info('Database restore completed successfully', {
                backupFile,
                restoredRecords: backupData.metadata?.totalRecords || 'unknown'
            });
            
            return true;
            
        } catch (error) {
            logger.error('Database restore failed', {
                backupFile,
                error: error.message
            });
            throw error;
        }
    }

    // Lister les sauvegardes disponibles
    async listBackups() {
        try {
            const files = await fs.promises.readdir(this.backupDir);
            const backupFiles = files.filter(file => file.endsWith('.json'));
            
            const backups = await Promise.all(
                backupFiles.map(async (file) => {
                    const filePath = path.join(this.backupDir, file);
                    const stats = await fs.promises.stat(filePath);
                    
                    return {
                        filename: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.mtime,
                        type: file.includes('full_backup') ? 'full' :
                              file.includes('users_backup') ? 'users' :
                              file.includes('security_logs') ? 'logs' : 'unknown'
                    };
                })
            );
            
            return backups.sort((a, b) => b.created - a.created);
            
        } catch (error) {
            logger.error('Failed to list backups', { error: error.message });
            return [];
        }
    }

    // Obtenir les statistiques de sauvegarde
    async getBackupStats() {
        try {
            const backups = await this.listBackups();
            const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
            
            return {
                totalBackups: backups.length,
                totalSize: totalSize,
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                latestBackup: backups[0] || null,
                oldestBackup: backups[backups.length - 1] || null
            };
            
        } catch (error) {
            logger.error('Failed to get backup stats', { error: error.message });
            return null;
        }
    }
}

module.exports = new BackupService();