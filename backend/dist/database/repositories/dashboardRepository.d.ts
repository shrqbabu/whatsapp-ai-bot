export interface DashboardMetrics {
    whatsappStatus: string;
    aiEnabled: boolean;
    todayMessages: number;
    todayAiReplies: number;
    activeConversations: number;
    pendingTakeover: number;
    phoneNumber: string | null;
}
export declare class DashboardRepository {
    static getMetrics(userId: string): Promise<DashboardMetrics>;
    static getStats(userId: string): Promise<DashboardMetrics>;
}
