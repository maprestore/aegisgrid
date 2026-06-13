const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware for secure radio transmission encryption
const ENCRYPTION_KEY = process.env.SECRET_KEY || 'aegisgrid_master_key_32_bytes!!'; 
const IV_LENGTH = 16; 

function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

io.on('connection', (socket) => {
    // Autonomous Swarm Logic: Server pushes threat state independently
    socket.on('sync-request', (data) => {
        if (data.command === 'FORCE_ALIGN_GHOST_NODES') {
            console.log("ALIGNING SWARM...");
            io.emit('matrix-correction', { status: 'ALIGN_COMPLETE', timestamp: Date.now() });
        }
    });

    // Encrypted Broadcast Pipeline
    socket.on('secure-broadcast', (payload) => {
        const securePayload = encrypt(payload.message);
        io.emit('encrypted-broadcast', { data: securePayload, origin: 'CORE_SYSTEM' });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log("AEGIS // GLOBAL MASTER CORE ONLINE"));
