const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailService {
    constructor() {
        this.transporter = null;
        this.init();
    }

    init() {
        try {
            this.transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                secure: false, // true pour port 465, false pour autres ports
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            logger.info('Email service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize email service', { error: error.message });
        }
    }

    // Générer un code de vérification à 6 chiffres
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Valider que l'email est bien @ynov.com
    isValidYnovEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@ynov\.com$/;
        return emailRegex.test(email);
    }

    // Envoyer le code de vérification
    async sendVerificationCode(email, code, username) {
        if (!this.transporter) {
            throw new Error('Email service not initialized');
        }

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .code-box { background: #fff; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
                .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
                .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; color: #6c757d; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🎓 Vérification Ynov Discord</h1>
                <p>Confirme ton accès au serveur étudiant</p>
            </div>
            
            <div class="content">
                <h2>Salut ${username} ! 👋</h2>
                <p>Tu as demandé l'accès au serveur Discord Ynov. Pour confirmer ton identité d'étudiant, utilise le code de vérification ci-dessous :</p>
                
                <div class="code-box">
                    <p>Ton code de vérification :</p>
                    <div class="code">${code}</div>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Important :</strong>
                    <ul>
                        <li>Ce code est valide pendant <strong>10 minutes</strong></li>
                        <li>Ne partage jamais ce code avec quelqu'un d'autre</li>
                        <li>Retourne sur Discord et tape ce code dans le chat privé avec le bot</li>
                    </ul>
                </div>
                
                <p><strong>Comment procéder :</strong></p>
                <ol>
                    <li>Retourne sur Discord</li>
                    <li>Réponds au message privé du bot Ynov</li>
                    <li>Tape exactement le code : <strong>${code}</strong></li>
                    <li>Profite de ton accès au serveur ! 🎉</li>
                </ol>
            </div>
            
            <div class="footer">
                <p>Ce message a été envoyé automatiquement par le système de vérification Ynov</p>
                <p>Si tu n'as pas demandé cette vérification, ignore simplement ce message</p>
            </div>
        </body>
        </html>
        `;

        const mailOptions = {
            from: {
                name: 'Ynov Discord Bot',
                address: process.env.EMAIL_FROM || process.env.EMAIL_USER
            },
            to: email,
            subject: `🎓 Code de vérification Ynov Discord - ${code}`,
            html: htmlContent,
            text: `Salut ${username}!\n\nTon code de vérification Discord Ynov est: ${code}\n\nCe code est valide pendant 10 minutes.\nRetourne sur Discord et tape ce code dans le chat privé avec le bot.\n\nÉquipe Ynov`
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            logger.info('Verification email sent successfully', {
                email,
                username,
                messageId: result.messageId
            });
            return true;
        } catch (error) {
            logger.error('Failed to send verification email', {
                email,
                username,
                error: error.message
            });
            throw error;
        }
    }

    // Tester la connexion email
    async testConnection() {
        if (!this.transporter) {
            return false;
        }

        try {
            await this.transporter.verify();
            logger.info('Email connection test successful');
            return true;
        } catch (error) {
            logger.error('Email connection test failed', { error: error.message });
            return false;
        }
    }
}

module.exports = new EmailService();