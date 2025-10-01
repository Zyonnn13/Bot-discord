require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const logger = require('./logger');
const emailService = require('./emailService');
const { PendingVerification, VerifiedUser, SecurityLog, Stats } = require('./models');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Configuration du rate limiting
const userCooldowns = new Map();
const MAX_ATTEMPTS = parseInt(process.env.MAX_VERIFICATION_ATTEMPTS) || 3;
const COOLDOWN_MINUTES = parseInt(process.env.VERIFICATION_COOLDOWN_MINUTES) || 60;

// Connexion à MongoDB
async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info('Successfully connected to MongoDB Atlas');
        return true;
    } catch (error) {
        logger.error('Failed to connect to MongoDB', { error: error.message });
        return false;
    }
}

// Vérifier si un utilisateur est en cooldown
function isUserInCooldown(userId) {
    const cooldownTime = userCooldowns.get(userId);
    if (!cooldownTime) return false;
    
    const now = Date.now();
    const timePassed = (now - cooldownTime) / (1000 * 60); // en minutes
    
    if (timePassed >= COOLDOWN_MINUTES) {
        userCooldowns.delete(userId);
        return false;
    }
    
    return true;
}

// Ajouter un utilisateur en cooldown
function addUserToCooldown(userId) {
    userCooldowns.set(userId, Date.now());
}

// Obtenir le temps restant de cooldown
function getCooldownTimeLeft(userId) {
    const cooldownTime = userCooldowns.get(userId);
    if (!cooldownTime) return 0;
    
    const now = Date.now();
    const timePassed = (now - cooldownTime) / (1000 * 60);
    return Math.max(0, COOLDOWN_MINUTES - timePassed);
}

// Enregistrer une action de sécurité
async function logSecurityAction(userId, username, action, details = '', success = true) {
    try {
        await SecurityLog.create({
            userId,
            username,
            action,
            details,
            success,
            timestamp: new Date()
        });
    } catch (error) {
        logger.error('Failed to log security action', { error: error.message });
    }
}

// Événement de connexion du bot
client.once('clientReady', async () => {
    logger.info(`Bot successfully connected as ${client.user.tag}`);
    
    // Connexion à la base de données
    const dbConnected = await connectToDatabase();
    if (!dbConnected) {
        logger.error('Database connection failed - bot will exit');
        process.exit(1);
    }
    
    // Test de la connexion email
    const emailConnected = await emailService.testConnection();
    if (!emailConnected) {
        logger.warn('Email service not working - verification codes won\'t be sent');
    }
    
    logger.info('🤖 Bot is monitoring server for new members');
    console.log('✅ Bot prêt à gérer les vérifications avec MongoDB !');
});

