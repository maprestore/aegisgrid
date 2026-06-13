require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MASTER_HASH = process.env.ADMIN_KEY || "TIMMY2026";

app.post('/api/authorize-admin', (req, res) => {
    const { key } = req.body;
    
    if (key === MASTER_HASH) {
        res.status(200).json({ authorized: true, msg: "ACCESS_GRANTED_ARCHITECT" });
    } else {
        res.status(401).json({ authorized: false, msg: "SECURITY_BREACH_DETECTED" });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(`AEGISGRID // ULTRA CORE LEVEL 3 TERMINAL RUNNING ON PORT ${PORT}`);
    console.log(`ALL INTEGRATED CHANNELS ENGAGED: SAFE GEOFENCING & RADIOS LIVE`);
    console.log(`=============================================================\n`);
});
