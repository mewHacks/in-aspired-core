export interface CreateCareerDTO {
  id: string;
  name: string;
  description: string;

  industry: string[];

  salary_low: number;
  salary_high: number;

  demand_level: 'High' | 'Medium' | 'Low';

  education_level_required:
  | 'Foundation'
  | 'General Pre-U'
  | 'Diploma'
  | 'Degree'
  | 'Master'
  | 'PhD';

  skills: string[];
  related_domains: string[];
  related_courses: string[];
  riasec_code: string;
  masco_code: string;
  work_environment?: string;
}