// Événement quand un nouveau membre rejoint le serveur
client.on('guildMemberAdd', async (member) => {
    try {
        logger.userJoin(member.user.username, member.user.id, member.guild.id);
        await logSecurityAction(member.user.id, member.user.username, 'join', 'User joined server');
        
        // Vérifier si l'utilisateur est déjà vérifié
        const existingVerification = await VerifiedUser.findOne({ userId: member.user.id });
        if (existingVerification) {
            logger.info('User already verified, granting access immediately', {
                username: member.user.username,
                userId: member.user.id
            });
            
            const verifiedRole = member.guild.roles.cache.get(process.env.VERIFIED_ROLE_ID);
            if (verifiedRole) {
                await member.roles.add(verifiedRole);
                return;
            }
        }
        
        // Attribuer le rôle "Non vérifié"
        const unverifiedRole = member.guild.roles.cache.get(process.env.UNVERIFIED_ROLE_ID);
        if (!unverifiedRole) {
            logger.error('Unverified role not found', { roleId: process.env.UNVERIFIED_ROLE_ID });
            return;
        }
        
        await member.roles.add(unverifiedRole);
        logger.info('Unverified role assigned', { username: member.user.username });
        
        // Créer ou mettre à jour l'entrée dans la base de données
        await PendingVerification.findOneAndUpdate(
            { userId: member.user.id },
            {
                userId: member.user.id,
                username: member.user.username,
                guildId: member.guild.id,
                joinedAt: new Date(),
                status: 'waiting_email',
                attempts: 0
            },
            { upsert: true, new: true }
        );
        
        // Envoyer le message de bienvenue
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('🎓 Bienvenue sur le serveur Ynov !')
            .setDescription(`Salut ${member.user.username} !\n\nPour accéder au serveur, tu dois vérifier ton statut d'étudiant Ynov.`)
            .addFields(
                {
                    name: '📧 Étape 1 : Ton email Ynov',
                    value: 'Réponds à ce message avec ton **adresse email Ynov** (qui se termine par @ynov.com)',
                    inline: false
                },
                {
                    name: '🔐 Étape 2 : Code de vérification',
                    value: 'Je t\'enverrai un code de confirmation par email que tu devras me renvoyer',
                    inline: false
                },
                {
                    name: '✨ Exemple d\'email',
                    value: '`prenom.nom@ynov.com`',
                    inline: false
                },
                {
                    name: '⚠️ Important',
                    value: 'Tu n\'auras accès aux salons qu\'après vérification complète.',
                    inline: false
                }
            )
            .setFooter({ text: 'Bot Ynov - Système de vérification sécurisé' })
            .setTimestamp();

        const dmChannel = await member.createDM();
        await dmChannel.send({ embeds: [welcomeEmbed] });
        
        logger.info('Welcome message sent', { username: member.user.username });
        
    } catch (error) {
        logger.error('Error processing new member', {
            username: member.user.username,
            error: error.message
        });
    }
});

// Événement pour les messages privés
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.channel.isDMBased()) return;
    
    const userId = message.author.id;
    const username = message.author.username;
    
    try {
        // Chercher l'utilisateur en cours de vérification
        const pendingUser = await PendingVerification.findOne({ userId });
        if (!pendingUser) {
            return; // Utilisateur pas en cours de vérification
        }
        
        // Vérifier le cooldown
        if (isUserInCooldown(userId)) {
            const timeLeft = Math.ceil(getCooldownTimeLeft(userId));
            
            const cooldownEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⏰ Cooldown actif')
                .setDescription('Tu dois attendre avant de pouvoir réessayer.')
                .addFields({
                    name: '⏳ Temps restant',
                    value: `${timeLeft} minute(s)`,
                    inline: true
                })
                .setFooter({ text: 'Cette mesure évite le spam et protège le système' });
            
            await message.reply({ embeds: [cooldownEmbed] });
            return;
        }
        
        const messageContent = message.content.trim();
        
        // Gestion selon le statut de vérification
        if (pendingUser.status === 'waiting_email') {
            await handleEmailSubmission(message, pendingUser, messageContent);
        } else if (pendingUser.status === 'waiting_code') {
            await handleCodeSubmission(message, pendingUser, messageContent);
        }
        
    } catch (error) {
        logger.error('Error processing DM', {
            username,
            userId,
            error: error.message
        });
        
        await message.reply('❌ Une erreur est survenue. Contacte un administrateur si le problème persiste.');
    }
});

