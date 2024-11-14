const moment = require('moment');

// Function to generate a Google Calendar link for scheduling a class
function createGoogleCalendarLink(className, date, time, coach) {
    // Split the time range into start and end times
    const [start, end] = time.split(' - ');

    // Parse and adjust dates to the Google Calendar format, accounting for month offset if needed
    const startDate = moment(`${date} ${start}`, 'YYYY-MM-DD HH:mm').add(1, 'months'); // Adjusts for month offset
    const endDate = moment(`${date} ${end}`, 'YYYY-MM-DD HH:mm').add(1, 'months');

    // Construct the Google Calendar link with event details and encoded parameters
    return `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(className)}&dates=${startDate.format('YYYYMMDDTHHmmssZ')}/${endDate.format('YYYYMMDDTHHmmssZ')}&details=${encodeURIComponent(`Coach: ${coach}`)}`;
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
    getPeriodFromClassTime
};