const moment = require('moment');

/**
 * Generates a Google Calendar event link.
 * @param {string} className - Name of the surf class.
 * @param {string} date - Class date in YYYY-MM-DD format.
 * @param {string} startTime - Start time in HH:mm format.
 * @param {string} endTime - End time in HH:mm format.
 * @param {string} coach - Coach name.
 * @returns {string|null} - Google Calendar link or null if invalid.
 */
function createGoogleCalendarLink(className, date, startTime, endTime, coach) {
    try {
        const startDate = moment(`${date} ${startTime}`, 'YYYY-MM-DD HH:mm', true);
        const endDate = moment(`${date} ${endTime}`, 'YYYY-MM-DD HH:mm', true);

        if (!startDate.isValid() || !endDate.isValid()) {
            throw new Error(`Invalid date/time: ${date}, ${startTime} - ${endTime}`);
        }

        return `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(className)}&dates=${startDate.format('YYYYMMDDTHHmmssZ')}/${endDate.format('YYYYMMDDTHHmmssZ')}&details=${encodeURIComponent(`Coach: ${coach}`)}`;
    } catch (error) {
        console.error('Error creating Google Calendar link:', error.message);
        return null;
    }
}


// Function to split a class time range into start and end times
function splitClassTime(classTime) {
    if (!classTime.includes(' - ')) {
        return { start: null, end: null }; // Return nulls if the format is invalid
    }

    const [start, end] = classTime.split(' - ').map(s => s.trim());
    return { start, end };
}

// Function to convert a string to title case, capitalizing the first letter of each word
function toTitleCase(str) {
    return str
        .toLowerCase()                // Convert the entire string to lowercase
        .split(' ')                   // Split the string into an array of words
        .map(word =>                   // Capitalize the first letter of each word
            word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join(' ');                   // Join the words back into a single string
}

// Function to determine the period (AM or PM) from a class time string.
function getPeriodFromClassTime(classTime) {
    // Split the time range and get the starting hour as a number
    const [startHour] = classTime.split(' - ')[0].split(':').map(Number);

    // Return "AM" if the hour is less than 12, otherwise "PM"
    return startHour < 12 ? 'AM' : 'PM';
}
module.exports = {
    createGoogleCalendarLink,
    toTitleCase,
    getPeriodFromClassTime,
    splitClassTime
};