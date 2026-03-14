// Single source of truth for career-related types

// Education levels for careers
export enum EducationLevel {
  Diploma = "Diploma",
  GeneralPreU = "General Pre-U",
  Degree = "Degree",
  Master = "Master",
  PhD = "PhD",
}

// Demand levels for careers
export enum DemandLevel {
  High = "High",
  Medium = "Medium",
  Low = "Low",
}

// Job types (if needed)
export enum CareerJobType {
  FullTime = "Full-time",
  PartTime = "Part-time",
  Contract = "Contract",
  Freelance = "Freelance",
}

// Career interface matching backend model
export interface Career {
  id: string;                      // backend MongoDB _id
  name: string;                     // career name
  industry: string[];               // career industries
  description: string;              // career description
  skills: string[];                 // key skills
  salary_low?: number;              // optional
  salary_high?: number;             // optional
  demand_level?: DemandLevel;       // High/Medium/Low
  riasec_code: string;              // RIASEC personality
  related_courses: string[];        // array of course IDs
  saved_count?: number;             // optional, for SaveCareerButton
  educationLevels?: EducationLevel[]; // optional, can keep for compatibility
  interestDomains?: string[];         // optional, can keep for compatibility
}

export interface SavedCareer {
  id: string;
  name: string;
  industry: string[];
  saved_at: string; // from UserSavedCareer
}
