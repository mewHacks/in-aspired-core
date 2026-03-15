import { Course } from '../types/education';

export const courses: Course[] = [
    // Computing and Data
    {
        id: 'cs-foundation',
        title: 'Foundation in Computing',
        institutionId: 'monash',
        level: 'Foundation',
        domainIds: ['computing'],
        careers: ['Software Developer', 'Data Analyst', 'IT Professional'],
        tags: ['computing', 'programming', 'data']
    },
    {
        id: 'cs-diploma',
        title: 'Diploma in Computer Science',
        institutionId: 'apu',
        level: 'Diploma',
        domainIds: ['computing'],
        careers: ['Programmer', 'Web Developer', 'Systems Analyst'],
        tags: ['computing', 'programming', 'technology']
    },
    {
        id: 'cs-degree',
        title: 'BSc (Hons) Computer Science',
        institutionId: 'nottingham',
        level: 'Diploma',
        domainIds: ['computing'],
        careers: ['Software Engineer', 'AI Specialist', 'Cybersecurity Analyst'],
        tags: ['computing', 'programming', 'ai']
    },
    {
        id: 'data-science',
        title: 'Foundation in Data Science',
        institutionId: 'mmu',
        level: 'Foundation',
        domainIds: ['computing', 'business'],
        careers: ['Data Scientist', 'Data Analyst', 'Business Analyst'],
        tags: ['data', 'analytics', 'computing']
    },
    {
        id: 'it-management',
        title: 'BSc Information Technology',
        institutionId: 'ucsi',
        level: 'Diploma',
        domainIds: ['computing', 'admin'],
        careers: ['IT Manager', 'Systems Administrator', 'IT Consultant'],
        tags: ['it', 'technology', 'management']
    },

    // Engineering
    {
        id: 'eng-foundation',
        title: 'Foundation in Engineering',
        institutionId: 'monash',
        level: 'Foundation',
        domainIds: ['engineering'],
        careers: ['Engineer', 'Technical Manager', 'Project Engineer'],
        tags: ['engineering', 'technology', 'construction']
    },
    {
        id: 'mechanical-eng',
        title: 'BEng Mechanical Engineering',
        institutionId: 'nottingham',
        level: 'Diploma',
        domainIds: ['engineering'],
        careers: ['Mechanical Engineer', 'Design Engineer', 'Manufacturing Engineer'],
        tags: ['engineering', 'mechanical', 'manufacturing']
    },
    {
        id: 'electrical-eng',
        title: 'BEng Electrical & Electronic Engineering',
        institutionId: 'apu',
        level: 'Diploma',
        domainIds: ['engineering'],
        careers: ['Electrical Engineer', 'Electronics Engineer', 'Power Engineer'],
        tags: ['engineering', 'electrical', 'electronics']
    },
    {
        id: 'civil-eng',
        title: 'BEng Civil Engineering',
        institutionId: 'tarumt',
        level: 'Diploma',
        domainIds: ['engineering', 'trades'],
        careers: ['Civil Engineer', 'Structural Engineer', 'Construction Manager'],
        tags: ['engineering', 'civil', 'construction']
    },

    // Health and Life Sciences
    {
        id: 'nursing',
        title: 'Diploma in Nursing',
        institutionId: 'sunway',
        level: 'Diploma',
        domainIds: ['health'],
        careers: ['Nurse', 'Healthcare Administrator', 'Medical Officer'],
        tags: ['healthcare', 'nursing', 'medicine']
    },
    {
        id: 'pharmacy',
        title: 'BPharm Pharmacy',
        institutionId: 'monash',
        level: 'Diploma',
        domainIds: ['health'],
        careers: ['Pharmacist', 'Pharmaceutical Scientist', 'Clinical Pharmacist'],
        tags: ['pharmacy', 'healthcare', 'medicine']
    },
    {
        id: 'biomedical',
        title: 'BSc Biomedical Science',
        institutionId: 'ucsi',
        level: 'Diploma',
        domainIds: ['health'],
        careers: ['Biomedical Scientist', 'Medical Researcher', 'Lab Technician'],
        tags: ['biomedical', 'science', 'research']
    },
    {
        id: 'medical',
        title: 'MBBS Medicine',
        institutionId: 'nottingham',
        level: 'Diploma',
        domainIds: ['health'],
        careers: ['Doctor', 'Medical Specialist', 'Surgeon'],
        tags: ['medicine', 'doctor', 'healthcare']
    },

    // Business, Finance and Economics
    {
        id: 'business-foundation',
        title: 'Foundation in Business',
        institutionId: 'taylors',
        level: 'Foundation',
        domainIds: ['business'],
        careers: ['Business Analyst', 'Manager', 'Entrepreneur'],
        tags: ['business', 'management', 'commerce']
    },
    {
        id: 'accounting',
        title: 'BAcc Accounting & Finance',
        institutionId: 'taylors',
        level: 'Diploma',
        domainIds: ['business'],
        careers: ['Accountant', 'Financial Analyst', 'Auditor'],
        tags: ['accounting', 'finance', 'business']
    },
    {
        id: 'finance',
        title: 'BSc Finance',
        institutionId: 'nottingham',
        level: 'Diploma',
        domainIds: ['business'],
        careers: ['Financial Analyst', 'Investment Banker', 'Portfolio Manager'],
        tags: ['finance', 'banking', 'investment']
    },
    {
        id: 'economics',
        title: 'BSc Economics',
        institutionId: 'help',
        level: 'Diploma',
        domainIds: ['business'],
        careers: ['Economist', 'Policy Analyst', 'Market Researcher'],
        tags: ['economics', 'analysis', 'policy']
    },
    {
        id: 'business-admin',
        title: 'BBA Business Administration',
        institutionId: 'ucsi',
        level: 'Diploma',
        domainIds: ['business', 'admin'],
        careers: ['Business Manager', 'Operations Manager', 'CEO'],
        tags: ['business', 'management', 'administration']
    },

    // Marketing, Sales and Entrepreneurship
    {
        id: 'marketing',
        title: 'BSc Marketing',
        institutionId: 'sunway',
        level: 'Diploma',
        domainIds: ['marketing'],
        careers: ['Marketing Manager', 'Digital Marketer', 'Brand Manager'],
        tags: ['marketing', 'digital', 'branding']
    },
    {
        id: 'entrepreneurship',
        title: 'BSc Entrepreneurship',
        institutionId: 'taylors',
        level: 'Diploma',
        domainIds: ['marketing', 'business'],
        careers: ['Entrepreneur', 'Business Owner', 'Startup Founder'],
        tags: ['entrepreneurship', 'business', 'startup']
    },
    {
        id: 'sales',
        title: 'Diploma in Sales & Marketing',
        institutionId: 'inti',
        level: 'Diploma',
        domainIds: ['marketing', 'business'],
        careers: ['Sales Manager', 'Account Executive', 'Business Development Manager'],
        tags: ['sales', 'marketing', 'business']
    },

    // Creative Arts and Design
    {
        id: 'design-foundation',
        title: 'Foundation in Design',
        institutionId: 'taylors',
        level: 'Foundation',
        domainIds: ['arts'],
        careers: ['Graphic Designer', 'UI/UX Designer', 'Creative Director'],
        tags: ['design', 'art', 'creative']
    },
    {
        id: 'graphic-design',
        title: 'BA Graphic Design',
        institutionId: 'sunway',
        level: 'Diploma',
        domainIds: ['arts'],
        careers: ['Graphic Designer', 'Visual Designer', 'Art Director'],
        tags: ['design', 'graphics', 'art']
    },
    {
        id: 'fashion',
        title: 'BA Fashion Design',
        institutionId: 'taylors',
        level: 'Diploma',
        domainIds: ['arts'],
        careers: ['Fashion Designer', 'Fashion Buyer', 'Stylist'],
        tags: ['fashion', 'design', 'art']
    },
    {
        id: 'interior',
        title: 'BA Interior Design',
        institutionId: 'mmu',
        level: 'Diploma',
        domainIds: ['arts'],
        careers: ['Interior Designer', 'Space Planner', 'Set Designer'],
        tags: ['interior', 'design', 'architecture']
    },

    // Media, Communication and Performing Arts
    {
        id: 'communication',
        title: 'Foundation in Communication',
        institutionId: 'taylors',
        level: 'Foundation',
        domainIds: ['media'],
        careers: ['Communication Specialist', 'PR Professional', 'Content Creator'],
        tags: ['communication', 'media', 'pr']
    },
    {
        id: 'journalism',
        title: 'BA Journalism',
        institutionId: 'nottingham',
        level: 'Diploma',
        domainIds: ['media'],
        careers: ['Journalist', 'News Anchor', 'Content Writer'],
        tags: ['journalism', 'media', 'news']
    },
    {
        id: 'broadcasting',
        title: 'BA Broadcasting',
        institutionId: 'mmu',
        level: 'Diploma',
        domainIds: ['media'],
        careers: ['Broadcast Journalist', 'TV Producer', 'Radio Host'],
        tags: ['broadcasting', 'media', 'tv']
    },
    {
        id: 'performing-arts',
        title: 'BA Performing Arts',
        institutionId: 'ucsi',
        level: 'Diploma',
        domainIds: ['media', 'arts'],
        careers: ['Actor', 'Performer', 'Drama Teacher'],
        tags: ['performing', 'arts', 'theatre']
    },

    // Law, Public Policy and Governance
    {
        id: 'law',
        title: 'LLB Law',
        institutionId: 'nottingham',
        level: 'Diploma',
        domainIds: ['law'],
        careers: ['Lawyer', 'Legal Consultant', 'Judge'],
        tags: ['law', 'legal', 'justice']
    },
    {
        id: 'business-law',
        title: 'LLB Business Law',
        institutionId: 'taylors',
        level: 'Diploma',
        domainIds: ['law', 'business'],
        careers: ['Corporate Lawyer', 'Legal Advisor', 'Compliance Officer'],
        tags: ['law', 'business', 'legal']
    },
    {
        id: 'international-relations',
        title: 'BA International Relations',
        institutionId: 'help',
        level: 'Diploma',
        domainIds: ['law', 'social_sciences'],
        careers: ['Diplomat', 'Policy Analyst', 'International Affairs Specialist'],
        tags: ['international', 'policy', 'diplomacy']
    },

    // Hospitality, Tourism and Events
    {
        id: 'hospitality',
        title: 'Diploma in Hospitality Management',
        institutionId: 'sunway',
        level: 'Diploma',
        domainIds: ['hospitality'],
        careers: ['Hotel Manager', 'Event Planner', 'Tourism Manager'],
        tags: ['hospitality', 'hotel', 'tourism']
    },
    {
        id: 'tourism',
        title: 'BA Tourism Management',
        institutionId: 'inti',
        level: 'Diploma',
        domainIds: ['hospitality'],
        careers: ['Tourism Manager', 'Travel Consultant', 'Event Coordinator'],
        tags: ['tourism', 'travel', 'hospitality']
    },
    {
        id: 'culinary',
        title: 'Diploma in Culinary Arts',
        institutionId: 'sunway',
        level: 'Diploma',
        domainIds: ['hospitality', 'arts'],
        careers: ['Chef', 'Food & Beverage Manager', 'Restaurant Owner'],
        tags: ['culinary', 'food', 'hospitality']
    },

    // Sports, Fitness and Human Performance
    {
        id: 'sports-science',
        title: 'BSc Sports Science',
        institutionId: 'nottingham',
        level: 'Diploma',
        domainIds: ['sports', 'health'],
        careers: ['Sports Scientist', 'Fitness Coach', 'Physiotherapist'],
        tags: ['sports', 'fitness', 'science']
    },
    {
        id: 'sports-management',
        title: 'BA Sports Management',
        institutionId: 'mmu',
        level: 'Diploma',
        domainIds: ['sports', 'business'],
        careers: ['Sports Manager', 'Event Manager', 'Talent Agent'],
        tags: ['sports', 'management', 'business']
    },
    {
        id: 'physiotherapy',
        title: 'BSc Physiotherapy',
        institutionId: 'ucsi',
        level: 'Diploma',
        domainIds: ['sports', 'health'],
        careers: ['Physiotherapist', 'Rehabilitation Specialist', 'Sports Therapist'],
        tags: ['physiotherapy', 'healthcare', 'rehabilitation']
    },

    // Environmental and Sustainability Studies
    {
        id: 'environmental',
        title: 'BSc Environmental Science',
        institutionId: 'nottingham',
        level: 'Diploma',
        domainIds: ['environment', 'health'],
        careers: ['Environmental Scientist', 'Sustainability Consultant', 'Conservationist'],
        tags: ['environment', 'science', 'sustainability']
    },
    {
        id: 'sustainability',
        title: 'BA Sustainability',
        institutionId: 'monash',
        level: 'Diploma',
        domainIds: ['environment', 'business'],
        careers: ['Sustainability Manager', 'Environmental Consultant', 'ESG Analyst'],
        tags: ['sustainability', 'environment', 'business']
    },

    // Education, Psychology and Social Sciences
    {
        id: 'psychology',
        title: 'BA Psychology',
        institutionId: 'help',
        level: 'Diploma',
        domainIds: ['social_sciences'],
        careers: ['Psychologist', 'Counselor', 'Human Resources Specialist'],
        tags: ['psychology', 'mental health', 'counseling']
    },
    {
        id: 'education',
        title: 'BEd Primary Education',
        institutionId: 'taylors',
        level: 'Diploma',
        domainIds: ['social_sciences'],
        careers: ['Teacher', 'Education Manager', 'Curriculum Developer'],
        tags: ['education', 'teaching', 'school']
    },
    {
        id: 'social-work',
        title: 'BA Social Work',
        institutionId: 'ucsi',
        level: 'Diploma',
        domainIds: ['social_sciences'],
        careers: ['Social Worker', 'Community Manager', 'Welfare Officer'],
        tags: ['social', 'community', 'welfare']
    },

    // Skilled Trades and Applied Technology
    {
        id: 'automotive',
        title: 'Diploma in Automotive Technology',
        institutionId: 'tarumt',
        level: 'Diploma',
        domainIds: ['trades', 'engineering'],
        careers: ['Automotive Technician', 'Vehicle Engineer', 'Service Manager'],
        tags: ['automotive', 'mechanical', 'trades']
    },
    {
        id: 'electrical-trades',
        title: 'Diploma in Electrical Technology',
        institutionId: 'inti',
        level: 'Diploma',
        domainIds: ['trades', 'engineering'],
        careers: ['Electrician', 'Electrical Technician', 'Industrial Electrician'],
        tags: ['electrical', 'trades', 'technology']
    },
    {
        id: 'construction',
        title: 'Diploma in Construction Technology',
        institutionId: 'tarumt',
        level: 'Diploma',
        domainIds: ['trades', 'engineering'],
        careers: ['Construction Supervisor', 'Site Manager', 'Building Technician'],
        tags: ['construction', 'trades', 'building']
    },

    // Administration, Operations and Data Support
    {
        id: 'human-resources',
        title: 'BSc Human Resource Management',
        institutionId: 'help',
        level: 'Diploma',
        domainIds: ['admin', 'business'],
        careers: ['HR Manager', 'Recruiter', 'Training Specialist'],
        tags: ['hr', 'human resources', 'management']
    },
    {
        id: 'administration',
        title: 'Diploma in Business Administration',
        institutionId: 'tarumt',
        level: 'Diploma',
        domainIds: ['admin', 'business'],
        careers: ['Administrative Manager', 'Office Manager', 'Executive Assistant'],
        tags: ['administration', 'management', 'office']
    },
    {
        id: 'logistics',
        title: 'BSc Logistics & Supply Chain Management',
        institutionId: 'mmu',
        level: 'Diploma',
        domainIds: ['admin', 'business'],
        careers: ['Logistics Manager', 'Supply Chain Analyst', 'Operations Manager'],
        tags: ['logistics', 'supply chain', 'operations']
    }
];
