const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const crypto = require('crypto'); // Integrated for enhanced security
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- SECURITY CONSTANTS ---
const ENCRYPTION_KEY = process.env.SECRET_KEY || 'aegisgrid_master_key_32_bytes_!!'; // Ensure 32 chars
const IV_LENGTH = 16;

// --- ENCRYPTION UTILITY ---
function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// --- CORE STATE ---
let globalTacticalNodes = {};

// Admin Auth Hook
app.post('/api/authorize-admin', (req, res) => {
    const { key } = req.body;
    const masterSecretKey = process.env.ADMIN_SECRET_KEY || "TIMMYDON_MASTER_77";
    if (key === masterSecretKey) {
        return res.status(200).json({ authorized: true });
    }
    return res.status(401).json({ authorized: false });
});

// --- SOCKET PIPELINE ---
io.on('connection', (socket) => {
    globalTacticalNodes[socket.id] = { id: socket.id, lat: null, lon: null };

    // Autonomous Swarm Alignment Request
    socket.on('sync-request', (data) => {
        if (data.command === 'FORCE_ALIGN_GHOST_NODES') {
            io.emit('matrix-correction', { status: 'ALIGN_COMPLETE', ts: Date.now() });
        }
    });

    // Encrypted Radio Transmission
    socket.on('secure-broadcast', (payload) => {
        const securePayload = encrypt(payload.message);
        io.emit('encrypted-broadcast', { data: securePayload, origin: 'CORE_SYSTEM' });
    });

    socket.on('telemetry-pulse', (data) => {
        globalTacticalNodes[socket.id] = { ...globalTacticalNodes[socket.id], ...data };
        io.emit('global-matrix-update', globalTacticalNodes);
    });

    socket.on('disconnect', () => {
        delete globalTacticalNodes[socket.id];
        io.emit('global-matrix-update', globalTacticalNodes);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Aegis Ultra Core v3.5.0 Online on ${PORT}`));
