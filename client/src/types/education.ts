// RIASEC personality types
export type RiasecType = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

// Levels of education
export type EducationLevel = 'Foundation' | 'Diploma' | 'General Pre-U';

// RIASEC score for a type
export interface RiasecScore {
    type: RiasecType;
    score: number;
}

// Domain of interest, e.g., Computing, Health
export interface InterestDomain {
    id: string; // unique id, e.g., "computing"
    label: string; // display name, e.g., "Computing & Data"
    description: string;
    riasecProfile: {
        primary: RiasecType[];   // primary RIASEC types
        secondary: RiasecType[]; // secondary RIASEC types
    };
    matchExplanation?: string; // optional explanation of match
}

// Institution offering courses
export interface Institution {
    apply_url: string;
    id: string;       // e.g., "sunway"
    name: string;     // e.g., "Sunway University"
    logourl?: string; // optional logo URL
    location?: string;
    campuses?: string[]; // optional list of campuses
    applyUrl?: string; // optional application URL
}

// Course type
export interface Course {
    id: string;
    title: string;
    institutionId: string;   // link to Institution.id
    level: EducationLevel;   // course level
    domainIds: string[];     // links to InterestDomain.id
    careers: string[];       // array of career IDs or names
    institution?: Institution; // optional hydrated institution info
    tags?: string[];        // optional tags for the course
}

// Domain score for user matching
export interface DomainScore {
    domain: InterestDomain;
    score: number;
}
