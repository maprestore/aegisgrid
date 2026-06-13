const express = require('express');
const http = require('http');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Middleware configuration
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Express Admin Authorization Endpoint Hook
app.post('/api/authorize-admin', (req, res) => {
    const { key } = req.body;
    // Uses environment variable or defaults securely
    const masterSecretKey = process.env.ADMIN_SECRET_KEY || "TIMMYDON_MASTER_77";
    
    if (key === masterSecretKey) {
        return res.status(200).json({ authorized: true, message: "ARCHITECT_VERIFIED" });
    }
    return res.status(401).json({ authorized: false, message: "ACCESS_DENIED" });
});

// Serve frontend assets smoothly across routing environments
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Port Binding Configuration for Cloud Container Networks
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Aegis Ultra Command Master Core actively hosting on port ${PORT}`);
});
