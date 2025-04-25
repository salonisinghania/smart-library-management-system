const sqlite3 = require('sqlite3').verbose();


const db = new sqlite3.Database('./DB.db', (err) => {
    if (err) {
        console.error('Error connecting to SQLite DB:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

module.exports = db;



