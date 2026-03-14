export interface TodoItem {
    id: string;
    text: string;
    completed: boolean;
    createdAt: number;
    createdBy: string; // User Name
    createdBySocketId: string;
}