// Gestion de la soumission d'email
async function handleEmailSubmission(message, pendingUser, email) {
    email = email.toLowerCase();
    
    // Valider l'email
    if (!emailService.isValidYnovEmail(email)) {
        pendingUser.attempts++;
        await pendingUser.save();
        
        await logSecurityAction(pendingUser.userId, pendingUser.username, 'email_attempt', `Invalid email: ${email}`, false);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Email invalide')
            .setDescription('L\'email fourni n\'est pas un email Ynov valide.')
            .addFields(
                {
                    name: '📧 Format requis',
                    value: 'Ton email doit se terminer par **@ynov.com**',
                    inline: false
                },
                {
                    name: '✨ Exemple correct',
                    value: '`prenom.nom@ynov.com`',
                    inline: false
                },
                {
                    name: '🔄 Tentatives',
                    value: `${pendingUser.attempts}/${MAX_ATTEMPTS}`,
                    inline: true
                }
            );

        if (pendingUser.attempts >= MAX_ATTEMPTS) {
            errorEmbed.addFields({
                name: '⚠️ Limite atteinte',
                value: `Tu as atteint la limite de tentatives. Cooldown de ${COOLDOWN_MINUTES} minutes activé.`,
                inline: false
            });
            
            addUserToCooldown(pendingUser.userId);
            logger.rateLimited(pendingUser.username, pendingUser.userId, pendingUser.attempts);
            await logSecurityAction(pendingUser.userId, pendingUser.username, 'rate_limited', `Max attempts reached: ${pendingUser.attempts}`);
        }

        await message.reply({ embeds: [errorEmbed] });
        return;
    }
    
    // Vérifier si l'email est déjà utilisé
    const existingUser = await VerifiedUser.findOne({ email });
    if (existingUser) {
        await logSecurityAction(pendingUser.userId, pendingUser.username, 'email_attempt', `Email already used: ${email}`, false);
        
        const duplicateEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Email déjà utilisé')
            .setDescription('Cet email est déjà associé à un autre compte Discord.')
            .addFields({
                name: '🆘 Besoin d\'aide ?',
                value: 'Contacte un administrateur si c\'est bien ton email.',
                inline: false
            });
        
        await message.reply({ embeds: [duplicateEmbed] });
        return;
    }
    
    // Générer et envoyer le code de vérification
    const verificationCode = emailService.generateVerificationCode();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    try {
        await emailService.sendVerificationCode(email, verificationCode, pendingUser.username);
        
        // Mettre à jour en base
        pendingUser.email = email;
        pendingUser.verificationCode = verificationCode;
        pendingUser.codeExpiresAt = codeExpiresAt;
        pendingUser.status = 'waiting_code';
        await pendingUser.save();
        
        await logSecurityAction(pendingUser.userId, pendingUser.username, 'email_attempt', `Code sent to: ${email}`, true);
        
        const codeEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('📧 Code envoyé !')
            .setDescription(`Un code de vérification a été envoyé à **${email}**`)
            .addFields(
                {
                    name: '🔐 Prochaine étape',
                    value: 'Consulte tes emails et réponds avec le code reçu',
                    inline: false
                },
                {
                    name: '⏰ Validité',
                    value: '10 minutes',
                    inline: true
                },
                {
                    name: '📨 Pas reçu ?',
                    value: 'Vérifie tes spams ou réessaie avec ton email',
                    inline: true
                }
            )
            .setFooter({ text: 'Le code contient 6 chiffres' });
        
        await message.reply({ embeds: [codeEmbed] });
        
    } catch (error) {
        logger.error('Failed to send verification email', {
            username: pendingUser.username,
            email,
            error: error.message
        });
        
        await message.reply('❌ Erreur lors de l\'envoi de l\'email. Réessaie plus tard ou contacte un administrateur.');
    }
}

