const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const mongoose = require('mongoose');
const { PendingVerification, VerifiedUser, SecurityLog } = require('./models');
require('dotenv').config();

// Configuration du bot Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// Variables globales
let verificationChannel = null;
const VERIFICATION_CHANNEL_NAME = 'verification';

// Connexion à MongoDB
async function connectMongoDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Bot connecté à MongoDB');
    } catch (error) {
        console.error('❌ Erreur connexion MongoDB:', error.message);
    }
}

// Création de l'embed de bienvenue
function createWelcomeEmbed() {
    return new EmbedBuilder()
        .setColor('#667eea')
        .setTitle('🎓 Bienvenue sur le serveur Ynov !')
        .setDescription('Pour accéder au serveur, vous devez vérifier votre identité avec votre adresse email Ynov.')
        .addFields([
            {
                name: '📧 Étape 1: Email',
                value: 'Cliquez sur le bouton ci-dessous pour commencer la vérification',
                inline: false
            },
            {
                name: '🔐 Étape 2: Code',
                value: 'Vous recevrez un code à 6 chiffres par email',
                inline: false
            },
            {
                name: '✅ Étape 3: Validation',
                value: 'Entrez le code pour accéder au serveur',
                inline: false
            }
        ])
        .setFooter({ 
            text: 'Système de vérification automatique', 
            iconURL: client.user?.avatarURL() || undefined
        })
        .setTimestamp();
}

// Création des boutons
function createVerificationButtons() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('start_verification')
                .setLabel('🚀 Commencer la vérification')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('help_verification')
                .setLabel('❓ Aide')
                .setStyle(ButtonStyle.Secondary)
        );
}

// Événement: Bot prêt
client.once('ready', async () => {
    console.log(`🤖 Bot Discord connecté: ${client.user.tag}`);
    
    // Connexion MongoDB
    await connectMongoDB();
    
    // Exposer le client pour le dashboard
    global.discordClient = client;
    
    // Trouver ou créer le canal de vérification
    const guild = client.guilds.cache.first();
    if (guild) {
        verificationChannel = guild.channels.cache.find(ch => ch.name === VERIFICATION_CHANNEL_NAME);
        
        if (!verificationChannel) {
            try {
                verificationChannel = await guild.channels.create({
                    name: VERIFICATION_CHANNEL_NAME,
                    type: 0, // TextChannel
                    topic: '🔐 Canal de vérification automatique - Suivez les instructions pour accéder au serveur'
                });
                console.log(`📝 Canal #${VERIFICATION_CHANNEL_NAME} créé`);
            } catch (error) {
                console.error('❌ Erreur création canal:', error.message);
            }
        }
        
        // Envoyer le message de vérification si le canal existe
        if (verificationChannel) {
            await sendVerificationMessage();
        }
    }
});

// Envoyer le message de vérification dans le canal
async function sendVerificationMessage() {
    try {
        // Supprimer les anciens messages du bot
        const messages = await verificationChannel.messages.fetch({ limit: 10 });
        const botMessages = messages.filter(msg => msg.author.id === client.user.id);
        if (botMessages.size > 0) {
            await verificationChannel.bulkDelete(botMessages);
        }
        
        // Envoyer le nouveau message
        await verificationChannel.send({
            embeds: [createWelcomeEmbed()],
            components: [createVerificationButtons()]
        });
        
        console.log('📨 Message de vérification envoyé');
    } catch (error) {
        console.error('❌ Erreur envoi message:', error.message);
    }
}

// Événement: Nouveau membre
client.on('guildMemberAdd', async (member) => {
    console.log(`👋 Nouveau membre: ${member.user.tag}`);
    
    try {
        // Créer ou mettre à jour l'entrée en attente
        await PendingVerification.findOneAndUpdate(
            { userId: member.id },
            {
                userId: member.id,
                username: member.user.username,
                guildId: member.guild.id,
                status: 'waiting_email',
                attempts: 0,
                joinedAt: new Date()
            },
            { upsert: true, new: true }
        );
        
        // Log de sécurité
        await new SecurityLog({
            userId: member.id,
            username: member.user.username,
            action: 'join',
            details: 'Nouveau membre ajouté en attente de vérification',
            success: true
        }).save();
        
        // Envoyer un message privé de bienvenue
        try {
            const welcomeDM = new EmbedBuilder()
                .setColor('#667eea')
                .setTitle('🎓 Bienvenue sur le serveur Ynov !')
                .setDescription(`Salut ${member.user.username} ! Pour accéder au serveur, rendez-vous dans le canal #${VERIFICATION_CHANNEL_NAME} et suivez les instructions.`)
                .addFields([
                    {
                        name: '📍 Prochaine étape',
                        value: `Allez dans #${VERIFICATION_CHANNEL_NAME} et cliquez sur "🚀 Commencer la vérification"`,
                        inline: false
                    }
                ])
                .setTimestamp();
                
            await member.send({ embeds: [welcomeDM] });
        } catch (dmError) {
            console.log(`❌ Impossible d'envoyer un MP à ${member.user.tag}`);
        }
        
    } catch (error) {
        console.error('❌ Erreur nouveau membre:', error.message);
    }
});

