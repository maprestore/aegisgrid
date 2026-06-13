const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let globalTacticalNodes = {};

app.post('/api/authorize-admin', (req, res) => {
    const { key } = req.body;
    const masterSecretKey = process.env.ADMIN_SECRET_KEY || "TIMMYDON_MASTER_77";
    if (key === masterSecretKey) return res.status(200).json({ authorized: true });
    return res.status(401).json({ authorized: false });
});

io.on('connection', (socket) => {
    console.log(`Node Initialized: ${socket.id}`);
    
    socket.on('telemetry-pulse', (data) => {
        globalTacticalNodes[socket.id] = data;
        io.emit('global-matrix-update', globalTacticalNodes);
    });

    socket.on('transmit-secure-packet', (payload) => {
        io.emit('broadcast-secure-packet', {
            sender: socket.id.slice(0, 5),
            message: payload.message
        });
    });

    socket.on('disconnect', () => {
        delete globalTacticalNodes[socket.id];
        io.emit('global-matrix-update', globalTacticalNodes);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Aegis Core Active on ${PORT}`));
