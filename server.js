const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" },
    maxHttpBufferSize: 1e7
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let activeNodes = {};
let activeWaypoints = [];
const HEARTBEAT_TIMEOUT = 300000; 

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

app.post('/api/verify-tower', (req, res) => {
    const { pass } = req.body;
    if (pass === "TIMMY2026") {
        return res.json({ success: true, token: "AUTH_VALIDATED_CORE_PROXY" });
    }
    res.status(401).json({ success: false, message: "UNAUTHORIZED" });
});

io.on('connection', (socket) => {
    console.log(`Node Online: ${socket.id}`);
    activeNodes[socket.id] = { id: socket.id, lastSeen: Date.now(), lat: null, lon: null, auditData: null };

    socket.emit('sync-waypoints', activeWaypoints);

    socket.on('telemetry-pulse', (data) => {
        if (activeNodes[socket.id]) {
            activeNodes[socket.id].lat = data.lat;
            activeNodes[socket.id].lon = data.lon;
            activeNodes[socket.id].lastSeen = Date.now();
            io.emit('node-update', activeNodes);
            
            Object.keys(activeNodes).forEach(otherId => {
                if (otherId !== socket.id && activeNodes[otherId].lat) {
                    const dist = calculateDistance(data.lat, data.lon, activeNodes[otherId].lat, activeNodes[otherId].lon);
                    if (dist <= 500) {
                        io.emit('system-alert', { message: `Convergence Link: Node ${socket.id.slice(0,4)} and Node ${otherId.slice(0,4)} inside ${Math.round(dist)}m!` });
                    }
                }
            });
        }
    });

    // P2P VOICE STREAM ROUTER: Pipes binary voice chunks instantly to all other nodes
    socket.on('voice-audio-chunk', (audioData) => {
        socket.broadcast.emit('incoming-voice-audio', { sender: socket.id.slice(0,4), audio: audioData });
    });

    socket.on('bulk-mesh-sync', (historicalPackets) => {
        historicalPackets.forEach(packet => {
            io.emit('radio-broadcast', { sender: `${socket.id.slice(0,4)}-MESH`, text: `[OFFGRID_LOG]: ${packet.text}`, timestamp: packet.time });
        });
    });

    socket.on('transmit-stego-package', (payload) => {
        io.emit('receive-stego-package', { sender: socket.id.slice(0,5), imageData: payload.imageData });
    });

    socket.on('trigger-remote-audit', (targetNodeId) => {
        if (io.sockets.sockets.get(targetNodeId)) {
            io.to(targetNodeId).emit('execute-hardware-audit');
        }
    });

    socket.on('submit-audit-payload', (auditData) => {
        if (activeNodes[socket.id]) {
            activeNodes[socket.id].auditData = auditData;
            io.emit('node-update', activeNodes);
        }
    });

    socket.on('deploy-waypoint', (wpData) => {
        const newWp = { id: Date.now(), ...wpData };
        activeWaypoints.push(newWp);
        io.emit('waypoint-broadcast', newWp);
    });

    socket.on('radio-message', (msg) => {
        io.emit('radio-broadcast', { sender: socket.id.slice(0, 5), text: msg, timestamp: Date.now() });
    });

    socket.on('disconnect', () => {
        delete activeNodes[socket.id];
        io.emit('node-disconnect', socket.id);
    });
});

setInterval(() => {
    const now = Date.now();
    Object.keys(activeNodes).forEach(id => {
        if (now - activeNodes[id].lastSeen > HEARTBEAT_TIMEOUT) {
            io.emit('node-timeout', id);
            delete activeNodes[id];
        }
    });
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`AegisGrid Server running on port ${PORT}`));
