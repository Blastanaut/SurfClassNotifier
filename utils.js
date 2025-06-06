import moment from 'moment';
import { performanceClassKeywords } from './classFilters.js';

/**
 * Generates a Google Calendar event link.
 * @param {string} className - Name of the surf class.
 * @param {string} date - Class date in YYYY-MM-DD format.
 * @param {string} startTime - Start time in HH:mm format.
 * @param {string} endTime - End time in HH:mm format.
 * @param {string} coach - Coach name.
 * @returns {string|null} - Google Calendar link or null if invalid.
 */
export function createGoogleCalendarLink(className, date, startTime, endTime, coach) {
    try {
        const startDate = moment(`${date} ${startTime}`, 'YYYY-MM-DD HH:mm', true);
        const endDate = moment(`${date} ${endTime}`, 'YYYY-MM-DD HH:mm', true);

        if (!startDate.isValid() || !endDate.isValid()) {
            throw new Error(`Invalid date/time: ${date}, ${startTime} - ${endTime}`);
        }

        return `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(className)}&dates=${startDate.format('YYYYMMDDTHHmmssZ')}/${endDate.format('YYYYMMDDTHHmmssZ')}&details=${encodeURIComponent(`Coach: ${coach}`)}`;
    } catch (error) {
        console.error('Error generating Google Calendar link:', error);
        return null;
    }
}

// Function to split a class time range into start and end times
export function splitClassTime(classTime) {
    if (!classTime.includes(' - ')) {
        return { start: null, end: null }; // Return nulls if the format is invalid
    }

    const [start, end] = classTime.split(' - ').map(s => s.trim());
    return { start, end };
}

// Function to convert a string to title case, capitalizing the first letter of each word
export function toTitleCase(str) {
    return str
        .toLowerCase()                // Convert the entire string to lowercase
        .split(' ')                   // Split the string into an array of words
        .map(word =>                   // Capitalize the first letter of each word
            word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join(' ');                   // Join the words back into a single string
}

// Function to determine the period (AM or PM) from a class time string.
export function getPeriodFromClassTime(classTime) {
    // Split the time range and get the starting hour as a number
    const [startHour] = classTime.split(' - ')[0].split(':').map(Number);

    // Return "AM" if the hour is less than 12, otherwise "PM"
    return startHour < 12 ? 'AM' : 'PM';
}

// Helper function to create a calendar entry
export function createCalendarEntry(classData, formattedDate, waveData, dayFromNow) {
    const {
        className,
        classTime,
        classStartTime,
        classEndTime,
        coachName
    } = classData;

    const period = getPeriodFromClassTime(classTime);
    const formattedClassName = toTitleCase(className);
    const formattedCoachName = toTitleCase(coachName);
    console.log(`[DEBUG] Creating calendar link for: ${formattedDate}, ${classStartTime} - ${classEndTime}`);

    const calendarLink = createGoogleCalendarLink(
        formattedClassName,
        formattedDate,
        classStartTime,
        classEndTime,
        formattedCoachName
    );

    const waveEnergy = waveData.find(wave =>
        wave.date === dayFromNow.format('ddd MMM DD YYYY') &&
        wave.time === period
    );
    const energyInfo = waveEnergy ? parseInt(waveEnergy.energy.match(/\d+/)[0], 10) : null;

    return {
        entry: `\n[⚡${energyInfo}🏄🗓️️${formattedClassName} (${formattedCoachName})](${calendarLink})`,
        classTime,
        isPerformanceClass: performanceClassKeywords.some(keyword => className.includes(keyword))
    };
}