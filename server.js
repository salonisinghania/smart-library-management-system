const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, 'frontend')));

// Session management
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 600000 }
}));

// Database connection
const db = new sqlite3.Database('./DB.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');

        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS shelf (
                shelfNo INTEGER PRIMARY KEY,
                status TEXT CHECK(status IN ('empty', 'occupied')),
                fingerprintId INTEGER
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS students (
                regNo INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                fingerprintId INTEGER UNIQUE NOT NULL
            )`);
        });
    }
});

// Check-in endpoint
app.get('/checkin/:fingerprintId', (req, res) => {
    const { fingerprintId } = req.params;

    db.get(`SELECT fingerprintId FROM students WHERE fingerprintId = ?`, 
        [fingerprintId], (err, studentRow) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!studentRow) return res.status(404).json({ message: "Student not found." });

            db.get(`SELECT shelfNo FROM shelf WHERE status = 'empty' LIMIT 1`, 
                [], (err, shelfRow) => {
                    if (err) return res.status(500).json({ error: err.message });
                    if (!shelfRow) return res.status(404).json({ message: "No empty shelf available." });

                    const shelfNumber = shelfRow.shelfNo;

                    db.run(`UPDATE shelf SET fingerprintId = ?, status = 'occupied' WHERE shelfNo = ?`, 
                        [fingerprintId, shelfNumber], function(err) {
                            if (err) return res.status(500).json({ error: err.message });

                            res.json({ message: "Shelf assigned successfully.", shelfNumber });
                        }
                    );
                }
            );
        }
    );
});

// Check-out endpoint
app.get('/checkout/:fingerprintId', (req, res) => {
    const { fingerprintId } = req.params;

    db.get(`SELECT shelfNo FROM shelf WHERE fingerprintId = ?`, 
        [fingerprintId], (err, shelfRow) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!shelfRow) return res.status(404).json({ message: "No assigned shelf found for this fingerprint." });

            const shelfNumber = shelfRow.shelfNo;

            db.run(`UPDATE shelf SET fingerprintId = NULL, status = 'empty' WHERE shelfNo = ?`, 
                [shelfNumber], (err) => {
                    if (err) return res.status(500).json({ error: err.message });

                    res.json({ message: "Bag retrieved successfully. Shelf is now empty.", shelfNumber });
                }
            );
        }
    );
});

// Serve frontend HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
