const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();

const db = new sqlite3.Database('./DB.db', (err) => {
    if (err) console.error('Database connection error:', err);
    else console.log('Auth Module: Connected to SQLite database');
});

// Update Fingerprint for Student
router.put('/update-fingerprint', (req, res) => {
    const { registrationNo, fingerprintID } = req.body;

    if (!registrationNo || !fingerprintID) {
        return res.status(400).json({ error: "Registration number and fingerprint ID are required." });
    }

    db.run(`UPDATE students SET fingerprintId = ? WHERE regNo = ?`, 
        [fingerprintID, registrationNo], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            res.json({ message: `Fingerprint registered for ${registrationNo}` });
        }
    );
});

// Authenticate and Free the Shelf
router.get('/checkout/:fingerprintId', (req, res) => {
    const { fingerprintId } = req.params;

    db.get(`SELECT fingerprintId FROM students WHERE fingerprintId = ?`, 
        [fingerprintId], (err, studentRow) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!studentRow) return res.status(404).json({ message: "Student not found." });

            db.get(`SELECT shelfNo FROM shelf WHERE fingerprintId = ?`, 
                [fingerprintId], (err, shelfRow) => {
                    if (err) return res.status(500).json({ error: err.message });
                    if (!shelfRow) return res.status(404).json({ message: "No assigned shelf found for this fingerprint." });

                    const shelfNumber = shelfRow.shelfNo;

                    db.run(`UPDATE shelf SET fingerprintId = NULL, status = 'empty' WHERE shelfNo = ?`, 
                        [shelfNumber], (err) => {
                            if (err) return res.status(500).json({ error: err.message });

                            res.json({ 
                                message: "Bag retrieved successfully. Shelf is now empty.", 
                                shelfNumber 
                            });
                        }
                    );
                }
            );
        }
    );
});

// Assign a Shelf to a Student
router.get('/checkin/:fingerprintId', (req, res) => {
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

module.exports = router;