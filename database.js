const sqlite3 = require('sqlite3').verbose();          // SQLite3 for database management

const db = new sqlite3.Database('./surfClasses.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

// Function to initialize database
function initializeDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS classes (
                                                   date TEXT,
                                                   className TEXT,
                                                   classTime TEXT,
                                                   classStartTime TEXT,
                                                   classEndTime TEXT,
                                                   coachName TEXT,
                                                   signedUpUsers TEXT,
                                                   waveEnergy TEXT,
                                                   notified INTEGER DEFAULT 0
            )`, (err) => {
        if (err) {
            console.error("❌ Error initializing database:", err.message);
        } else {
            console.log("✅ Database initialized with `notified` column.");
        }
    });

    // Ensure the signedUpUsers column exists for backwards compatibility
    db.all('PRAGMA table_info(classes);', (err, rows) => {
        if (err) {
            console.error('❌ Error checking table info:', err.message);
            return;
        }
        const hasColumn = rows.some(r => r.name === 'signedUpUsers');
        if (!hasColumn) {
            db.run('ALTER TABLE classes ADD COLUMN signedUpUsers TEXT;', (alterErr) => {
                if (alterErr) {
                    console.error('❌ Error adding signedUpUsers column:', alterErr.message);
                } else {
                    console.log('✅ signedUpUsers column added to database.');
                }
            });
        }
    });
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
function saveClassData(date, className, classTime, classStartTime, classEndTime, coachName, signedUpUsers, waveEnergy, notified = 0) {
    db.run(
        'INSERT INTO classes (date, className, classTime, classStartTime, classEndTime, coachName, signedUpUsers, waveEnergy, notified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [date, className, classTime, classStartTime, classEndTime, coachName, signedUpUsers, waveEnergy, notified],
        function (err) {
            if (err) {
                console.error('❌ Error saving class data:', err.message);
            } else {
                console.log(`📝 Class data saved for ${date} - ${className}`);
            }
        }
    );
}

function getUnnotifiedClasses(date, callback) {
    db.all('SELECT * FROM classes WHERE date = ? AND notified = 1', [date], (err, rows) => {
        if (err) {
            console.error('❌ Error retrieving unnotified class data:', err.message);
            callback([]);
            return;
        }
        callback(rows);
    });
}
function markClassAsNotified(date, className, classTime) {
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

module.exports = {
    initializeDatabase,
    getClassData,
    saveClassData,
    getUnnotifiedClasses,
    markClassAsNotified
};