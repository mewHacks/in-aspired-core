// Notification types for InAspired platform
// Used by both frontend and backend

export type NotificationType = 'ROOM_INVITE' | 'SAVED_UPDATE' | 'SYSTEM' | 'MARKETING' | 'WEEKLY_DIGEST' | 'TEST_REMINDER';

export interface INotification {
    id?: string;
    _id?: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    data?: Record<string, unknown>;
    read: boolean;
    readAt?: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface NotificationsResponse {
    notifications: INotification[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
}