// Gestion de la soumission du code
async function handleCodeSubmission(message, pendingUser, code) {
    // Vérifier si le code a expiré
    if (new Date() > pendingUser.codeExpiresAt) {
        pendingUser.status = 'waiting_email';
        pendingUser.verificationCode = null;
        pendingUser.codeExpiresAt = null;
        await pendingUser.save();
        
        const expiredEmbed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('⏰ Code expiré')
            .setDescription('Le code de vérification a expiré.')
            .addFields({
                name: '🔄 Recommencer',
                value: 'Envoie à nouveau ton email @ynov.com pour recevoir un nouveau code',
                inline: false
            });
        
        await message.reply({ embeds: [expiredEmbed] });
        return;
    }
    
    // Vérifier le code
    if (code !== pendingUser.verificationCode) {
        pendingUser.attempts++;
        await pendingUser.save();
        
        await logSecurityAction(pendingUser.userId, pendingUser.username, 'code_attempt', `Wrong code: ${code}`, false);
        
        const wrongCodeEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Code incorrect')
            .setDescription('Le code fourni ne correspond pas.')
            .addFields(
                {
                    name: '🔄 Tentatives restantes',
                    value: `${MAX_ATTEMPTS - pendingUser.attempts}/${MAX_ATTEMPTS}`,
                    inline: true
                },
                {
                    name: '💡 Conseil',
                    value: 'Vérifie bien le code dans ton email (6 chiffres)',
                    inline: false
                }
            );
        
        if (pendingUser.attempts >= MAX_ATTEMPTS) {
            wrongCodeEmbed.addFields({
                name: '⚠️ Limite atteinte',
                value: `Cooldown de ${COOLDOWN_MINUTES} minutes activé.`,
                inline: false
            });
            
            addUserToCooldown(pendingUser.userId);
            logger.rateLimited(pendingUser.username, pendingUser.userId, pendingUser.attempts);
        }
        
        await message.reply({ embeds: [wrongCodeEmbed] });
        return;
    }
    
    // Code correct - finaliser la vérification
    await finalizeVerification(message, pendingUser);
}

// Finaliser la vérification
async function finalizeVerification(message, pendingUser) {
    try {
        const guild = client.guilds.cache.get(pendingUser.guildId);
        const member = guild.members.cache.get(pendingUser.userId);
        
        if (!member) {
            await message.reply('❌ Erreur: Impossible de te trouver sur le serveur.');
            return;
        }
        
        // Gérer les rôles
        const unverifiedRole = guild.roles.cache.get(process.env.UNVERIFIED_ROLE_ID);
        const verifiedRole = guild.roles.cache.get(process.env.VERIFIED_ROLE_ID);
        
        if (unverifiedRole) {
            await member.roles.remove(unverifiedRole);
        }
        if (verifiedRole) {
            await member.roles.add(verifiedRole);
        }
        
        // Enregistrer en base comme vérifié
        await VerifiedUser.create({
            userId: pendingUser.userId,
            username: pendingUser.username,
            email: pendingUser.email,
            guildId: pendingUser.guildId,
            verifiedAt: new Date(),
            verificationMethod: 'email_code'
        });
        
        // Supprimer de la liste d'attente
        await PendingVerification.deleteOne({ userId: pendingUser.userId });
        
        // Logs
        logger.verificationSuccess(pendingUser.username, pendingUser.userId, pendingUser.email);
        await logSecurityAction(pendingUser.userId, pendingUser.username, 'verified', `Email: ${pendingUser.email}`, true);
        
        // Message de succès
        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Vérification réussie !')
            .setDescription(`Félicitations ${message.author.username} !`)
            .addFields(
                {
                    name: '🎉 Accès accordé',
                    value: 'Ton email Ynov a été vérifié avec succès.',
                    inline: false
                },
                {
                    name: '📧 Email enregistré',
                    value: pendingUser.email,
                    inline: false
                },
                {
                    name: '🚀 Prochaine étape',
                    value: 'Tu peux maintenant accéder à tous les salons du serveur !',
                    inline: false
                }
            )
            .setFooter({ text: 'Bienvenue dans la communauté Ynov !' })
            .setTimestamp();

        await message.reply({ embeds: [successEmbed] });
        
    } catch (error) {
        logger.error('Error finalizing verification', {
            username: pendingUser.username,
            error: error.message
        });
        await message.reply('❌ Erreur lors de la finalisation. Contacte un administrateur.');
    }
}

// Gestion des erreurs
client.on('error', (error) => {
    logger.error('Discord client error', { error: error.message });
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection', { error: error.message });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Bot shutdown initiated');
    await mongoose.connection.close();
    client.destroy();
    process.exit(0);
});

// Connexion du bot
client.login(process.env.DISCORD_TOKEN);