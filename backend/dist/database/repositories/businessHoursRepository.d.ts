export interface BusinessHourEntity {
    id: string;
    session_id: string;
    user_id: string;
    day_of_week: number;
    enabled: boolean;
    start_time: string;
    end_time: string;
    timezone: string;
    outside_hours_action: 'DO_NOTHING' | 'SEND_CUSTOM_MESSAGE';
    outside_hours_message: string | null;
    created_at: string;
    updated_at: string;
}
export declare class BusinessHoursRepository {
    static listBySessionId(sessionId: string): Promise<BusinessHourEntity[]>;
    static updateSchedule(sessionId: string, userId: string, schedules: Array<{
        day_of_week: number;
        enabled: boolean;
        start_time: string;
        end_time: string;
        timezone?: string;
        outside_hours_action?: 'DO_NOTHING' | 'SEND_CUSTOM_MESSAGE';
        outside_hours_message?: string | null;
    }>): Promise<BusinessHourEntity[]>;
    static checkBusinessHours(sessionId: string, targetDate?: Date): Promise<{
        isInside: boolean;
        isWithin: boolean;
        outsideAction: 'DO_NOTHING' | 'SEND_CUSTOM_MESSAGE';
        outsideMessage: string | null;
    }>;
    private static mapEntity;
}
