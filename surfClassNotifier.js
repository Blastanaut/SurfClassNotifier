require('dotenv').config();
const config = require('./config');
const moment = require('moment');
const { initializeDatabase, getClassData, saveClassData } = require('./database');
const { sendTelegramMessage } = require('./telegramBot');
const { getWeather } = require('./weatherService');
const { toTitleCase, createGoogleCalendarLink, getPeriodFromClassTime } = require('./utils');
const { scrapeWaveEnergyAndDates, loginToSite, launchBrowser, clickOnDate } = require('./webScraper');
const { downloadFromDropbox, uploadToDropbox } = require('./dropboxService');

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
    // Step 1: Fetch initial wave energy data and download existing class data from Dropbox
    const waveData = await scrapeWaveEnergyAndDates();  // Fetch current wave energy data
    await downloadFromDropbox('/surfClasses.db', './surfClasses.db');  // Download local copy of class database

    let browser;
    try {
        // Step 2: Launch the browser and log in to the surf registration site
        browser = await launchBrowser();
        const page = await browser.newPage();
        await loginToSite(page);  // Logs into the site and waits for login to complete

        // Navigate to the calendar page where classes are displayed
        await page.evaluate(() => {
            open_page("calendario_aulas", "&source=mes");
        });
        await new Promise(resolve => setTimeout(resolve, 5000));  // Short delay for calendar data loading

        // Step 3: Loop through the next 10 days to check for available classes
        for (let i = 0; i <= 10; i++) {
            const dayFromNow = moment().add(i, 'days');
            const adjustedMonth = dayFromNow.month() - 1;  // Adjusts month to match website format (0-indexed)
            const formattedDate = dayFromNow.month(adjustedMonth).format('YYYY-MM-D');
            const friendlyDate = dayFromNow.month(dayFromNow.month() + 1).format('MMMM D, dddd');  // User-friendly date format

            // Click on each date in the calendar to load available classes for that day
            if (!await clickOnDate(page, formattedDate)) continue;  // Skip if date click fails
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
            const newClasses = classCounts.filter(classData =>
                !previousClasses.some(prev => prev.className === classData.className && prev.classTime === classData.classTime)
            );

            // Filter out recurring classes for notification purposes
            const notifyClasses = newClasses.filter(classData =>
                !recurringClasses.some(recurring =>
                    classData.className.trim().toLowerCase().includes(recurring.className.trim().toLowerCase())
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

                    saveClassData(formattedDate, classData.className, classData.classTime, classData.coachName, energyInfo);

                    console.log(`🆕 New classes added to the database on ${formattedDate}:`, classData.className, classData.classTime, classData.coachName, energyInfo);
                });
            }

            // Step 7: Prepare and send notification message for new, non-recurring classes
            if (notifyClasses.length > 0) {
                const weatherMessage = await getWeather(LOCATION_NAME, formattedDate);
                let message = `[${friendlyDate}](${SURF_REGISTERING_WEBSITE_MESSAGE_HEADER})\n`; //${weatherMessage}

                const performanceClassesByTime = {};
                const otherClassesByTime = {};

                // Organize classes into performance and other categories, with Google Calendar links
                notifyClasses.forEach(classData => {
                    const period = getPeriodFromClassTime(classData.classTime);
                    const { className, classTime, coachName } = classData;
                    const formattedClassName = toTitleCase(className);
                    const formattedCoachName = toTitleCase(coachName);
                    const calendarLink = createGoogleCalendarLink(formattedClassName, formattedDate, classTime, formattedCoachName);
                    const waveEnergy = waveData.find(wave =>
                        wave.date === dayFromNow.format('ddd MMM DD YYYY') &&
                        wave.time === period
                    );
                    const energyInfo = waveEnergy ? parseInt(waveEnergy.energy.match(/\d+/)[0], 10) : null;

                    if (
                        className.includes('PERFORMANCE LARANJA') ||
                        className.includes('PERFORMANCE VERMELHO') ||
                        className.includes('PERFORMANCE ALL LEVELS') ||
                        className.includes('SURF SAFARI PERFORMANCE')
                    ) {
                        if (!performanceClassesByTime[classTime]) {
                            performanceClassesByTime[classTime] = [];
                        }
                        performanceClassesByTime[classTime].push(`\n[⚡${energyInfo}🏄🗓️️${formattedClassName} (${formattedCoachName})](${calendarLink})`);
                        console.log(`🔔Notification sent for performance class:`, formattedClassName, classTime, formattedCoachName, energyInfo);
                    } else {
                        if (!otherClassesByTime[classTime]) {
                            otherClassesByTime[classTime] = [];
                        }
                        otherClassesByTime[classTime].push(`\n[⚡${energyInfo}🏄🗓️️️${formattedClassName} (${formattedCoachName})](${calendarLink})`);
                        console.log(`🔔Notification sent for other class:`, formattedClassName, classTime, formattedCoachName, energyInfo);
                    }
                });

                // Format the message for performance and other classes
                Object.keys(performanceClassesByTime).forEach(time => {
                    message += `\n🥇Performance Classes:\n${time}: ${performanceClassesByTime[time].join(', ')}\n`;
                });
                Object.keys(otherClassesByTime).forEach(time => {
                    message += `\nOther Classes:\n${time}: ${otherClassesByTime[time].join(', ')}\n`;
                });

                // Send message via Telegram
                await sendTelegramMessage(message);
            } else {
                console.log(`💤No notifications for ${formattedDate}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));  // Short delay before checking the next date
        }
    } catch (error) {
        console.error('Error during Puppeteer operation:', error);  // Log any encountered errors
    } finally {
        if (browser) await browser.close();  // Ensure the browser closes
        await uploadToDropbox('/surfClasses.db', './surfClasses.db');  // Save updated class data to Dropbox
        process.exit();  // Exit the process after all operations complete
    }
}

// Run the main function
checkForNewClasses();