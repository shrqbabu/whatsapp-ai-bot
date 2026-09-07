import { WebSocket } from 'ws';
export type RealtimeEventName = 'whatsapp.status' | 'whatsapp.qr' | 'whatsapp.connected' | 'whatsapp.disconnected' | 'whatsapp.reconnecting' | 'whatsapp.logged_out' | 'message.received' | 'message.sent' | 'ai.processing' | 'ai.replied' | 'conversation.updated' | 'takeover.changed' | 'dashboard.updated';
export interface RealtimeMessage<T = unknown> {
    event: RealtimeEventName;
    data: T;
    timestamp: string;
}
declare class WebSocketEmitter {
    private userSockets;
    registerSocket(userId: string, ws: WebSocket): void;
    removeSocket(userId: string, ws: WebSocket): void;
    /**
     * Send event strictly to the authenticated user's connected sockets.
     * Cross-user event leakage is impossible.
     */
    sendToUser<T = unknown>(userId: string, event: RealtimeEventName, data: T): void;
    isUserConnected(userId: string): boolean;
}
export declare const wsEmitter: WebSocketEmitter;
export {};
