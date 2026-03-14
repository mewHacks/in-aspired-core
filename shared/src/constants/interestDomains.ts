import { InterestDomain } from '../types/education';

// List of interest domains
export const interestDomains: InterestDomain[] = [
    {
        id: 'computing',
        label: 'Computing and Data',
        description: 'Design software, analyze data, and build digital systems.',
        riasecProfile: { primary: ['I', 'C'], secondary: ['R'] }
    },
    {
        id: 'engineering',
        label: 'Engineering and Built Environment',
        description: 'Design, build, and maintain structures, machines, and systems.',
        riasecProfile: { primary: ['R', 'I'], secondary: ['E'] }
    },
    {
        id: 'health',
        label: 'Health and Life Sciences',
        description: 'Diagnose, treat, and research to improve human and animal health.',
        riasecProfile: { primary: ['I', 'S'], secondary: ['R'] }
    },
    {
        id: 'environment',
        label: 'Environmental and Sustainability Studies',
        description: 'Protect the planet and manage natural resources.',
        riasecProfile: { primary: ['I', 'R'], secondary: ['S'] }
    },
    {
        id: 'business',
        label: 'Business, Finance and Economics',
        description: 'Manage money, markets, and organizational strategy.',
        riasecProfile: { primary: ['E', 'C'], secondary: ['S'] }
    },
    {
        id: 'marketing',
        label: 'Marketing, Sales and Entrepreneurship',
        description: 'Promote products, close deals, and start new ventures.',
        riasecProfile: { primary: ['E', 'S'], secondary: ['A'] }
    },
    {
        id: 'arts',
        label: 'Creative Arts and Design',
        description: 'Express ideas through visual, digital, and physical art.',
        riasecProfile: { primary: ['A', 'I'], secondary: ['E'] }
    },
    {
        id: 'media',
        label: 'Media, Communication and Performing Arts',
        description: 'Create content, perform, and communicate stories.',
        riasecProfile: { primary: ['A', 'S'], secondary: ['E'] }
    },
    {
        id: 'social_sciences',
        label: 'Education, Psychology and Social Sciences',
        description: 'Teach, counsel, and understand human behavior.',
        riasecProfile: { primary: ['S', 'I'], secondary: ['A'] }
    },
    {
        id: 'law',
        label: 'Law, Public Policy and Governance',
        description: 'Interpret laws, shape policy, and advocate for justice.',
        riasecProfile: { primary: ['E', 'I'], secondary: ['S'] }
    },
    {
        id: 'hospitality',
        label: 'Hospitality, Tourism and Events',
        description: 'Manage guest experiences, travel, and large-scale events.',
        riasecProfile: { primary: ['E', 'S'], secondary: ['R'] }
    },
    {
        id: 'sports',
        label: 'Sports, Fitness and Human Performance',
        description: 'Train athletes, manage sports teams, and promote physical fitness.',
        riasecProfile: { primary: ['R', 'S'], secondary: ['E'] }
    },
    {
        id: 'trades',
        label: 'Skilled Trades and Applied Technology',
        description: 'Hands-on work with tools, machinery, and specialized crafts.',
        riasecProfile: { primary: ['R', 'C'], secondary: ['E'] }
    },
    {
        id: 'admin',
        label: 'Administration, Operations and Data Support',
        description: 'Organize information, manage logistics, and support operations.',
        riasecProfile: { primary: ['C', 'E'], secondary: ['R'] }
    }
];
