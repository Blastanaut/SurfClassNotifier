import { Telegraf } from 'telegraf';
import config from './config.js';

const { TELEGRAM_TOKEN, CHAT_ID, PUBLIC_CHANNEL_TOKEN, ENABLE_TELEGRAM_PRIVATE, ENABLE_TELEGRAM_PUBLIC, SURF_REGISTERING_WEBSITE_LINK } = config;

// Debug flags (now controlled via config.js)
const SEND_TO_PRIVATE = ENABLE_TELEGRAM_PRIVATE; // Set to false to disable private chat messages
const SEND_TO_PUBLIC = ENABLE_TELEGRAM_PUBLIC;  // You can add a separate flag if needed

const bot = new Telegraf(TELEGRAM_TOKEN);

async function sendTelegramMessage(message) {
    const recipients = [];
    if (SEND_TO_PRIVATE) recipients.push(CHAT_ID);
    if (SEND_TO_PUBLIC) recipients.push(PUBLIC_CHANNEL_TOKEN);

    if (recipients.length === 0) {
        console.log('⚠️ No recipients enabled for Telegram message.');
        return;
    }

    try {
        await Promise.all(
            recipients.map(id => bot.telegram.sendMessage(id, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            }))
        );
        console.log('✅ Message sent to enabled recipients');
    } catch (error) {
        console.error('❌ Error sending message to Telegram:', error.message);
    }
}

// Helper function to build and send the notification message
async function buildAndSendNotificationMessage(performanceClassesByTime, otherClassesByTime, friendlyDate) {
    let message = `[${friendlyDate}](${SURF_REGISTERING_WEBSITE_LINK})\n`;

    Object.keys(performanceClassesByTime).forEach(time => {
        message += `\n🥇Performance Classes:\n${time}: ${performanceClassesByTime[time].join(', ')}\n`;
    });
    Object.keys(otherClassesByTime).forEach(time => {
        message += `\nOther Classes:\n${time}: ${otherClassesByTime[time].join(', ')}\n`;
    });

    await sendTelegramMessage(message);
}

export { sendTelegramMessage, buildAndSendNotificationMessage };
