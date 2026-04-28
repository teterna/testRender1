/**
 * Entry point for the Simple Chat backend.
 *
 * Architecture:
 *   - Express handles REST API requests (e.g. GET /api/messages for history)
 *   - ws.WebSocketServer is attached to the same HTTP server so both
 *     REST and WebSocket traffic share a single port
 *   - Mongoose connects to MongoDB for message persistence
 */

// Load .env variables into process.env before any other imports
require('dotenv').config();

const http    = require('http');
const express = require('express');
const cors    = require('cors');

const connectDB       = require('./config/db');
const messagesRouter  = require('./routes/messages');
const { initWebSocket } = require('./ws/handler');
const numbersRouter = require('./routes/numbers');

const PORT = process.env.PORT || 4000;

// -----------------------------------------------------------------------
// Database
// -----------------------------------------------------------------------
connectDB(); // async — logs success/failure and exits on fatal error

// -----------------------------------------------------------------------
// Express application
// -----------------------------------------------------------------------
const app = express();

// Parse incoming JSON bodies (required for future POST/PUT endpoints)
app.use(express.json());

// Allow the Next.js dev server (localhost:3000) to call this API.
// In production replace CLIENT_ORIGIN with your real frontend domain.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'OPTIONS'],
  })
);

app.use('/api/numbers', numbersRouter);

// REST routes
app.use('/api/messages', messagesRouter);

// Simple health-check so you can verify the server is up
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// -----------------------------------------------------------------------
// HTTP server — shared by Express and WebSocket
// -----------------------------------------------------------------------
// We create the HTTP server manually (instead of calling app.listen) so we
// can attach the WebSocket server to the same underlying TCP socket.
const server = http.createServer(app);

// Attach ws.WebSocketServer to the HTTP server
initWebSocket(server);

// Start listening
server.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
});
