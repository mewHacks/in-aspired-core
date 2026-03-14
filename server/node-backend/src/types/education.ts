// education.ts
// Type definitions for the education domain: RIASEC types, courses, institutions, and interest domains

// Holland Code personality type identifiers
export type RiasecType = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

// Supported education levels on the platform
export type EducationLevel = 'Foundation' | 'Diploma' | 'General Pre-U';

// Individual RIASEC score from the personality quiz
export interface RiasecScore {
    type: RiasecType;
    score: number;
}

// A broad field of interest (e.g., "Computing & Data") linked to RIASEC profiles
export interface InterestDomain {
    id: string; // e.g., "computing", "health"
    label: string; // e.g., "Computing & Data"
    description: string;
    riasecProfile: {
        primary: RiasecType[]; // e.g., ["I", "C"]
        secondary: RiasecType[]; // e.g., ["R"]
    };
    matchExplanation?: string;
}

// An educational institution offering courses on the platform
export interface Institution {
    id: string; // e.g., "sunway"
    name: string; // e.g., "Sunway University"
    logourl?: string;
    location?: string;
    campuses?: string[];
    applyUrl?: string;
}

// A specific educational course offered by an institution
export interface Course {
    id: string;
    title: string;
    institutionId: string;
    level: EducationLevel;
    domainIds: string[]; // Links to InterestDomain.id
    careers: string[];
    institution?: Institution; // Hydrated field
    tags: string[];
}

// Calculated match score between a user's RIASEC profile and an interest domain
export interface DomainScore {
    domain: InterestDomain;
    score: number;
}
