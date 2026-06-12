const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" } 
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Memory Matrix Stores
let activeNodes = {};
let activeWaypoints = [];
const HEARTBEAT_TIMEOUT = 300000; // 5 Minutes in milliseconds

// Haversine Formula for Proximity Tracking (Calculates distance between coordinates)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Returns precise distance in meters
}

// Evaluate network-wide proximity convergence
function evaluateNetworkProximity() {
    const keys = Object.keys(activeNodes);
    for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
            const nodeA = activeNodes[keys[i]];
            const nodeB = activeNodes[keys[j]];
            
            if (nodeA.lat && nodeB.lat) {
                const distance = calculateDistance(nodeA.lat, nodeA.lon, nodeB.lat, nodeB.lon);
                if (distance <= 500) { // 500 Meters proximity alert threshold
                    io.emit('system-alert', {
                        type: 'PROXIMITY_ALERT',
                        message: `Convergence: Node ${nodeA.id.slice(0,5)} and Node ${nodeB.id.slice(0,5)} are within ${Math.round(distance)}m!`
                    });
                }
            }
        }
    }
}

// REST Endpoint for Admin Passcode Check
app.post('/api/verify-tower', (req, res) => {
    const { pass } = req.body;
    // Replace "TIMMY2026" with your secure environment variables if needed
    if (pass === "TIMMY2026") {
        return res.json({ success: true, token: "AUTH_VALIDATED_CORE_PROXY" });
    }
    res.status(401).json({ success: false, message: "UNAUTHORIZED_ACCESS_DENIED" });
});

// Real-Time Socket Architecture
io.on('connection', (socket) => {
    console.log(`Node Initialized: ${socket.id}`);
    
    // Assign structural default state record
    activeNodes[socket.id] = { id: socket.id, lastSeen: Date.now(), lat: null, lon: null };

    // Push existing tracking landmarks to newly synced nodes
    socket.emit('sync-waypoints', activeWaypoints);

    // Process Location Pulses
    socket.on('telemetry-pulse', (data) => {
        if (activeNodes[socket.id]) {
            activeNodes[socket.id].lat = data.lat;
            activeNodes[socket.id].lon = data.lon;
            activeNodes[socket.id].lastSeen = Date.now();
            
            io.emit('node-update', activeNodes);
            evaluateNetworkProximity();
        }
    });

    // Handle Admin Waypoint Deployments
    socket.on('deploy-waypoint', (waypointData) => {
        const newWaypoint = { id: Date.now(), ...waypointData };
        activeWaypoints.push(newWaypoint);
        io.emit('waypoint-broadcast', newWaypoint);
    });

    // Handle Encrypted Chat Radio Streams
    socket.on('radio-message', (msg) => {
        io.emit('radio-broadcast', { sender: socket.id.slice(0, 5), text: msg, timestamp: Date.now() });
    });

    // Admin Global Alert Overrides
    socket.on('admin-force-alert', (alertState) => {
        io.emit('network-lockdown-alert', alertState);
    });

    // Wipe Matrix Core Command
    socket.on('purge-matrix-core', () => {
        activeNodes = {};
        activeWaypoints = [];
        io.emit('force-core-wipe');
    });

    // Disconnect & Dead Man's Switch Execution Loops
    socket.on('disconnect', () => {
        delete activeNodes[socket.id];
        io.emit('node-disconnect', socket.id);
    });
});

// Run Dead Man's Switch Watchdog Loop every 30 seconds
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
