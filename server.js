const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with broad access for your local/remote grid
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Server State
let globalTacticalNodes = {};

// Authorization Endpoint
app.post('/api/authorize-admin', (req, res) => {
    const { key } = req.body;
    const masterSecretKey = process.env.ADMIN_SECRET_KEY || "TIMMYDON_MASTER_77";
    if (key === masterSecretKey) {
        return res.status(200).json({ authorized: true, message: "ARCHITECT_VERIFIED" });
    }
    return res.status(401).json({ authorized: false, message: "ACCESS_DENIED" });
});

// Socket Pipelines
io.on('connection', (socket) => {
    console.log(`Node connected to grid: ${socket.id}`);

    socket.on('telemetry-pulse', (data) => {
        globalTacticalNodes[socket.id] = data;
        io.emit('global-matrix-update', globalTacticalNodes);
    });

    socket.on('transmit-secure-packet', (payload) => {
        io.emit('broadcast-secure-packet', {
            sender: socket.id.slice(0, 5),
            message: payload.message,
            stegoData: payload.stegoData || null
        });
    });

    socket.on('disconnect', () => {
        delete globalTacticalNodes[socket.id];
        io.emit('global-matrix-update', globalTacticalNodes);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Aegis Ultra Command Master Core hosting on port ${PORT}`);
});
