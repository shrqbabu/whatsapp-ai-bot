"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocketServer = setupWebSocketServer;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ws_1 = require("ws");
const index_js_1 = require("../config/index.js");
const userRepository_js_1 = require("../database/repositories/userRepository.js");
const sessionRepository_js_1 = require("../database/repositories/sessionRepository.js");
const logger_js_1 = require("../utils/logger.js");
const wsEmitter_js_1 = require("./wsEmitter.js");
function setupWebSocketServer(server) {
    const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
    wss.on('connection', async (ws, req) => {
        try {
            const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
            const token = url.searchParams.get('token');
            if (!token) {
                logger_js_1.logger.warn('WebSocket connection attempt without token');
                ws.close(4001, 'Unauthorized: Token required');
                return;
            }
            let decoded;
            try {
                decoded = jsonwebtoken_1.default.verify(token, index_js_1.config.JWT_SECRET);
            }
            catch (err) {
                logger_js_1.logger.warn({ err }, 'Invalid WebSocket JWT token');
                ws.close(4001, 'Unauthorized: Invalid token');
                return;
            }
            const user = await userRepository_js_1.UserRepository.findById(decoded.userId);
            if (!user) {
                ws.close(4001, 'Unauthorized: User not found');
                return;
            }
            const userId = user.id;
            wsEmitter_js_1.wsEmitter.registerSocket(userId, ws);
            logger_js_1.logger.info({ userId, email: user.email }, 'Authenticated WebSocket connection established');
            // Send initial status immediately upon connecting so client synchronizes state
            const session = await sessionRepository_js_1.SessionRepository.getOrCreateByUserId(userId);
            ws.send(JSON.stringify({
                event: 'whatsapp.status',
                data: {
                    status: session.status,
                    phoneNumber: session.phone_number,
                },
                timestamp: new Date().toISOString(),
            }));
            // Handle ping/pong heartbeats
            let isAlive = true;
            ws.on('pong', () => {
                isAlive = true;
            });
            const interval = setInterval(() => {
                if (!isAlive) {
                    clearInterval(interval);
                    ws.terminate();
                    return;
                }
                isAlive = false;
                ws.ping();
            }, 30000);
            ws.on('message', (data) => {
                try {
                    const parsed = JSON.parse(data.toString());
                    if (parsed.type === 'ping') {
                        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                    }
                }
                catch {
                    // Ignore invalid client messages
                }
            });
            ws.on('close', () => {
                clearInterval(interval);
                wsEmitter_js_1.wsEmitter.removeSocket(userId, ws);
            });
            ws.on('error', (err) => {
                logger_js_1.logger.error({ userId, err }, 'WebSocket connection error');
                clearInterval(interval);
                wsEmitter_js_1.wsEmitter.removeSocket(userId, ws);
            });
        }
        catch (error) {
            logger_js_1.logger.error({ error }, 'Error in WebSocket connection handler');
            ws.close(1011, 'Internal Server Error');
        }
    });
    return wss;
}
//# sourceMappingURL=wsServer.js.map