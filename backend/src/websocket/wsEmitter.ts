import { WebSocket } from 'ws';
import { logger } from '../utils/logger.js';

export type RealtimeEventName =
  | 'whatsapp.status'
  | 'whatsapp.qr'
  | 'whatsapp.connected'
  | 'whatsapp.disconnected'
  | 'whatsapp.reconnecting'
  | 'whatsapp.logged_out'
  | 'message.received'
  | 'message.sent'
  | 'ai.processing'
  | 'ai.replied'
  | 'conversation.updated'
  | 'takeover.changed'
  | 'dashboard.updated';

export interface RealtimeMessage<T = unknown> {
  event: RealtimeEventName;
  data: T;
  timestamp: string;
}

class WebSocketEmitter {
  // Map of userId -> Set of active WebSocket connections
  private userSockets: Map<string, Set<WebSocket>> = new Map();

  registerSocket(userId: string, ws: WebSocket): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(ws);
    logger.debug({ userId, openSockets: this.userSockets.get(userId)!.size }, 'WebSocket registered for user');
  }

  removeSocket(userId: string, ws: WebSocket): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(ws);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
      logger.debug({ userId }, 'WebSocket disconnected and removed');
    }
  }

  /**
   * Send event strictly to the authenticated user's connected sockets.
   * Cross-user event leakage is impossible.
   */
  sendToUser<T = unknown>(userId: string, event: RealtimeEventName, data: T): void {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) {
      return;
    }

    const payload: RealtimeMessage<T> = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    const serialized = JSON.stringify(payload);

    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(serialized);
        } catch (error) {
          logger.warn({ userId, event, error }, 'Failed to send WebSocket payload');
        }
      }
    }
  }

  isUserConnected(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return Boolean(sockets && sockets.size > 0);
  }
}

export const wsEmitter = new WebSocketEmitter();
