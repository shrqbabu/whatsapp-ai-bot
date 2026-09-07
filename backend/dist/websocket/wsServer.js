import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import { config } from '../config/index.js';
import { UserRepository } from '../database/repositories/userRepository.js';
import { SessionRepository } from '../database/repositories/sessionRepository.js';
import { logger } from '../utils/logger.js';
import { wsEmitter } from './wsEmitter.js';
export function setupWebSocketServer(server) {
    const wss = new WebSocketServer({ server, path: '/ws' });
    wss.on('connection', async (ws, req) => {
        try {
            const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
            const token = url.searchParams.get('token');
            if (!token) {
                logger.warn('WebSocket connection attempt without token');
                ws.close(4001, 'Unauthorized: Token required');
                return;
            }
            let decoded;
            try {
                decoded = jwt.verify(token, config.JWT_SECRET);
            }
            catch (err) {
                logger.warn({ err }, 'Invalid WebSocket JWT token');
                ws.close(4001, 'Unauthorized: Invalid token');
                return;
            }
            const user = await UserRepository.findById(decoded.userId);
            if (!user) {
                ws.close(4001, 'Unauthorized: User not found');
                return;
            }
            const userId = user.id;
            wsEmitter.registerSocket(userId, ws);
            logger.info({ userId, email: user.email }, 'Authenticated WebSocket connection established');
            // Send initial status immediately upon connecting so client synchronizes state
            const session = await SessionRepository.getOrCreateByUserId(userId);
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
                wsEmitter.removeSocket(userId, ws);
            });
            ws.on('error', (err) => {
                logger.error({ userId, err }, 'WebSocket connection error');
                clearInterval(interval);
                wsEmitter.removeSocket(userId, ws);
            });
        }
        catch (error) {
            logger.error({ error }, 'Error in WebSocket connection handler');
            ws.close(1011, 'Internal Server Error');
        }
    });
    return wss;
}
//# sourceMappingURL=wsServer.js.map