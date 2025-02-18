# RegyBox.pt to Telegram Notification System

This project is designed to check for new classes at supported RegyBox.pt schools, compare them with previously stored data, and send notifications for new classes via Telegram.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [Recurring Classes](#recurring-classes)
- [Functions](#functions)
  - [checkForNewClasses](#checkfornewclasses)
  - [Telegram Integration](#telegram-integration)
  - [Dropbox Integration](#dropbox-integration)
- [License](#license)

## Installation

1. Clone the repository:
    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2. Install the required dependencies:
    ```bash
    npm install
    ```

## Configuration

1. Create a `.env` file in the root directory and add the necessary environment variables (see [Environment Variables](#environment-variables) section).

2. Configure the classes you want to ignore in notifications only in the `recurringClasses` array (see [Recurring Classes](#recurring-classes) section).

## Usage

Start the script by running:
```bash
node surfClassNotifier.js
```

## Environment Variables
The following environment variables need to be defined in the `.env` file:

- `TELEGRAM_TOKEN`: Telegram bot token for sending messages.
- `CHAT_ID`: Telegram chat ID where messages will be sent.
- `EMAIL`: Email for logging into the website.
- `PASSWORD`: Password for logging into the website.
- `PUBLIC_CHANNEL_TOKEN`: Token for the Telegram channel.
- `WEATHERAPI_API_KEY`: API key for the weather service.
- `LOCATION_NAME`: Location name for the weather API.
- `SURF_REGISTERING_WEBSITE_MESSAGE_HEADER`: Direct link to the school sign-up website at regibox.pt.
- `SURF_FORECAST_LINK`: Link to the surf forecast website.
- `DROPBOX_ACCESS_TOKEN`: Access token for Dropbox.
- `DROPBOX_REFRESH_TOKEN`: Refresh token for Dropbox.
- `DROPBOX_CLIENT_ID`: Client ID for Dropbox.
- `DROPBOX_CLIENT_SECRET`: Client secret for Dropbox.

Example `.env` file:
```env
TELEGRAM_TOKEN=your_telegram_token
CHAT_ID=your_chat_id
EMAIL=your_email
PASSWORD=your_password
PUBLIC_CHANNEL_TOKEN=your_public_channel_token
WEATHERAPI_API_KEY=your_weatherapi_api_key
LOCATION_NAME=YourLocation
SURF_REGISTERING_WEBSITE_LINK=https://example.com/register
SURF_FORECAST_LINK=https://example.com/surf-forecast
DROPBOX_ACCESS_TOKEN=your_dropbox_access_token
DROPBOX_REFRESH_TOKEN=your_dropbox_refresh_token
DROPBOX_CLIENT_ID=your_dropbox_client_id
DROPBOX_CLIENT_SECRET=your_dropbox_client_secret
```

## Recurring Classes

You can define recurring classes or patterns to ignore in notifications in the `recurringClasses` array. These classes will still be stored in the database but won't trigger notifications.

Example:
```javascript
const recurringClasses = [
    { className: 'AZUL'},
    { className: 'CINZA'},
    { className: 'ERASMUS'},
    { className: 'BEGINNERS ADULTS'},
    { className: 'PRIVADA'},
    { className: 'SURF ADAPTADO'},
    { className: 'GRUPO'},
    { className: 'ONDA SOCIAL'},
    { className: 'TREINO FÍSICO GROMS - FIT2SURF'},
    // Add classes here to stop notifications, they will still be stored in the database
];
```

## Functions

### checkForNewClasses

This function performs the following steps:

1. Fetch initial wave energy data and download existing class data from Dropbox.
2. Launch the browser and log in to the surf registration site.
3. Loop through the next 10 days to check for available classes.
4. Extract class data for the selected date.
5. Compare extracted classes with previously stored classes for the same date.
6. Store all new classes in the database and prepare notifications.
7. Send notification message for new, non-recurring classes via Telegram.

### Telegram Integration

The project uses the `node-telegram-bot-api` library for sending notifications via Telegram.

- Initializes a Telegram bot using the provided token.
- Sends messages to a private chat and optionally to a public channel.
- Handles errors during the message sending process.

### Dropbox Integration

The project uses the `dropbox` library for downloading and uploading files to Dropbox.

- Refreshes the Dropbox access token using the stored refresh token.
- Downloads files from Dropbox to a specified local path.
- Uploads local files to Dropbox at the specified Dropbox path.
- Handles errors during the download and upload processes and retries with refreshed tokens if necessary.

## License

This project is licensed under the MIT License.
