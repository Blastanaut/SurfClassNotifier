require('dotenv').config();
const config = require('./config');
const moment = require('moment');
const {
    initializeDatabase,
    getClassData,
    saveClassData,
    getUnnotifiedClasses,
    markClassAsNotified
} = require('./database');

const { sendTelegramMessage } = require('./telegramBot');
const { getWeather } = require('./weatherService');
const { toTitleCase, createGoogleCalendarLink, getPeriodFromClassTime } = require('./utils');
const { scrapeWaveEnergyAndDates, loginToSite, launchBrowser, clickOnDate } = require('./webScraper');
const { downloadFromDropbox, uploadToDropbox } = require('./dropboxService');
const { splitClassTime } = require('./utils'); // make sure it's imported
const LOCATION_NAME = process.env.LOCATION_NAME;               // Location name for weather API
const SURF_REGISTERING_WEBSITE_MESSAGE_HEADER = process.env.SURF_REGISTERING_WEBSITE_MESSAGE_HEADER  // Link to surf forecast website

// Define recurring classes or patterns to ignore in notifications only
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

/**
 * Checks for new surf classes over the next 10 days, compares with previously stored data,
 * and sends notifications for new or non-recurring classes.
 */
async function checkForNewClasses() {
    initializeDatabase();
    // Step 1: Fetch initial wave energy data and download existing class data from Dropbox
    const waveData = await scrapeWaveEnergyAndDates();  // Fetch current wave energy data
    await downloadFromDropbox('/surfClasses.db', './surfClasses.db');  // Download local copy of class database

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
            // Get the date i days from now
            const dayFromNow = moment().add(i, 'days');

            // Format the date with a 0-based month for the website
            const year = dayFromNow.year();
            const zeroBasedMonth = dayFromNow.month(); // Month is already 0-based in Moment.js
            const day = dayFromNow.date(); // Day of the month

            // Construct the formatted date string
            const rawDateForSite = `${year}-${zeroBasedMonth}-${day}`;             // for clicking
            const formattedDate = dayFromNow.format('YYYY-MM-DD');                 // for DB + calendar logic
            console.log(`Formatted Date: ${rawDateForSite}`);
            const friendlyDate = dayFromNow.month(dayFromNow.month()).format('MMMM D, dddd');  // User-friendly date format

            // Click on each date in the calendar to load available classes for that day
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

// 🔻 Filter out recurring/never-notify classes
            const notifyClasses = unnotifiedClasses.filter(classData =>
                !recurringClasses.some(recurring =>
                    classData.className.trim().toLowerCase().includes(recurring.className.trim().toLowerCase())
                )
            );

            if (notifyClasses.length > 0) {
                const weatherMessage = await getWeather(LOCATION_NAME, formattedDate);
                let message = `[${friendlyDate}](${SURF_REGISTERING_WEBSITE_MESSAGE_HEADER})\n`;

                const performanceClassesByTime = {};
                const otherClassesByTime = {};

                notifyClasses.forEach(classData => {
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

                    const entry = `\n[⚡${energyInfo}🏄🗓️️${formattedClassName} (${formattedCoachName})](${calendarLink})`;

                    if (
                        className.includes('PERFORMANCE LARANJA') ||
                        className.includes('PERFORMANCE VERMELHO') ||
                        className.includes('PERFORMANCE ALL LEVELS') ||
                        className.includes('SURF SAFARI PERFORMANCE')
                    ) {
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

                    // ✅ Mark as notified after including it
                    markClassAsNotified(formattedDate, className, classTime);
                });

                Object.keys(performanceClassesByTime).forEach(time => {
                    message += `\n🥇Performance Classes:\n${time}: ${performanceClassesByTime[time].join(', ')}\n`;
                });
                Object.keys(otherClassesByTime).forEach(time => {
                    message += `\nOther Classes:\n${time}: ${otherClassesByTime[time].join(', ')}\n`;
                });

                await sendTelegramMessage(message);
            }
            else {
                console.log(`💤No notifications for ${formattedDate}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));  // Short delay before checking the next date
        }
    } catch (error) {
        console.error('Error during Playwright operation:', error);  // Log any encountered errors
    } finally {
        if (browser) await browser.close();  // Ensure the browser closes
        await uploadToDropbox('/surfClasses.db', './surfClasses.db');  // Save updated class data to Dropbox
        process.exit();  // Exit the process after all operations complete
    }
}

// Run the main function
checkForNewClasses();
