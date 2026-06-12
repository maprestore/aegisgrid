const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

let globalTacticalNodes = {};

io.on('connection', (socket) => {
    globalTacticalNodes[socket.id] = {
        id: socket.id,
        lat: null,
        lon: null,
        isGhost: false,
        vitals: { hr: 72, temp: 36.6, status: "NOMINAL" }
    };

    socket.on('telemetry-pulse', (data) => {
        if (globalTacticalNodes[socket.id]) {
            globalTacticalNodes[socket.id].lat = data.lat;
            globalTacticalNodes[socket.id].lon = data.lon;
            io.emit('global-matrix-update', globalTacticalNodes);
        }
    });

    socket.on('inject-synthetic-cluster', (clusterData) => {
        Object.assign(globalTacticalNodes, clusterData);
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
        Object.keys(globalTacticalNodes).forEach(id => {
            if (id.startsWith(`GHOST-${socket.id}`)) delete globalTacticalNodes[id];
        });
        io.emit('global-matrix-update', globalTacticalNodes);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Aegis Strategic Node online on port ${PORT}`));