// Événement: Interaction avec les boutons
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    const member = interaction.member;
    const userId = interaction.user.id;
    
    try {
        if (interaction.customId === 'start_verification') {
            // Vérifier si l'utilisateur est déjà vérifié
            const verified = await VerifiedUser.findOne({ userId });
            if (verified) {
                return await interaction.reply({
                    content: '✅ Vous êtes déjà vérifié !',
                    ephemeral: true
                });
            }
            
            // Demander l'email par MP
            const emailEmbed = new EmbedBuilder()
                .setColor('#667eea')
                .setTitle('📧 Vérification Email')
                .setDescription('Veuillez envoyer votre adresse email Ynov dans ce message privé.')
                .addFields([
                    {
                        name: '✅ Format accepté',
                        value: 'votre.nom@ynov.com\nvotre.nom@ynov-nantes.com\nvotre.nom@supinfo.com',
                        inline: false
                    },
                    {
                        name: '⚠️ Important',
                        value: 'Utilisez uniquement votre email étudiant officiel',
                        inline: false
                    }
                ]);
                
            try {
                await interaction.user.send({ embeds: [emailEmbed] });
                await interaction.reply({
                    content: '📨 Je vous ai envoyé un message privé ! Vérifiez vos DM.',
                    ephemeral: true
                });
                
                // Mettre à jour le statut
                await PendingVerification.findOneAndUpdate(
                    { userId },
                    { status: 'waiting_email' },
                    { upsert: true }
                );
                
            } catch (dmError) {
                await interaction.reply({
                    content: '❌ Impossible de vous envoyer un message privé. Vérifiez vos paramètres de confidentialité.',
                    ephemeral: true
                });
            }
            
        } else if (interaction.customId === 'help_verification') {
            const helpEmbed = new EmbedBuilder()
                .setColor('#faa61a')
                .setTitle('❓ Aide - Vérification')
                .setDescription('Voici comment résoudre les problèmes courants :')
                .addFields([
                    {
                        name: '🔒 Messages privés bloqués',
                        value: 'Paramètres → Confidentialité → Autoriser les MP des membres du serveur',
                        inline: false
                    },
                    {
                        name: '📧 Email non accepté',
                        value: 'Utilisez uniquement votre email étudiant officiel (@ynov.com, etc.)',
                        inline: false
                    },
                    {
                        name: '🕐 Code expiré',
                        value: 'Recommencez la vérification, le code expire après 15 minutes',
                        inline: false
                    },
                    {
                        name: '🆘 Problème persistant',
                        value: 'Contactez un administrateur du serveur',
                        inline: false
                    }
                ]);
                
            await interaction.reply({
                embeds: [helpEmbed],
                ephemeral: true
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur interaction:', error.message);
        await interaction.reply({
            content: '❌ Une erreur est survenue. Réessayez plus tard.',
            ephemeral: true
        });
    }
});

// Événement: Message reçu (pour traiter les emails en MP)
client.on('messageCreate', async (message) => {
    // Ignorer les messages du bot
    if (message.author.bot) return;
    
    // Traiter uniquement les messages privés
    if (message.channel.type !== 1) return; // DM Channel
    
    const userId = message.author.id;
    const content = message.content.trim();
    
    try {
        // Vérifier si l'utilisateur est en attente d'email
        const pending = await PendingVerification.findOne({ 
            userId, 
            status: 'waiting_email' 
        });
        
        if (!pending) return;
        
        // Validation email
        const emailRegex = /^[^\s@]+@(ynov\.com|ynov-[a-z]+\.com|supinfo\.com)$/i;
        
        if (emailRegex.test(content)) {
            // Email valide
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
            
            // Mettre à jour en base
            await PendingVerification.findOneAndUpdate(
                { userId },
                {
                    email: content.toLowerCase(),
                    verificationCode,
                    codeExpiresAt: expiresAt,
                    status: 'waiting_code',
                    lastAttempt: new Date()
                }
            );
            
            // Simuler l'envoi d'email (à remplacer par un vrai service d'email)
            console.log(`📧 Code de vérification pour ${content}: ${verificationCode}`);
            
            const codeEmbed = new EmbedBuilder()
                .setColor('#43b581')
                .setTitle('✅ Email enregistré !')
                .setDescription(`Un code de vérification a été envoyé à ${content}`)
                .addFields([
                    {
                        name: '🔐 Prochaine étape',
                        value: 'Entrez le code à 6 chiffres que vous avez reçu par email',
                        inline: false
                    },
                    {
                        name: '⏰ Expiration',
                        value: 'Le code expire dans 15 minutes',
                        inline: false
                    }
                ])
                .setFooter({ text: `Code envoyé à ${content}` });
                
            await message.reply({ embeds: [codeEmbed] });
            
            // Log de sécurité
            await new SecurityLog({
                userId,
                username: message.author.username,
                action: 'email_attempt',
                details: `Email accepté: ${content}`,
                success: true
            }).save();
            
        } else if (content.length === 6 && /^\d+$/.test(content)) {
            // C'est un code de vérification
            const pendingCode = await PendingVerification.findOne({ 
                userId, 
                status: 'waiting_code' 
            });
            
            if (!pendingCode) {
                return await message.reply('❌ Aucune vérification en cours. Recommencez depuis le début.');
            }
            
            if (new Date() > pendingCode.codeExpiresAt) {
                await PendingVerification.findOneAndUpdate(
                    { userId },
                    { status: 'failed' }
                );
                return await message.reply('⏰ Code expiré. Recommencez la vérification.');
            }
            
            if (content === pendingCode.verificationCode) {
                // Code correct !
                const guild = client.guilds.cache.first();
                const member = guild?.members.cache.get(userId);
                
                // Créer l'utilisateur vérifié
                await new VerifiedUser({
                    userId,
                    username: message.author.username,
                    email: pendingCode.email,
                    guildId: pendingCode.guildId,
                    verifiedAt: new Date()
                }).save();
                
                // Supprimer de la liste d'attente
                await PendingVerification.findOneAndDelete({ userId });
                
                // Donner le rôle (optionnel)
                if (member) {
                    // Vous pouvez ajouter un rôle ici
                    // const role = guild.roles.cache.find(r => r.name === 'Vérifié');
                    // if (role) await member.roles.add(role);
                }
                
                const successEmbed = new EmbedBuilder()
                    .setColor('#43b581')
                    .setTitle('🎉 Vérification réussie !')
                    .setDescription('Félicitations ! Vous avez maintenant accès au serveur.')
                    .addFields([
                        {
                            name: '✅ Statut',
                            value: 'Compte vérifié avec succès',
                            inline: false
                        },
                        {
                            name: '🎓 Bienvenue',
                            value: 'Vous pouvez maintenant participer aux discussions !',
                            inline: false
                        }
                    ]);
                    
                await message.reply({ embeds: [successEmbed] });
                
                // Log de sécurité
                await new SecurityLog({
                    userId,
                    username: message.author.username,
                    action: 'verified',
                    details: `Vérification réussie avec ${pendingCode.email}`,
                    success: true
                }).save();
                
                console.log(`✅ ${message.author.username} vérifié avec ${pendingCode.email}`);
                
            } else {
                // Code incorrect
                const attempts = pendingCode.attempts + 1;
                
                if (attempts >= 3) {
                    await PendingVerification.findOneAndUpdate(
                        { userId },
                        { status: 'failed', attempts }
                    );
                    
                    await message.reply('❌ Trop de tentatives échouées. Recommencez la vérification depuis le début.');
                } else {
                    await PendingVerification.findOneAndUpdate(
                        { userId },
                        { attempts }
                    );
                    
                    await message.reply(`❌ Code incorrect. Il vous reste ${3 - attempts} tentative(s).`);
                }
                
                // Log de sécurité
                await new SecurityLog({
                    userId,
                    username: message.author.username,
                    action: 'code_attempt',
                    details: `Code incorrect (tentative ${attempts}/3)`,
                    success: false
                }).save();
            }
            
        } else {
            // Format non reconnu
            const formatEmbed = new EmbedBuilder()
                .setColor('#f04747')
                .setTitle('❌ Format non reconnu')
                .setDescription('Veuillez envoyer:')
                .addFields([
                    {
                        name: '📧 Pour l\'email',
                        value: 'votre.nom@ynov.com',
                        inline: true
                    },
                    {
                        name: '🔐 Pour le code',
                        value: '123456 (6 chiffres)',
                        inline: true
                    }
                ]);
                
            await message.reply({ embeds: [formatEmbed] });
        }
        
    } catch (error) {
        console.error('❌ Erreur traitement message:', error.message);
        await message.reply('❌ Une erreur est survenue. Réessayez plus tard.');
    }
});

// Gestion des erreurs
client.on('error', console.error);

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

// Connexion du bot
client.login(process.env.DISCORD_BOT_TOKEN);