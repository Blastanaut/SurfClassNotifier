const fetch = require('isomorphic-fetch');
const config = require('./config');

const WEATHERAPI_API_KEY = process.env.WEATHERAPI_API_KEY;      // API key for fetching weather data

// Function to retrieve weather data for a specified city and date
async function getWeather(city, date) {
    // Construct the API URL with query parameters for location and date
    const url = `https://api.weatherapi.com/v1/history.json?key=${WEATHERAPI_API_KEY}&q=${city}&dt=${date}&aqi=no`;

    try {
        // Fetch weather data from WeatherAPI
        const response = await fetch(url);

        // Check if the response is successful (status 200)
        if (!response.ok) {
            throw new Error(`Error fetching weather data: ${response.status}`);
        }

        // Parse the JSON response data
        const data = await response.json();

        // Extract temperature (rounded average temp for the day) and weather condition text
        const temperature = Math.round(data.forecast.forecastday[0].day.avgtemp_c);
        const weather = data.forecast.forecastday[0].day.condition.text.toLowerCase();

        // Select an emoji based on the weather condition
        let emoji = '';
        if (weather.includes('clear') || weather.includes('sunny')) {
            emoji = '☀️'; // Sunny weather
        } else if (weather.includes('rain') || weather.includes('drizzle')) {
            emoji = '🌧️'; // Rainy weather
        } else if (weather.includes('cloud')) {
            emoji = '☁️'; // Cloudy weather
        } else if (weather.includes('storm') || weather.includes('thunder')) {
            emoji = '⛈️'; // Stormy weather
        } else {
            emoji = '🌥️'; // Default to partly cloudy
        }

        // Format temperature with a leading '+' for positive values
        const formattedTemperature = temperature < 0 ? `${temperature}` : `+${temperature}`;

        // Construct and return the weather message
        const weatherMessage = `${emoji}${formattedTemperature}`;
        return weatherMessage;

    } catch (error) {
        // Log any errors encountered during the fetch or processing
        console.error('Error fetching weather data:', error.message);
        return null; // Return null if an error occurs
    }
}

module.exports = {
    getWeather
};