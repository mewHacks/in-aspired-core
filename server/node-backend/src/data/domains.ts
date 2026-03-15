import { InterestDomain } from '../types/education';

export const DOMAIN_MAP: Record<string, string[]> = {
    computing: ['software', 'programming', 'data science', 'IT', 'information technology', 'coding', 'developer', 'computer'],
    engineering: ['engineering', 'mechanical', 'electrical', 'civil', 'building', 'construction'],
    health: ['medical', 'nursing', 'health', 'healthcare', 'medicine', 'pharmacy', 'biomedical'],
    environment: ['environment', 'sustainability', 'climate', 'conservation', 'green'],
    business: ['business', 'accounting', 'finance', 'economics', 'banking', 'management'],
    marketing: ['marketing', 'sales', 'advertising', 'branding', 'digital marketing', 'entrepreneurship'],
    arts: ['art', 'design', 'fashion', 'graphic', 'creative', 'visual'],
    media: ['media', 'journalism', 'broadcasting', 'communication', 'film', 'performing'],
    social_sciences: ['psychology', 'education', 'social', 'teaching', 'counseling'],
    law: ['law', 'legal', 'policy', 'government', 'justice'],
    hospitality: ['hospitality', 'tourism', 'hotel', 'travel', 'event', 'culinary'],
    sports: ['sports', 'fitness', 'physiotherapy', 'exercise', 'athletic'],
    trades: ['trades', 'technical', 'vocational', 'automotive', 'electrical'],
    admin: ['administration', 'hr', 'human resources', 'operations', 'secretary']
};

export const interestDomains: InterestDomain[] = [
    {
        id: 'computing',
        label: 'Computing and Data',
        description: 'Software development, data science, IT infrastructure, and information systems',
        riasecProfile: {
            primary: ['I', 'C'],
            secondary: ['R']
        }
    },
    {
        id: 'engineering',
        label: 'Engineering and Built Environment',
        description: 'Civil, mechanical, electrical, and chemical engineering',
        riasecProfile: {
            primary: ['R', 'I'],
            secondary: ['C']
        }
    },
    {
        id: 'health',
        label: 'Health and Life Sciences',
        description: 'Medicine, nursing, pharmacy, biomedical sciences, and healthcare',
        riasecProfile: {
            primary: ['I', 'S'],
            secondary: ['R']
        }
    },
    {
        id: 'environment',
        label: 'Environmental and Sustainability Studies',
        description: 'Environmental science, sustainability, conservation, and climate studies',
        riasecProfile: {
            primary: ['I', 'S'],
            secondary: ['R']
        }
    },
    {
        id: 'business',
        label: 'Business, Finance and Economics',
        description: 'Accounting, finance, economics, banking, and business administration',
        riasecProfile: {
            primary: ['C', 'E'],
            secondary: ['I']
        }
    },
    {
        id: 'marketing',
        label: 'Marketing, Sales and Entrepreneurship',
        description: 'Digital marketing, sales, advertising, and business development',
        riasecProfile: {
            primary: ['E', 'S'],
            secondary: ['A']
        }
    },
    {
        id: 'arts',
        label: 'Creative Arts and Design',
        description: 'Graphic design, fashion, interior design, and visual arts',
        riasecProfile: {
            primary: ['A', 'E'],
            secondary: ['I']
        }
    },
    {
        id: 'media',
        label: 'Media, Communication and Performing Arts',
        description: 'Journalism, broadcasting, communications, and performing arts',
        riasecProfile: {
            primary: ['A', 'S'],
            secondary: ['E']
        }
    },
    {
        id: 'social_sciences',
        label: 'Education, Psychology and Social Sciences',
        description: 'Psychology, sociology, education, and social work',
        riasecProfile: {
            primary: ['S'],
            secondary: ['A']
        }
    },
    {
        id: 'law',
        label: 'Law, Public Policy and Governance',
        description: 'Law, public administration, political science, and international relations',
        riasecProfile: {
            primary: ['C', 'E'],
            secondary: ['S']
        }
    },
    {
        id: 'hospitality',
        label: 'Hospitality, Tourism and Events',
        description: 'Hotel management, tourism, event planning, and culinary arts',
        riasecProfile: {
            primary: ['S', 'E'],
            secondary: ['A']
        }
    },
    {
        id: 'sports',
        label: 'Sports, Fitness and Human Performance',
        description: 'Sports science, physical education, physiotherapy, and fitness management',
        riasecProfile: {
            primary: ['R', 'S'],
            secondary: ['E']
        }
    },
    {
        id: 'trades',
        label: 'Skilled Trades and Applied Technology',
        description: 'Automotive, electrical, construction, and vocational trades',
        riasecProfile: {
            primary: ['R', 'C'],
            secondary: ['I']
        }
    },
    {
        id: 'admin',
        label: 'Administration, Operations and Data Support',
        description: 'Human resources, operations management, and administrative services',
        riasecProfile: {
            primary: ['C', 'S'],
            secondary: ['E']
        }
    }
];
