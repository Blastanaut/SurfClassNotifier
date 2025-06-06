import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./surfClasses.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

// Function to initialize database
export function initializeDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS classes (
                                                   date TEXT,
                                                   className TEXT,
                                                   classTime TEXT,
                                                   classStartTime TEXT,
                                                   classEndTime TEXT,
                                                   coachName TEXT,
                                                   waveEnergy TEXT,
                                                   notified INTEGER DEFAULT 0
            )`, (err) => {
        if (err) {
            console.error("❌ Error initializing database:", err.message);
        } else {
            console.log("✅ Database initialized with `notified` column.");
        }
    });
}

// Function to retrieve class data for a specified date from the database
export function getClassData(date, callback) {
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
export function saveClassData(date, className, classTime, classStartTime, classEndTime, coachName, waveEnergy, notified = 0) {
    db.run(
        'INSERT INTO classes (date, className, classTime, classStartTime, classEndTime, coachName, waveEnergy, notified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [date, className, classTime, classStartTime, classEndTime, coachName, waveEnergy, notified],
        function (err) {
            if (err) {
                console.error('❌ Error saving class data:', err.message);
            } else {
                console.log(`📝 Class data saved for ${date} - ${className}`);
            }
        }
    );
}

export function getUnnotifiedClasses(date, callback) {
    db.all('SELECT * FROM classes WHERE date = ? AND notified = 1', [date], (err, rows) => {
        if (err) {
            console.error('❌ Error retrieving unnotified class data:', err.message);
            callback([]);
            return;
        }
        callback(rows);
    });
}
export function markClassAsNotified(date, className, classTime) {
    db.run(
        'UPDATE classes SET notified = 2 WHERE date = ? AND className = ? AND classTime = ?',
        [date, className, classTime],
        function (err) {
            if (err) {
                console.error('❌ Error marking class as notified:', err.message);
            }
        }
    );
}