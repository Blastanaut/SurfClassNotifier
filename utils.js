const moment = require('moment');

// Convert string to title case
function toTitleCase(str) {
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Normalize date to YYYY-MM-DD with leading zeroes
function normalizeDate(date) {
    const [year, month, day] = date.split('-').map(Number);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Generate Google Calendar link
function createGoogleCalendarLink(className, date, time, coach) {
    try {
        if (!time.includes(' - ')) {
            throw new Error(`Invalid time format: ${time}. Expected format: "HH:mm - HH:mm"`);
        }

        const [start, end] = time.split(' - ');

        const normalizedDate = normalizeDate(date);

        const startDate = moment(`${normalizedDate} ${start}`, 'YYYY-MM-DD HH:mm', true).utcOffset('+01:00', true);
        const endDate = moment(`${normalizedDate} ${end}`, 'YYYY-MM-DD HH:mm', true).utcOffset('+01:00', true);

        if (!startDate.isValid() || !endDate.isValid()) {
            throw new Error(`Invalid date or time provided: date="${date}", time="${time}"`);
        }

        const title = toTitleCase(className);
        const location = '';
        const details = `Coach: ${coach}`;

        return `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(title)}&dates=${startDate.format('YYYYMMDDTHHmmss')}/${endDate.format('YYYYMMDDTHHmmss')}&location=${encodeURIComponent(location)}&details=${encodeURIComponent(details)}&ctz=Europe/Lisbon`;
    } catch (error) {
        console.error('Error creating Google Calendar link:', error.message);
        return null;
    }
}

// Determine AM/PM
function getPeriodFromClassTime(classTime) {
    const [startHour] = classTime.split(' - ')[0].split(':').map(Number);
    return startHour < 12 ? 'AM' : 'PM';
}

module.exports = {
    createGoogleCalendarLink,
    toTitleCase,
    getPeriodFromClassTime
};