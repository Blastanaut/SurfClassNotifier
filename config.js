require('dotenv').config(); // Load environment variables from .env file

module.exports = {
    TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
    CHAT_ID: process.env.CHAT_ID,
    EMAIL: process.env.WEB_EMAIL,
    PASSWORD: process.env.WEB_PASSWORD,
    PUBLIC_CHANNEL_TOKEN: process.env.PUBLIC_CHANNEL_TOKEN,
    WEATHERAPI_API_KEY: process.env.WEATHERAPI_API_KEY,
    LOCATION_NAME: process.env.LOCATION_NAME,
    SURF_REGISTERING_WEBSITE_LINK: process.env.SURF_REGISTERING_WEBSITE_LINK,
    SURF_FORECAST_LINK: process.env.SURF_FORECAST_LINK,
    DROPBOX_ACCESS_TOKEN: process.env.DROPBOX_ACCESS_TOKEN,
    DROPBOX_REFRESH_TOKEN: process.env.DROPBOX_REFRESH_TOKEN,
    DROPBOX_CLIENT_ID: process.env.DROPBOX_CLIENT_ID,
    DROPBOX_CLIENT_SECRET: process.env.DROPBOX_CLIENT_SECRET
};