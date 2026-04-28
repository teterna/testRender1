const { WebSocketServer, WebSocket } = require("ws");
const Message = require("../models/Message");
const NumberModel = require("../models/Number");

/**
 * Attaches a WebSocket server to an existing Node.js HTTP server so that
 * both the REST API and WebSocket traffic share the same port (4000).
 *
 * Message protocol (JSON):
 *   Client → Server:
 *     { type: 'join',    username: string }
 *     { type: 'message', content:  string }
 *
 *   Server → Client:
 *     { type: 'system',  content:  string }                         (broadcast, not to sender)
 *     { type: 'message', id, sender, content, timestamp: ISO string } (broadcast to all)
 *
 * @param {import('http').Server} server - The Node.js HTTP server instance
 */
function initWebSocket(server) {
  // `server` option attaches the WS server to the existing HTTP server
  // instead of opening a new port.
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    /**
     * Each WebSocket connection carries a `username` property that is
     * populated when the client sends a 'join' message. Before that,
     * the client is considered anonymous and cannot send chat messages.
     */
    ws.username = null;

    // ----------------------------------------------------------------
    // Handle incoming messages from this client
    // ----------------------------------------------------------------
    ws.on("message", async (rawData) => {
      let parsed;

      // Guard against non-JSON payloads
      try {
        parsed = JSON.parse(rawData.toString());
      } catch {
        return; // silently drop malformed frames
      }

      switch (parsed.type) {
        // ----------------------------------------------------------
        // JOIN — client announces its display name
        // ----------------------------------------------------------
        case "join": {
          ws.username = (parsed.username || "Anonymous").trim().slice(0, 50);

          // Tell everyone else (not the joiner) that a new user arrived
          broadcastExcept(wss, ws, {
            type: "system",
            content: `${ws.username} joined the chat`,
          });
          break;
        }

        // ----------------------------------------------------------
        // MESSAGE — client sends a chat message
        // ----------------------------------------------------------
        case "message": {
          // Reject message if the client hasn't identified itself yet
          if (!ws.username) return;

          const content = (parsed.content || "").trim();
          if (!content) return; // ignore empty messages

          // Persist the message to MongoDB so it survives restarts
          let saved;
          try {
            saved = await Message.create({ sender: ws.username, content });
          } catch (err) {
            console.error("[WS] Failed to save message:", err.message);
            return;
          }

          // Broadcast the persisted message to every connected client
          // (including the sender, so their UI gets the server-confirmed copy
          //  with the real DB id and timestamp)
          broadcastAll(wss, {
            type: "message",
            id: saved._id.toString(),
            sender: saved.sender,
            content: saved.content,
            timestamp: saved.createdAt.toISOString(),
          });
          break;
        }

        case "number": {
          const value = Number(parsed.value);
          if (isNaN(value)) return;

          let saved;
          try {
            saved = await NumberModel.create({ value });
          } catch (err) {
            console.error("[WS] Failed to save number:", err.message);
            return;
          }

          broadcastAll(wss, {
            type: "number",
            value: saved.value,
            id: saved._id.toString(),
            timestamp: saved.createdAt.toISOString(),
          });

          break;
        }

        default:
          // Unknown message types are silently ignored
          break;
      }
    });

    // ----------------------------------------------------------------
    // Handle client disconnect
    // ----------------------------------------------------------------
    ws.on("close", () => {
      if (ws.username) {
        broadcastExcept(wss, ws, {
          type: "system",
          content: `${ws.username} left the chat`,
        });
      }
    });

    ws.on("error", (err) => {
      console.error("[WS] Socket error:", err.message);
    });
  });

  console.log("[WS] WebSocket server initialized");
}

// --------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------

/**
 * Sends a JSON payload to every open client EXCEPT the specified sender.
 * Used for system notifications (join/leave) so the actor doesn't see
 * their own "X joined" message.
 *
 * @param {WebSocketServer} wss
 * @param {WebSocket}       sender  - The client to exclude
 * @param {object}          payload - Plain object to serialize as JSON
 */
function broadcastExcept(wss, sender, payload) {
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

/**
 * Sends a JSON payload to ALL open clients including the sender.
 * Used for chat messages so the sender sees their own message echoed
 * back with the server-confirmed id and timestamp.
 *
 * @param {WebSocketServer} wss
 * @param {object}          payload
 */
function broadcastAll(wss, payload) {
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

module.exports = { initWebSocket };
