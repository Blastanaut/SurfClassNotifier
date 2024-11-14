const sqlite3 = require('sqlite3').verbose();          // SQLite3 for database management

const db = new sqlite3.Database('./surfClasses.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

// Function to initialize database
function initializeDatabase() {
    db.run('CREATE TABLE IF NOT EXISTS classes (date TEXT, className TEXT, classTime TEXT, coachName TEXT, waveEnergy TEXT)');
}

// Function to retrieve class data for a specified date from the database
function getClassData(date, callback) {
    // Query the database for classes on the specified date
    db.all('SELECT * FROM classes WHERE date = ?', [date], (err, rows) => {
        if (err) {
            console.error('Error retrieving class data:', err.message); // Log error if query fails
            callback(null); // Pass null to callback to indicate failure
            return;
        }

        // Pass the retrieved rows to the callback if query is successful
        callback(rows);
    });
}

// Function to save a new class record into the database
function saveClassData(date, className, classTime, coachName, waveEnergy) {
    // Execute an INSERT query to add a new class record
    db.run(
        'INSERT INTO classes (date, className, classTime, coachName, waveEnergy) VALUES (?, ?, ?, ?, ?)',
        [date, className, classTime, coachName, waveEnergy],
        function (err) {
            if (err) {
                // Log error message if the insertion fails
                console.error('Error saving class data:', err.message);
            } else {
                // Log success message if insertion is successful
                console.log(`Class data saved successfully for ${date} - ${className}`);
            }
        }
    );
}

module.exports = {
    initializeDatabase,
    getClassData,
    saveClassData
};