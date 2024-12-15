const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;        // Token for Telegram Bot
const CHAT_ID = process.env.CHAT_ID;                      // Telegram chat ID for notifications
const PUBLIC_CHANNEL_TOKEN = process.env.PUBLIC_CHANNEL_TOKEN;  // Public Telegram channel token if needed

const bot = new TelegramBot(config.TELEGRAM_TOKEN, { polling: true });

// Function to send a Telegram message to both a private chat and a public channel
async function sendTelegramMessage(message) {
    try {
        // Send message to the private chat
        await bot.sendMessage(
            CHAT_ID,                // Private chat ID (environment variable or constant)
            message,                // Message content
            {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            }
        );

       await bot.sendMessage(
            PUBLIC_CHANNEL_TOKEN,    // Public channel token or ID
            message,
            {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            }
        );

        console.log('✅Message sent to both chat and channel');
    } catch (error) {
        console.error('❌Error sending message to Telegram:', error.message);
    }
}

module.exports = {
    sendTelegramMessage
};
