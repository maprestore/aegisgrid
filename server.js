const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS enabled for your domain
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Data Store (For persistence across reloads, consider a database like Redis/Supabase)
let globalTacticalNodes = {};

// Admin Authorization Route
app.post('/api/authorize-admin', (req, res) => {
    const { key } = req.body;
    const masterSecretKey = process.env.ADMIN_SECRET_KEY || "TIMMYDON_MASTER_77";
    
    if (key === masterSecretKey) {
        return res.status(200).json({ authorized: true });
    }
    return res.status(401).json({ authorized: false, message: "ACCESS_DENIED" });
});

// Socket.io Real-Time Engine
io.on('connection', (socket) => {
    console.log(`New Node Intercepted: ${socket.id}`);

    // Telemetry Sync
    socket.on('telemetry', (payload) => {
        globalTacticalNodes[socket.id] = payload;
        // Broadcast update to all clients
        io.emit('telemetry', payload);
    });

    // Chat Relay
    socket.on('secure_chat', (payload) => {
        io.emit('secure_chat', payload);
    });

    // Admin Overrides
    socket.on('status_override', (payload) => {
        io.emit('status_override', payload);
    });

    // Mission Objectives
    socket.on('bounty_deploy', (payload) => {
        io.emit('bounty_deploy', payload);
    });

    socket.on('disconnect', () => {
        delete globalTacticalNodes[socket.id];
        console.log(`Node Lost: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Aegis Ultra Command Master Core Active on port ${PORT}`);
});
