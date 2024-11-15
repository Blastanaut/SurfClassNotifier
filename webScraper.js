const puppeteer = require('puppeteer');
const config = require('./config');
const SURF_FORECAST_LINK = process.env.SURF_FORECAST_LINK;  // Link to surf forecasts
const SURF_REGISTERING_WEBSITE_LINK = process.env.SURF_REGISTERING_WEBSITE_LINK;  // Link to surf class website
const EMAIL = process.env.WEB_EMAIL;                      // Email for surf class website login
const PASSWORD = process.env.WEB_PASSWORD;                // Password for surf class website login

// Function to scrape wave energy values and their corresponding dates from a surf forecast page.
async function scrapeWaveEnergyAndDates() {
    // Initialize the browser and page
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

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
async function loginToSite(page) {
    // Step 1: Navigate to the login page
    //console.log("🔄Navigating to the login page...");
    await page.goto(SURF_REGISTERING_WEBSITE_LINK);

    // Short delay to allow the page to load fully
    await new Promise(resolve => setTimeout(resolve, 2000));
    //console.log("✅Login page loaded.");

    // Step 2: Enter email into the login field
    //console.log("✏️Typing in the email...");
    await page.type('#login', EMAIL); // Typing email into the input field with id 'login'
    //console.log("✅Email entered.");

    // Step 3: Enter password into the password field
    //console.log("✏️Typing in the password...");
    await page.type('#password', PASSWORD); // Typing password into the input field with id 'password'
    //console.log("✅Password entered.");

    // Step 4: Wait until the login button becomes visible to ensure it is clickable
    //console.log("⏳Waiting for the login button to become visible...");
    await page.waitForSelector('#but_dados', { visible: true });

    // Extra delay to ensure the password field is fully populated before clicking
    await new Promise(resolve => setTimeout(resolve, 1000));
    //console.log("✅Login button is visible.");

    // Step 5: Click the login button to submit the form
    //console.log("🔘Attempting to click the login button...");
    await page.click('#but_dados');
    //console.log("✅Login button clicked.");

    // Step 6: Wait for navigation to complete after login
   // console.log("⏳Waiting for navigation to complete after login...");
    await page.waitForNavigation();
    //console.log("✅Navigation complete. Login successful.");
}

// Function to launch a new instance of the Puppeteer browser with specified settings for optimized performance and compatibility.
async function launchBrowser() {
    // Launch a new Puppeteer browser instance with custom options
    const browser = await puppeteer.launch({
        // 'headless: "new"' initiates a headless browser in newer versions of Puppeteer for more stability and performance
        headless: 'new',

        // Arguments for optimizing and stabilizing the browser instance
        args: [
            '--no-sandbox',                   // Disables the sandbox for enhanced compatibility on certain platforms
            '--disable-setuid-sandbox',        // Disables the setuid sandbox, often required in some containerized environments
            '--disable-gpu',                   // Disables GPU hardware acceleration, useful in headless mode
            '--disable-dev-shm-usage'          // Reduces memory usage on systems with limited shared memory
        ]
    });

    return browser; // Return the browser instance to be used in other functions
}

// Function to click on a specific date element on the page based on a provided formatted date.
async function clickOnDate(page, formattedDate) {
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

module.exports = {
    scrapeWaveEnergyAndDates,
    loginToSite,
    launchBrowser,
    clickOnDate
};