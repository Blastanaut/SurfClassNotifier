import { chromium } from 'playwright';
import config from './config.js';

const {
    SURF_FORECAST_LINK,
    SURF_REGISTERING_WEBSITE_LINK,
    EMAIL,
    PASSWORD
} = config;

// Function to scrape wave energy values and their corresponding dates from a surf forecast page.
export async function scrapeWaveEnergyAndDates() {
    // Initialize the browser and page
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to the surf forecast page and wait for the table to load
    await page.goto(SURF_FORECAST_LINK, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.forecast-table__row');

    // Extract time slots and energy values from the forecast table
    const data = await page.evaluate(() => {
        // Get all time slots (e.g., "AM", "PM", "Night") from forecast cells
        const timeSlots = Array.from(document.querySelectorAll('.forecast-table-time__cell')).map(
            cell => cell.textContent.trim()
        );

        // Get wave energy values from the energy cells
        const energyCells = document.querySelectorAll('.forecast-table__cell.forecast-table-energy__cell strong');
        const energyValues = Array.from(energyCells).map(cell => cell.textContent.trim());

        return { timeSlots, energyValues };
    });

    // Initialize date tracking variables
    const currentDate = new Date();           // Start with today's date
    let forecastDate = new Date(currentDate);  // Clone currentDate for tracking forecast dates
    let prevTime = null;                       // Track previous time slot to handle date changes

    // Array to hold scraped wave data
    let waveData = [];
    let energyIndex = 0; // Index for accessing energy values

    // Loop over each time slot to associate it with the correct date and energy value
    for (let i = 0; i < data.timeSlots.length; i++) {
        const timeSlot = data.timeSlots[i];

        // Move to the next day if the time slot is "AM" following "PM" or "Night"
        if (timeSlot === 'AM' && (prevTime === 'PM' || prevTime === 'Night')) {
            forecastDate.setDate(forecastDate.getDate() + 1); // Increment the forecast date
        }

        // Add data entry if there are remaining energy values
        if (energyIndex < data.energyValues.length) {
            waveData.push({
                date: forecastDate.toDateString(),  // Date in human-readable format
                time: timeSlot,                     // Time slot (e.g., "AM", "PM", "Night")
                energy: data.energyValues[energyIndex] // Corresponding energy value
            });
            energyIndex++; // Move to the next energy value
        }

        // Update the previous time slot for the next iteration
        prevTime = timeSlot;
    }

    await browser.close(); // Close the browser after scraping
    return waveData;       // Return the collected wave data
}

// Function to log into the surf registration site by entering email and password and clicking the login button.
export async function loginToSite(page) {
    console.log("🔄Navigating to the login page…");
    await page.goto(SURF_REGISTERING_WEBSITE_LINK, { waitUntil: 'domcontentloaded' });

    /* If the form is hidden behind a “Log in / Entrar” button, click it first */
    const trigger = page.locator('text=/login|entrar|sign in/i').first();
    if (await trigger.isVisible()) {
        console.log("👉 Clicking login trigger…");
        await trigger.click();
    }

    /* ----------  locate the visible inputs  ---------- */
    const emailInput = page.locator(
        'input[id^="login"]:not([type="hidden"]), ' +
        'input[placeholder*="mail" i]:not([type="hidden"])'
    );
    const passwordInput = page.locator('input[type="password"]');

    await Promise.all([
        emailInput.waitFor({ state: 'visible' }),
        passwordInput.waitFor({ state: 'visible' })
    ]);

    /* ----------  fill & submit  ---------- */
    console.log("✏️Typing credentials…");
    await emailInput.fill(EMAIL);
    await passwordInput.fill(PASSWORD);

    const submitBtn = page.locator('#but_dados, button[type="submit"]');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        submitBtn.click()
    ]);

    console.log("✅Login successful.");
}

// Function to launch a new instance of the Puppeteer browser with specified settings for optimized performance and compatibility.
export async function launchBrowser() {
    const browser = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--single-process',
            '--no-zygote'
        ],
        timeout: 60000,
    });
    return browser;
}

// Function to click on a specific date element on the page based on a provided formatted date.
export async function clickOnDate(page, formattedDate) {
    // Selector for the date element, using the data-date attribute with the specified formatted date
    const dateSelector = `[data-date="${formattedDate}"]`;

    try {
        // Attempt to click on the date element by evaluating the selector directly in the browser context
        await page.evaluate((selector) => {
            document.querySelector(selector).click();
        }, dateSelector);

        console.log(`✔️Clicked on the date: ${formattedDate}`); // Log success
    } catch (error) {
        // Log an error message and the error object if the click fails
        console.error(`❌Could not interact with the date: ${formattedDate}`);
        console.error(error);
        return false; // Return false to indicate failure
    }

    return true; // Return true if click was successful
}
