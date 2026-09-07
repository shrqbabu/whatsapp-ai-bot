"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsEmitter = void 0;
const ws_1 = require("ws");
const logger_js_1 = require("../utils/logger.js");
class WebSocketEmitter {
    // Map of userId -> Set of active WebSocket connections
    userSockets = new Map();
    registerSocket(userId, ws) {
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(ws);
        logger_js_1.logger.debug({ userId, openSockets: this.userSockets.get(userId).size }, 'WebSocket registered for user');
    }
    removeSocket(userId, ws) {
        const sockets = this.userSockets.get(userId);
        if (sockets) {
            sockets.delete(ws);
            if (sockets.size === 0) {
                this.userSockets.delete(userId);
            }
            logger_js_1.logger.debug({ userId }, 'WebSocket disconnected and removed');
        }
    }
    /**
     * Send event strictly to the authenticated user's connected sockets.
     * Cross-user event leakage is impossible.
     */
    sendToUser(userId, event, data) {
        const sockets = this.userSockets.get(userId);
        if (!sockets || sockets.size === 0) {
            return;
        }
        const payload = {
            event,
            data,
            timestamp: new Date().toISOString(),
        };
        const serialized = JSON.stringify(payload);
        for (const ws of sockets) {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                try {
                    ws.send(serialized);
                }
                catch (error) {
                    logger_js_1.logger.warn({ userId, event, error }, 'Failed to send WebSocket payload');
                }
            }
        }
    }
    isUserConnected(userId) {
        const sockets = this.userSockets.get(userId);
        return Boolean(sockets && sockets.size > 0);
    }
}
exports.wsEmitter = new WebSocketEmitter();
//# sourceMappingURL=wsEmitter.js.map