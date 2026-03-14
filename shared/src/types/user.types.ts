export enum UserRole {
    STUDENT = 'student',
    ADMIN = 'admin'
}

export interface IUser {
    id?: string;
    _id?: string;
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    badges?: string[];
    phone?: string;
    phoneCountryCode?: string;
    gender?: string;
    dateOfBirth?: string;
    preferences?: {
        theme: string;
        language: string;
        notifications: boolean;
        emailNotifications: boolean;
        pushNotifications: boolean;
    };
    createdAt?: string | Date;
    updatedAt?: string | Date;
}
