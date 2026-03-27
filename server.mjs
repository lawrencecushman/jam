#!/usr/bin/env node
/**
 * Combined y-websocket (room persistence) + y-webrtc signaling server.
 *
 * Routes WebSocket connections by path:
 *   /signaling  → y-webrtc signaling (topic pub/sub for WebRTC peer discovery)
 *   everything else → y-websocket (Yjs CRDT persistence via LevelDB)
 */

import { createServer } from "http";
import { WebSocketServer } from "ws";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

// Use an absolute path to bypass the package exports map check —
// y-websocket/bin/utils.js is not listed in its exports field.
const require = createRequire(import.meta.url);
const utilsPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "node_modules/y-websocket/bin/utils.js",
);
const { setupWSConnection } = require(utilsPath);

const PORT = process.env.PORT || 8080;
const YPERSISTENCE = process.env.YPERSISTENCE;

// LevelDB persistence for y-websocket.
// The Dockerfile CMD deletes any stale LOCK file before starting Node.
let persistence = null;
if (YPERSISTENCE) {
  const { LeveldbPersistence } = require("y-leveldb");
  persistence = new LeveldbPersistence(YPERSISTENCE);
}

// ─── y-webrtc signaling ───────────────────────────────────────────────────────

const PING_TIMEOUT = 30_000;

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const topics = new Map();

const send = (conn, message) => {
  if (conn.readyState !== 0 && conn.readyState !== 1) {
    conn.close();
    return;
  }
  try {
    conn.send(JSON.stringify(message));
  } catch {
    conn.close();
  }
};

const onSignalingConnection = (conn) => {
  const subscribedTopics = new Set();
  let closed = false;
  let pongReceived = true;

  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      conn.close();
      clearInterval(pingInterval);
    } else {
      pongReceived = false;
      try {
        conn.ping();
      } catch {
        conn.close();
      }
    }
  }, PING_TIMEOUT);

  conn.on("pong", () => {
    pongReceived = true;
  });

  conn.on("close", () => {
    subscribedTopics.forEach((topicName) => {
      const subs = topics.get(topicName);
      if (subs) {
        subs.delete(conn);
        if (subs.size === 0) topics.delete(topicName);
      }
    });
    subscribedTopics.clear();
    closed = true;
    clearInterval(pingInterval);
  });

  conn.on("message", (message) => {
    let msg;
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }
    if (!msg || !msg.type || closed) return;

    switch (msg.type) {
      case "subscribe":
        (msg.topics || []).forEach((name) => {
          if (typeof name !== "string") return;
          if (!topics.has(name)) topics.set(name, new Set());
          topics.get(name).add(conn);
          subscribedTopics.add(name);
        });
        break;
      case "unsubscribe":
        (msg.topics || []).forEach((name) => {
          const subs = topics.get(name);
          if (subs) subs.delete(conn);
        });
        break;
      case "publish":
        if (msg.topic) {
          const receivers = topics.get(msg.topic);
          if (receivers) {
            msg.clients = receivers.size;
            receivers.forEach((r) => send(r, msg));
          }
        }
        break;
      case "ping":
        send(conn, { type: "pong" });
        break;
    }
  });
};

// ─── HTTP + WebSocket routing ─────────────────────────────────────────────────

const server = createServer((_, res) => {
  res.writeHead(200);
  res.end("ok");
});

const wsWss = new WebSocketServer({ noServer: true });
wsWss.on("connection", (conn, req) => setupWSConnection(conn, req, { persistence }));

const signalingWss = new WebSocketServer({ noServer: true });
signalingWss.on("connection", onSignalingConnection);

server.on("upgrade", (req, socket, head) => {
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  if (path === "/signaling") {
    signalingWss.handleUpgrade(req, socket, head, (ws) => signalingWss.emit("connection", ws, req));
  } else {
    wsWss.handleUpgrade(req, socket, head, (ws) => wsWss.emit("connection", ws, req));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Combined server on :${PORT}`);
  console.log(`  y-websocket  → wss://<host>/`);
  console.log(`  signaling    → wss://<host>/signaling`);
  if (YPERSISTENCE) console.log(`  LevelDB      → ${YPERSISTENCE}`);
});
