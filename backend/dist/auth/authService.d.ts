export interface AuthResult {
    token: string;
    user: {
        id: string;
        email: string;
        fullName: string;
        createdAt: string;
    };
    session: {
        id: string;
        status: string;
        phoneNumber: string | null;
    };
}
export declare class AuthService {
    static register(data: {
        email: string;
        password: string;
        fullName: string;
    }): Promise<AuthResult>;
    static login(data: {
        email: string;
        password: string;
    }): Promise<AuthResult>;
    static getMe(userId: string): Promise<{
        user: {
            id: string;
            email: string;
            fullName: string;
            createdAt: string;
        };
        session: {
            id: string;
            status: import("../database/repositories/sessionRepository.js").WhatsAppStatus;
            phoneNumber: string | null;
            connectedAt: string | null;
            lastSeenAt: string | null;
        };
    }>;
    private static generateToken;
}
