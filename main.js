require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Base de données simple pour stocker les utilisateurs en attente de vérification
const pendingVerifications = new Map();

// Fonction pour valider l'email @ynov.com
function isValidYnovEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@ynov\.com$/;
    return emailRegex.test(email);
}

// Événement de connexion du bot
client.once('ready', () => {
    console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
    console.log(`🤖 Le bot surveille le serveur pour les nouveaux membres`);
});

// Événement quand un nouveau membre rejoint le serveur
client.on('guildMemberAdd', async (member) => {
    try {
        console.log(`🆕 Nouveau membre détecté: ${member.user.tag}`);
        
        // Récupérer les rôles configurés
        const guild = member.guild;
        const unverifiedRole = guild.roles.cache.get(process.env.UNVERIFIED_ROLE_ID);
        
        if (!unverifiedRole) {
            console.error('❌ Rôle "Non vérifié" introuvable. Vérifiez UNVERIFIED_ROLE_ID dans .env');
            return;
        }

        // Attribuer le rôle "Non vérifié"
        await member.roles.add(unverifiedRole);
        console.log(`🔒 Rôle "Non vérifié" attribué à ${member.user.tag}`);

        // Créer un embed pour le message de bienvenue
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('🎓 Bienvenue sur le serveur Ynov !')
            .setDescription(`Salut ${member.user.username} !\n\nPour accéder au serveur, tu dois vérifier ton statut d'étudiant Ynov.`)
            .addFields(
                {
                    name: '📧 Vérification requise',
                    value: 'Merci de répondre à ce message avec ton **adresse email Ynov** (qui se termine par @ynov.com)',
                    inline: false
                },
                {
                    name: '✨ Exemple',
                    value: '`prenom.nom@ynov.com`',
                    inline: false
                },
                {
                    name: '⚠️ Important',
                    value: 'Tu n\'auras accès aux salons qu\'après vérification de ton email.',
                    inline: false
                }
            )
            .setFooter({ text: 'Bot Ynov - Système de vérification' })
            .setTimestamp();

        // Envoyer le message privé
        const dmChannel = await member.createDM();
        await dmChannel.send({ embeds: [welcomeEmbed] });
        
        // Ajouter l'utilisateur à la liste d'attente
        pendingVerifications.set(member.id, {
            userId: member.id,
            guildId: guild.id,
            joinedAt: new Date(),
            attempts: 0
        });

        console.log(`📨 Message de vérification envoyé à ${member.user.tag}`);
        
    } catch (error) {
        console.error(`❌ Erreur lors du traitement du nouveau membre ${member.user.tag}:`, error);
    }
});

// Événement pour les messages privés (vérification email)
client.on('messageCreate', async (message) => {
    // Ignorer les messages du bot et les messages qui ne sont pas en DM
    if (message.author.bot || !message.channel.isDMBased()) return;

    const userId = message.author.id;
    
    // Vérifier si l'utilisateur est en attente de vérification
    if (!pendingVerifications.has(userId)) {
        return;
    }

    try {
        const verification = pendingVerifications.get(userId);
        verification.attempts++;

        const email = message.content.trim().toLowerCase();
        
        // Valider l'email
        if (!isValidYnovEmail(email)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Email invalide')
                .setDescription('L\'email fourni n\'est pas valide.')
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
                        value: `${verification.attempts}/3`,
                        inline: true
                    }
                );

            if (verification.attempts >= 3) {
                errorEmbed.addFields({
                    name: '⚠️ Limite atteinte',
                    value: 'Tu as atteint la limite de tentatives. Contacte un administrateur.',
                    inline: false
                });
                pendingVerifications.delete(userId);
            }

            await message.reply({ embeds: [errorEmbed] });
            return;
        }

        // Email valide - procéder à la vérification
        const guild = client.guilds.cache.get(verification.guildId);
        const member = guild.members.cache.get(userId);
        
        if (!member) {
            await message.reply('❌ Erreur: Impossible de te trouver sur le serveur.');
            pendingVerifications.delete(userId);
            return;
        }

        // Récupérer les rôles
        const unverifiedRole = guild.roles.cache.get(process.env.UNVERIFIED_ROLE_ID);
        const verifiedRole = guild.roles.cache.get(process.env.VERIFIED_ROLE_ID);

        if (!verifiedRole) {
            console.error('❌ Rôle "Vérifié" introuvable. Vérifiez VERIFIED_ROLE_ID dans .env');
            await message.reply('❌ Erreur de configuration du serveur. Contacte un administrateur.');
            return;
        }

        // Retirer le rôle non vérifié et ajouter le rôle vérifié
        if (unverifiedRole) {
            await member.roles.remove(unverifiedRole);
        }
        await member.roles.add(verifiedRole);

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
                    value: email,
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
        
        // Supprimer de la liste d'attente
        pendingVerifications.delete(userId);
        
        // Log de succès
        console.log(`✅ Vérification réussie pour ${message.author.tag} avec l'email: ${email}`);
        
        // Sauvegarder l'email vérifié (optionnel)
        const verifiedData = {
            userId: userId,
            username: message.author.tag,
            email: email,
            verifiedAt: new Date().toISOString()
        };
        
        // Ajouter au fichier de log (optionnel)
        const logEntry = `${new Date().toISOString()} - ${message.author.tag} (${userId}) vérifié avec ${email}\n`;
        fs.appendFileSync('verified_users.log', logEntry);

    } catch (error) {
        console.error(`❌ Erreur lors de la vérification pour ${message.author.tag}:`, error);
        await message.reply('❌ Une erreur est survenue lors de la vérification. Contacte un administrateur.');
    }
});

// Gestion des erreurs
client.on('error', (error) => {
    console.error('❌ Erreur Discord.js:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Erreur non gérée:', error);
});

// Connexion du bot
client.login(process.env.DISCORD_TOKEN);
