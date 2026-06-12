require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.post('/api/threats/inject', async (req, res) => {
    const { sector, severity } = req.body;
    const incidentId = `INCIDENT-${Math.floor(100 + Math.random() * 900)}`;
    const timestamp = new Date().toLocaleTimeString();
    try {
        await pool.query("INSERT INTO incidents (id, sector, severity, timestamp) VALUES ($1, $2, $3, $4)", [incidentId, sector, severity, timestamp]);
        res.status(201).json({ status: "SUCCESS", injectedNode: { id: incidentId, sector } });
    } catch (err) {
        res.status(500).json({ error: "Failed" });
    }
});

app.get('/api/fleet/all', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM incidents ORDER BY timestamp DESC LIMIT 50");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Failed" });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Unified single-page system running on port ${PORT}`);
});
