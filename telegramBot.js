const TelegramBot = require('node-telegram-bot-api');
const {
    TELEGRAM_TOKEN,
    CHAT_ID,
    PUBLIC_CHANNEL_TOKEN
} = require('./config');

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

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
