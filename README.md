# Surf Class Notification System

This project is designed to check for new surf classes over the next 10 days, compare them with previously stored data, and send notifications for new or non-recurring classes via Telegram.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [Recurring Classes](#recurring-classes)
- [Functions](#functions)
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
node index.js
```

## Environment Variables

The following environment variables need to be defined in the `.env` file:

- `LOCATION_NAME`: Location name for the weather API.
- `SURF_REGISTERING_WEBSITE_MESSAGE_HEADER`: Link to the surf forecast website.

Example `.env` file:
```env
LOCATION_NAME=YourLocation
SURF_REGISTERING_WEBSITE_MESSAGE_HEADER=https://example.com/surf-forecast
```

## Recurring Classes

You can define recurring classes or patterns to ignore in notifications only in the `recurringClasses` array. These classes will still be stored in the database but won't trigger notifications.

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

The main function `checkForNewClasses` performs the following steps:

1. Fetch initial wave energy data and download existing class data from Dropbox.
2. Launch the browser and log in to the surf registration site.
3. Loop through the next 10 days to check for available classes.
4. Extract class data for the selected date.
5. Compare extracted classes with previously stored classes for the same date.
6. Store all new classes in the database and prepare notifications.
7. Send notification message for new, non-recurring classes via Telegram.

## License

This project is licensed under the MIT License.
