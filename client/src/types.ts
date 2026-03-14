// Shared frontend TypeScript type definitions for courses, careers, rooms, notifications, etc.

export type RiasecType = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

export type EducationLevel = 'Foundation' | 'Diploma' | 'General Pre-U';

export type RoomType = 'public' | 'private';
export type RoomLevel = 'Foundation' | 'Diploma' | 'General Pre-U' | 'All Levels';

export interface RiasecScore {
    type: RiasecType;
    score: number;
}

export interface InterestDomain {
    id: string; // e.g., "computing", "health"
    label: string; // e.g., "Computing & Data"
    description: string;
    riasecProfile: {
        primary: RiasecType[]; // e.g., ["I", "C"]
        secondary: RiasecType[]; // e.g., ["R"]
    };
    affinityScore?: number; // For frontend logic
    matchExplanation?: string; // "Why this match?"
}

export interface Institution {
    id: string; // e.g., "sunway"
    name: string; // e.g., "Sunway University"
    logourl?: string;
    location?: string;
    apply_url: string;
}

export interface Course {
    id: string;
    title: string;
    institutionId: string;
    level: EducationLevel;
    type: 'Public' | 'Private';
    mqa_code?: string;
    campuses: string[];
    accredited_from?: string;
    accredited_to?: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    duration_year: string;
    cost_level: '< RM 20k' | 'RM 20k - 50k' | '> RM 50k';
    tags: string[]; // e.g. "Industry Partner", "Internship"
    description: string;
    domainIds: string[]; // Links to InterestDomain.id
    careers: string[];
    apply_url?: string; // For external application link when collaborating with institutions
    saved_count: number;
    saved_by_current_user: boolean | undefined;
    view_count?: number; // For popularity sorting
    is_featured?: boolean; // For editorial curation
    institution?: Institution; // Hydrated
    createdAt?: string;
    updatedAt?: string;
    isArchived?: boolean;
    matchScore?: number;
    isRecommended?: boolean;
}


export interface Career {
    id: string;
    name: string;
    description: string;
    job_type: 'Full-time' | 'Part-time' | 'Contract' | 'Freelance';
    masco_code?: string; // Malaysian Standard Classification of Occupations
    salary_low?: number; // Monthly (RM)
    salary_high?: number;
    is_in_demand: boolean; // Based on market data
    demand_level?: 'Low' | 'Medium' | 'High';
    education_level_required: EducationLevel; // e.g., Diploma 
    skills: string[];
    industry: string[];
    work_environment?: 'Office' | 'Remote' | 'Hybrid' | 'Field';
    related_courses: string[]; // Course IDs
    related_domains: string[]; // InterestDomain IDs
    riasec_code: string;
    career_path?: string[];
    saved_count: number;
    saved_by_current_user: boolean | undefined;
    view_count?: number;
    createdAt?: string;
    updatedAt?: string;
    isArchived: boolean;
}

export interface Room {
    _id: string;
    name: string;
    description: string;
    type: RoomType;
    joinCode?: string;
    maxParticipants: number;
    memberCount?: number; // Hydrated from backend
    ownerId: {
        _id: string;
        name: string;
        avatar?: string;
    };
    courseId?: string;
    domainIds?: string[];
    level: RoomLevel;
    coverImage?: string;
    isActive: boolean;
    sessionDuration?: number;
    createdAt: string;
    matchScore?: number;
    matchReason?: string;
    isRecommended?: boolean;
}

export interface TodoItem {
    id: string;
    text: string;
    completed: boolean;
    createdAt: number;
    createdBy: string; // User Name
    createdBySocketId: string;
}

// Notification types 
export type NotificationType = 'ROOM_INVITE' | 'WEEKLY_DIGEST' | 'TEST_REMINDER';

export interface Notification {
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
    notifications: Notification[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
}
