import 'dotenv/config';
import moment from 'moment';

// Import configuration settings
// These include location name, message headers, and Dropbox upload/download toggles
import config from './config.js';

// Destructure configuration settings for easier access
const {
    LOCATION_NAME,
    SURF_REGISTERING_WEBSITE_MESSAGE_HEADER,
    ENABLE_DROPBOX_DOWNLOAD,
    ENABLE_DROPBOX_UPLOAD
} = config;

// Import database-related functions for initializing, retrieving, and saving class data
import {
    initializeDatabase,
    getClassData,
    saveClassData,
    getUnnotifiedClasses,
    markClassAsNotified
} from './database.js';

// Import services for sending notifications and interacting with external APIs
import { sendTelegramMessage, buildAndSendNotificationMessage } from './telegramBot.js';
import { getWeather } from './weatherService.js';
import { downloadFromDropbox, uploadToDropbox } from './dropboxService.js';

// Import utility functions for string manipulation, calendar links, and time parsing
import {
    toTitleCase,
    createGoogleCalendarLink,
    getPeriodFromClassTime,
    splitClassTime,
    createCalendarEntry
} from './utils.js';

// Import web scraper functions for interacting with the surf registration website
import {
    scrapeWaveEnergyAndDates,
    loginToSite,
    launchBrowser,
    clickOnDate
} from './webScraper.js';

// Import filters for recurring classes and performance class keywords
import { recurringClasses, performanceClassKeywords } from './classFilters.js';

/**
 * Main function to check for new surf classes over the next 10 days.
 * Compares with previously stored data and sends notifications for new or non-recurring classes.
 */
