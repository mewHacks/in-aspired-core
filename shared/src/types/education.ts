export type RiasecType = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

export type EducationLevel = 'Foundation' | 'Diploma' | 'General Pre-U';

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
}

export interface Institution {
    id: string; // e.g., "sunway"
    name: string; // e.g., "Sunway University"
    logourl?: string;
    location?: string;
    campuses?: string[];
    applyUrl?: string;
}

export interface Course {
    id: string;
    title: string;
    institutionId: string;
    level: EducationLevel;
    domainIds: string[]; // Links to InterestDomain.id
    careers: string[];
}
