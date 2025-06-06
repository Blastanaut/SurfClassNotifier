import fetch from 'isomorphic-fetch';
import config from './config.js';

const { WEATHERAPI_API_KEY } = config;

// Function to retrieve weather data for a specified city and date
export async function getWeather(city, date) {
    // Fetch forecast data from OpenWeather
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${WEATHERAPI_API_KEY}&units=metric`;

    try {
        // Fetch weather data from OpenWeather API
        const response = await fetch(url);

        // Check if the response is successful (status 200)
        if (!response.ok) {
            throw new Error(`Error fetching weather data: ${response.status}`);
        }

        // Parse the JSON response data
        const data = await response.json();

        // Filter forecasts to find the closest match to the specified date
        const targetDate = new Date(date);
        const forecast = data.list.find((entry) => {
            const forecastDate = new Date(entry.dt * 1000); // Convert timestamp to Date
            return (
                forecastDate.getFullYear() === targetDate.getFullYear() &&
                forecastDate.getMonth() === targetDate.getMonth() &&
                forecastDate.getDate() === targetDate.getDate()
            );
        });

        // If no forecast is found for the exact date, handle it
        if (!forecast) {
            console.warn(`No forecast available for ${date}`);
            return null;
        }

        // Extract temperature and weather condition description
        const temperature = Math.round(forecast.main.temp);
        const weather = forecast.weather[0].description.toLowerCase();

        // Select an emoji based on the weather condition
        let emoji = '';
        if (weather.includes('clear') || weather.includes('sun')) {
            emoji = '☀️'; // Sunny weather
        } else if (weather.includes('rain') || weather.includes('drizzle')) {
            emoji = '🌧️'; // Rainy weather
        } else if (weather.includes('cloud')) {
            emoji = '☁️'; // Cloudy weather
        } else if (weather.includes('storm') || weather.includes('thunder')) {
            emoji = '⛈️'; // Stormy weather
        } else if (weather.includes('snow')) {
            emoji = '❄️'; // Snowy weather
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
        console.error('❌ Error fetching weather data:', error);
        return null; // Return null if an error occurs
    }
}