async function checkForNewClasses() {
    // Initialize the local database to ensure it is ready for operations
    initializeDatabase();

    // Step 1: Fetch wave energy data and optionally download the class database from Dropbox
    const waveData = await scrapeWaveEnergyAndDates();  // Fetch current wave energy data
    if (ENABLE_DROPBOX_DOWNLOAD) {
        await downloadFromDropbox('/surfClasses.db', './surfClasses.db');  // Download local copy of class database
    } else {
        console.log('⚠️ Dropbox download skipped (ENABLE_DROPBOX_DOWNLOAD is false)');
    }

    let browser;
    try {
        // Step 2: Launch the browser and log in to the surf registration site
        browser = await launchBrowser();
        const context = await browser.newContext();
        const page = await context.newPage();
        await loginToSite(page);  // Logs into the site and waits for login to complete

        // Navigate to the calendar page where classes are displayed
        await page.evaluate(() => {
            open_page("calendario_aulas", "&source=mes");
        });
        await new Promise(resolve => setTimeout(resolve, 5000));  // Short delay for calendar data loading

        // Step 3: Loop through the next 10 days to check for available classes
        for (let i = 0; i <= 10; i++) {
            // Calculate the date i days from now
            const dayFromNow = moment().add(i, 'days');

            // Format the date for website interaction and database storage
            const year = dayFromNow.year();
            const zeroBasedMonth = dayFromNow.month(); // Month is already 0-based in Moment.js
            const day = dayFromNow.date(); // Day of the month

            const rawDateForSite = `${year}-${zeroBasedMonth}-${day}`;  // Format for clicking on the website
            const formattedDate = dayFromNow.format('YYYY-MM-DD');  // Format for database and calendar logic
            console.log(`Formatted Date: ${rawDateForSite}`);
            const friendlyDate = dayFromNow.month(dayFromNow.month()).format('MMMM D, dddd');  // User-friendly format

            // Click on the date in the calendar to load available classes for that day
            if (!await clickOnDate(page, rawDateForSite)) continue;  // Skip if date click fails
            await new Promise(resolve => setTimeout(resolve, 2000));  // Wait for data to load

            // Step 4: Extract class data for the selected date
            const classCounts = await page.evaluate(() => {
                const classElements = document.querySelectorAll('.row.no-gap .col-50[align="left"]');
                const timeElements = document.querySelectorAll('.row.no-gap .col[align="left"]:not(.col-auto)');
                const coachElements = document.querySelectorAll('.row.no-gap .col-50[align="right"]');
                const classData = [];

                for (let i = 0; i < classElements.length; i++) {
                    const className = classElements[i].innerText.trim().toUpperCase();
                    const classTime = timeElements[i]?.innerText.trim() || 'No time available';  // Default if time missing
                    const coachName = coachElements[i]?.innerText.trim() || 'No coach available';  // Default if coach missing

                    classData.push({ className, classTime, coachName });
                }
                return classData;
            });

            // Step 5: Compare extracted classes with previously stored classes for the same date
            const previousClasses = await new Promise(resolve => getClassData(formattedDate, resolve));
            const safePreviousClasses = Array.isArray(previousClasses) ? previousClasses : [];

            const newClasses = classCounts.filter(classData =>
                !safePreviousClasses.some(prev =>
                    prev.className === classData.className && prev.classTime === classData.classTime
                )
            );

            // Step 6: Store all new classes in the database and prepare notifications
            if (newClasses.length > 0) {
                newClasses.forEach(classData => {
                    const period = getPeriodFromClassTime(classData.classTime);
                    const waveEnergy = waveData.find(wave =>
                        wave.date === dayFromNow.format('ddd MMM DD YYYY') &&
                        wave.time === period
                    );
                    const energyInfo = waveEnergy ? parseInt(waveEnergy.energy.match(/\d+/)[0], 10) : null;

                    const { className, classTime, coachName } = classData;
                    const { start, end } = splitClassTime(classTime);

                    const isRecurring = recurringClasses.some(recurring =>
                        className.trim().toLowerCase().includes(recurring.className.trim().toLowerCase())
                    );

                    const notifiedStatus = isRecurring ? 0 : 1;

                    saveClassData(
                        formattedDate,
                        className,
                        classTime,
                        start,
                        end,
                        coachName,
                        energyInfo,
                        notifiedStatus
                    );


                    console.log(`🆕 New classes added to the database on ${formattedDate}:`, classData.className, classData.classTime, classData.coachName, energyInfo);
                });
            }

            // Step 7: Prepare and send notification message for new, non-recurring classes
            const unnotifiedClasses = await new Promise(resolve => getUnnotifiedClasses(formattedDate, resolve));

// Filter out recurring/never-notify classes
            const notifyClasses = unnotifiedClasses.filter(classData =>
                !recurringClasses.some(recurring =>
                    classData.className.trim().toLowerCase().includes(recurring.className.trim().toLowerCase())
                )
            );

            if (notifyClasses.length > 0) {
                const { performanceClassesByTime, otherClassesByTime } = categorizeClasses(notifyClasses, formattedDate, waveData, dayFromNow);
                await buildAndSendNotificationMessage(performanceClassesByTime, otherClassesByTime, friendlyDate);
            } else {
                console.log(`💤No notifications for ${formattedDate}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));  // Short delay before checking the next date
        }
    } catch (error) {
        console.error('Error during Playwright operation:', error);  // Log any encountered errors
    } finally {
        // Ensure the browser closes and optionally upload the updated database to Dropbox
        if (browser) await browser.close();
        if (ENABLE_DROPBOX_UPLOAD) {
            await uploadToDropbox('/surfClasses.db', './surfClasses.db');  // Save updated class data to Dropbox
        } else {
            console.log('⚠️ Dropbox upload skipped (ENABLE_DROPBOX_UPLOAD is false)');
        }
        process.exit();  // Exit the process after all operations complete
    }
}

/**
 * Helper function to categorize classes into performance and other categories.
 * Marks classes as notified after processing.
 */
function categorizeClasses(notifyClasses, formattedDate, waveData, dayFromNow) {
    const performanceClassesByTime = {};
    const otherClassesByTime = {};

    notifyClasses.forEach(classData => {
        const { entry, classTime, isPerformanceClass } = createCalendarEntry(classData, formattedDate, waveData, dayFromNow);

        if (isPerformanceClass) {
            if (!performanceClassesByTime[classTime]) {
                performanceClassesByTime[classTime] = [];
            }
            performanceClassesByTime[classTime].push(entry);
        } else {
            if (!otherClassesByTime[classTime]) {
                otherClassesByTime[classTime] = [];
            }
            otherClassesByTime[classTime].push(entry);
        }

        // Mark as notified after including it
        markClassAsNotified(formattedDate, classData.className, classData.classTime);
    });

    return { performanceClassesByTime, otherClassesByTime };
}

// Run the main function to start the process
checkForNewClasses();
