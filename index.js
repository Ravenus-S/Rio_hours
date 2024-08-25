    const express = require('express');
    const bodyParser = require('body-parser');
    const nodemailer = require('nodemailer');
    const sqlite3 = require('sqlite3').verbose();
    const cron = require('node-cron');
    const path = require('path');

    const app = express();
    const port = 3000;

    // Middleware
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Serve static files
    app.use(express.static(path.join(__dirname, 'public')));

    // Database setup
    const db = new sqlite3.Database('./database.db'); // Use file-based SQLite database
    db.serialize(() => {
        db.run("CREATE TABLE IF NOT EXISTS hours (worker TEXT, role TEXT, hours INTEGER, date TEXT)");
        db.run("CREATE TABLE IF NOT EXISTS food_sales (date TEXT, sales INTEGER)");
    });

    // Endpoint to submit hours and food sales
    app.post('/submit-hours', (req, res) => {
        const { date, foodSales, barbecue, kitchen } = req.body;

        const insertOrUpdateHours = (worker, role, hours, date) => {
            db.get("SELECT * FROM hours WHERE worker = ? AND role = ? AND date = ?", [worker, role, date], (err, row) => {
                if (err) {
                    console.error('Error checking existing hours:', err.message);
                    return;
                }
                if (row) {
                    db.run("UPDATE hours SET hours = ? WHERE worker = ? AND role = ? AND date = ?", [hours, worker, role, date], function(err) {
                        if (err) {
                            console.error('Error updating hours:', err.message);
                        } else {
                            console.log(`Updated hours for ${worker} in ${role} on ${date}.`);
                        }
                    });
                } else {
                    db.run("INSERT INTO hours (worker, role, hours, date) VALUES (?, ?, ?, ?)", [worker, role, hours, date], function(err) {
                        if (err) {
                            console.error('Error inserting hours:', err.message);
                        } else {
                            console.log(`Inserted hours for ${worker} in ${role} on ${date}.`);
                        }
                    });
                }
            });
        };

        const insertOrUpdateSales = (date, sales) => {
            db.get("SELECT * FROM food_sales WHERE date = ?", [date], (err, row) => {
                if (err) {
                    console.error('Error checking existing sales:', err.message);
                    return;
                }
                if (row) {
                    db.run("UPDATE food_sales SET sales = ? WHERE date = ?", [sales, date], function(err) {
                        if (err) {
                            console.error('Error updating sales:', err.message);
                        } else {
                            console.log(`Updated sales for ${date}.`);
                        }
                    });
                } else {
                    db.run("INSERT INTO food_sales (date, sales) VALUES (?, ?)", [date, sales], function(err) {
                        if (err) {
                            console.error('Error inserting sales:', err.message);
                        } else {
                            console.log(`Inserted sales for ${date}.`);
                        }
                    });
                }
            });
        };

        for (const [worker, hours] of Object.entries(barbecue)) {
            insertOrUpdateHours(worker, 'barbecue', hours, date);
        }
        for (const [worker, hours] of Object.entries(kitchen)) {
            insertOrUpdateHours(worker, 'kitchen', hours, date);
        }

        insertOrUpdateSales(date, foodSales);

        printWeeklyReport(date);

        res.send('Hours and food sales submitted successfully');
    });

    // Endpoint to get weekly hours and food sales
    app.get('/weekly-hours', (req, res) => {
        const startOfWeek = req.query.startOfWeek;

        console.log(`Fetching weekly hours starting from: ${startOfWeek}`); // Debugging line

        db.serialize(() => {
            db.all("SELECT worker, role, SUM(hours) AS totalHours FROM hours WHERE date BETWEEN ? AND date(?, '+6 days') GROUP BY worker, role", [startOfWeek, startOfWeek], (err, hoursRows) => {
                if (err) {
                    console.error('Error fetching hours:', err.message);
                    res.status(500).send(err.message);
                } else {
                    console.log('Fetched hours:', hoursRows); // Debugging line
                    db.get("SELECT SUM(sales) AS totalSales FROM food_sales WHERE date BETWEEN ? AND date(?, '+6 days')", [startOfWeek, startOfWeek], (err, salesRow) => {
                        if (err) {
                            console.error('Error fetching food sales:', err.message);
                            res.status(500).send(err.message);
                        } else {
                            const totalSales = salesRow ? salesRow.totalSales : 0;
                            console.log('Fetched totalSales:', totalSales); // Debugging line
                            const response = { hours: hoursRows, totalSales };
                            res.json(response);
                        }
                    });
                }
            });
        });
    });

    // Function to print weekly report to console
    function printWeeklyReport(submissionDate) {
        const startOfWeek = getStartOfWeek(submissionDate);

        db.serialize(() => {
            db.all("SELECT worker, role, SUM(hours) AS totalHours FROM hours WHERE date BETWEEN ? AND date(?, '+6 days') GROUP BY worker, role", [startOfWeek, startOfWeek], (err, hoursRows) => {
                if (err) {
                    console.error('Error fetching hours:', err.message);
                } else {
                    db.get("SELECT SUM(sales) AS totalSales FROM food_sales WHERE date BETWEEN ? AND date(?, '+6 days')", [startOfWeek, startOfWeek], (err, salesRow) => {
                        if (err) {
                            console.error('Error fetching food sales:', err.message);
                        } else {
                            const totalFoodSales = salesRow.totalSales || 0;
                            console.log('Weekly Report:');
                            hoursRows.forEach(row => {
                                let earnings = 0;
                                if (row.role === 'barbecue') {
                                    earnings = totalFoodSales * 0.045 * (row.totalHours / 7);
                                } else if (row.role === 'kitchen') {
                                    earnings = totalFoodSales * 0.035 * (row.totalHours / 7);
                                }
                                console.log(`${row.worker} (Role: ${row.role}) - Total Hours: ${row.totalHours}, Earnings: $${earnings.toFixed(2)}`);
                            });
                        }
                    });
                }
            });
        });
    }

    function getStartOfWeek(date) {
        const currentDate = new Date(date);
        const day = currentDate.getDay();
        const diff = (day < 2 ? 6 : day - 2);
        currentDate.setDate(currentDate.getDate() - diff);
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dayOfMonth = String(currentDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${dayOfMonth}`;
    }

    // Function to calculate tips and generate report
    function generateReport() {
        return new Promise((resolve, reject) => {
            const report = [];
            db.serialize(() => {
                db.all("SELECT worker, role, SUM(hours) AS totalHours FROM hours WHERE date BETWEEN date('now', '-6 days') AND date('now') GROUP BY worker, role", (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        db.get("SELECT SUM(sales) AS totalSales FROM food_sales WHERE date BETWEEN date('now', '-6 days') AND date('now')", (err, salesRow) => {
                            if (err) {
                                reject(err);
                            } else {
                                const totalFoodSales = salesRow.totalSales || 0; // Example values, replace with actual data
                                const totalBarSales = 5000;
                                const totalSales = totalFoodSales + totalBarSales;

                                for (const row of rows) {
                                    let tip = 0;
                                    if (row.role === 'barbecue') {
                                        tip = (totalFoodSales * 0.045) * (row.totalHours / 7);
                                    } else if (row.role === 'kitchen') {
                                        tip = (totalFoodSales * 0.035) * (row.totalHours / 7);
                                    }
                                    report.push(`${row.worker} (Role: ${row.role}) - Total Hours: ${row.totalHours}, Tip: $${tip.toFixed(2)}`);
                                }
                                resolve(report);
                            }
                        });
                    }
                });
            });
        });
    }

    // Email setup
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'your-email@gmail.com',
            pass: 'your-email-password'
        }
    });

    // Schedule to send report every Monday
    cron.schedule('0 0 * * 1', async () => {
        const report = await generateReport();
        const mailOptions = {
            from: 'your-email@gmail.com',
            to: 'your-email@gmail.com',
            subject: 'Weekly Tip Report',
            text: report.join('\n')
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });
    });

    // Start server
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}/`);
    });
