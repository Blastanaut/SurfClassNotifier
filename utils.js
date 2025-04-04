const moment = require('moment');

// Function to generate a Google Calendar link for scheduling a class
function createGoogleCalendarLink(className, date, time, coach) {
    try {
        // Validate and split the time range
        if (!time.includes(' - ')) {
            throw new Error(`Invalid time format: ${time}. Expected format: "HH:mm - HH:mm"`);
        }
        const [start, end] = time.split(' - ');

        // Adjust the date to account for the website's zero-based month format
        const [year, month, day] = date.split('-');
        const adjustedDate = `${year}-${String(Number(month) + 1).padStart(2, '0')}-${day}`;

        // Parse the start and end dates
        const startDate = moment(`${adjustedDate} ${start}`, 'YYYY-MM-DD HH:mm', true);
        const endDate = moment(`${adjustedDate} ${end}`, 'YYYY-MM-DD HH:mm', true);

        // Check for invalid dates
        if (!startDate.isValid() || !endDate.isValid()) {
            throw new Error(`Invalid date or time provided: date="${date}", time="${time}"`);
        }

        // Construct and return the Google Calendar link
        return `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(className)}&dates=${startDate.format('YYYYMMDDTHHmmssZ')}/${endDate.format('YYYYMMDDTHHmmssZ')}&details=${encodeURIComponent(`Coach: ${coach}`)}`;
    } catch (error) {
        console.error('Error creating Google Calendar link:', error.message);
        return null; // Return null to indicate a failure
    }
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