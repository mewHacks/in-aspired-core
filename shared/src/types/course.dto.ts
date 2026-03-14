export interface CreateCourseDTO {
  // -------- Required --------
  id: string;
  title: string;
  institutionId: string;

  level: 'Foundation' | 'Diploma' | 'General Pre-U';

  type: 'Public' | 'Private';

  mqa_code: string;

  duration_year: string;

  cost_level: '< RM 20k' | 'RM 20k - 50k' | '> RM 50k';

  description: string;

  apply_url: string;

  // -------- Optional --------
  campuses?: string[];

  accredited_from?: Date;
  accredited_to?: Date;

  difficulty?: 'Easy' | 'Medium' | 'Hard';

  tags?: string[];
  domainIds?: string[];
  careers?: string[];
}
