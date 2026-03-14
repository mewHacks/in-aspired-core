// PDF Content Library v2.0
// Rich, curated content for the 20-page comprehensive report.
// All functions accept a Profile object for hyper-personalization.

// Represents a user's RIASEC personality profile with primary, secondary, and tertiary types
export interface Profile {
    primary: string;
    secondary: string;
    tertiary: string;
    dominanceGap: number;
    tensionScore: number;
    code: string; // e.g., "ASE"
    scores: { type: string; score: number }[];
}

// Advanced psychological analysis object based on score structure.
export interface ProfileInsight {
    ranked: { type: string; score: number }[];
    gaps: {
        p1s: number; // Primary vs Secondary
        s1t: number; // Secondary vs Tertiary
    };
    balanceType: 'specialist' | 'balanced' | 'conflicted';
    tensionPairs: string[]; // e.g. ["S-E"]
    suppressedTraits: string[]; // Traits scoring < 15
    identityRisk: string; // Brief structural "Shadow"
}

// Logic Engine: Process raw scores into a ProfileInsight object.
export function analyzeProfileInsight(scores: { type: string; score: number }[]): ProfileInsight {
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const p1 = sorted[0];
    const s2 = sorted[1];
    const t3 = sorted[2];

    const p1s = p1.score - s2.score;
    const s1t = s2.score - t3.score;

    // Determine balance type
    let balanceType: 'specialist' | 'balanced' | 'conflicted' = 'balanced';
    if (p1s > 20) balanceType = 'specialist';
    else if (p1s < 5 && s1t > 15) balanceType = 'conflicted'; // Strong top 2 with hard drop

    // Identify tensions (adjacent vs opposite in RIASEC circle)
    const order = ['R', 'I', 'A', 'S', 'E', 'C'];
    const pIdx = order.indexOf(p1.type);
    const sIdx = order.indexOf(s2.type);
    const dist = Math.min(Math.abs(pIdx - sIdx), 6 - Math.abs(pIdx - sIdx));

    const tensionPairs = [];
    if (dist >= 2 && p1s < 10) {
        tensionPairs.push(`${p1.type}-${s2.type}`);
    }

    const suppressedTraits = sorted.filter(s => s.score < 15).map(s => s.type);

    // Structural risk analysis
    let identityRisk = "General over-identification with primary traits.";
    if (p1s < 5) identityRisk = "Identity Fog: The push-pull between your top two traits can cause decision paralysis.";
    if (p1s > 25) identityRisk = "Rigid Specialist: You may struggle to adapt when your primary methods fail.";

    return {
        ranked: sorted,
        gaps: { p1s, s1t },
        balanceType,
        tensionPairs,
        suppressedTraits,
        identityRisk
    };
}


// --- PERSONALITY TYPE DATA ---
export const TYPE_DATA: Record<string, {
    name: string;
    color: string;
    emoji: string;
    shortDesc: string;
    longDesc: string;
    keywords: string[];
    famousPeople: string[];
    famousWhys: string[]; // Unique descriptions for each famous person
    idealRoles: string[];
}> = {
    'R': {
        name: 'Realistic',
        color: '#ef4444',
        emoji: '🔧',
        shortDesc: 'Practical, hands-on, and mechanical',
        longDesc: 'You prefer working with things rather than people. You enjoy building, fixing, and operating machinery. You value tangible results and prefer to learn through doing rather than reading or listening. You are practical, athletic, and enjoy outdoor activities.',
        keywords: ['Practical', 'Athletic', 'Grounded', 'Independent', 'Nature-Loving'],
        famousPeople: ['Bear Grylls', 'Elon Musk', 'Mike Rowe'],
        famousWhys: ['Survivalist who thrives on hands-on challenges in the wild', 'Engineer who builds rockets and electric cars from the ground up', 'Champion of skilled trades and blue-collar work'],
        idealRoles: ['Engineer', 'Mechanic', 'Chef', 'Pilot', 'Electrician', 'Farmer', 'Carpenter']
    },
    'I': {
        name: 'Investigative',
        color: '#3b82f6',
        emoji: '🔬',
        shortDesc: 'Analytical, intellectual, and curious',
        longDesc: 'You are driven by a need to understand. You love research, analysis, and solving complex problems. You prefer working independently and value logic over emotion. You are often found deep in thought, reading, or experimenting.',
        keywords: ['Curious', 'Logical', 'Scholarly', 'Precise', 'Intellectual'],
        famousPeople: ['Albert Einstein', 'Marie Curie', 'Bill Gates'],
        famousWhys: ['Revolutionary physicist who reimagined space and time', 'Nobel Prize-winning scientist who pioneered radioactivity research', 'Tech visionary who builds solutions through systematic analysis'],
        idealRoles: ['Scientist', 'Data Analyst', 'Doctor', 'Researcher', 'Programmer', 'Economist']
    },
    'A': {
        name: 'Artistic',
        color: '#a855f7',
        emoji: '🎨',
        shortDesc: 'Creative, expressive, and unconventional',
        longDesc: 'You thrive on self-expression and originality. You dislike routine and structure, preferring to work in environments that allow for creativity and innovation. You are sensitive, intuitive, and often communicate through art, music, or design.',
        keywords: ['Creative', 'Expressive', 'Original', 'Sensitive', 'Visionary'],
        famousPeople: ['Lady Gaga', 'Picasso', 'Steve Jobs'],
        famousWhys: ['Pop icon who constantly reinvents her artistic identity', 'Master painter who broke all the rules of traditional art', 'Design obsessive who merged technology and aesthetics'],
        idealRoles: ['Designer', 'Artist', 'Writer', 'Musician', 'Architect', 'Film Director']
    },
    'S': {
        name: 'Social',
        color: '#22c55e',
        emoji: '🤝',
        shortDesc: 'Helpful, empathetic, and cooperative',
        longDesc: 'You are motivated by helping others and making a positive impact on people\'s lives. You are a natural communicator, team player, and mediator. You value harmony and are often the person others turn to for advice and support.',
        keywords: ['Empathetic', 'Helpful', 'Team-Oriented', 'Patient', 'Nurturing'],
        famousPeople: ['Oprah Winfrey', 'Mother Teresa', 'Mr. Rogers'],
        famousWhys: ['Media mogul who built an empire on authentic connection and empathy', 'Selfless humanitarian who devoted her life to serving the poor', 'Beloved educator who taught generations about kindness and emotional intelligence'],
        idealRoles: ['Teacher', 'Counselor', 'Nurse', 'Social Worker', 'HR Manager', 'Coach']
    },
    'E': {
        name: 'Enterprising',
        color: '#f59e0b',
        emoji: '🚀',
        shortDesc: 'Ambitious, persuasive, and competitive',
        longDesc: 'You are a natural leader and risk-taker. You thrive on competition, influence, and achieving status. You are excellent at selling ideas, motivating teams, and taking initiative. You prefer action over contemplation and enjoy being in charge.',
        keywords: ['Ambitious', 'Persuasive', 'Energetic', 'Confident', 'Competitive'],
        famousPeople: ['Richard Branson', 'Gordon Ramsay', 'Sheryl Sandberg'],
        famousWhys: ['Serial entrepreneur who turned bold ideas into a global empire', 'Intense chef who demands excellence and builds restaurant empires', 'Executive leader who champions women in business and scaled Facebook'],
        idealRoles: ['Entrepreneur', 'Sales Manager', 'CEO', 'Lawyer', 'Politician', 'Marketing Director']
    },
    'C': {
        name: 'Conventional',
        color: '#6366f1',
        emoji: '📊',
        shortDesc: 'Organized, detail-oriented, and systematic',
        longDesc: 'You value order, accuracy, and efficiency. You excel in structured environments with clear rules and procedures. You are reliable, meticulous, and prefer predictable routines. You are often the backbone of any organization, ensuring things run smoothly.',
        keywords: ['Organized', 'Precise', 'Reliable', 'Efficient', 'Systematic'],
        famousPeople: ['Warren Buffett', 'Angela Merkel', 'Hermione Granger'],
        famousWhys: ['Investor known for disciplined, long-term value strategies', 'Methodical leader who governed with precision and steady planning', 'Fictional wizard famous for her love of rules, research, and preparation'],
        idealRoles: ['Accountant', 'Auditor', 'Administrator', 'Data Entry', 'Banker', 'Paralegal']
    }
};

// Dark side personality content keyed by two-letter RIASEC combination codes
// --- DARK SIDE (Combinatorial) ---
export const DARK_SIDE_CONTENT: Record<string, {
    title: string;
    intro: string;
    description: string;
    triggers: string[];
    earlyWarnings: string[];
    recoveryStrategy: string;
}> = {
    'AE': {
        title: 'The Visionary Narcissist',
        intro: 'Your creativity is fueled by ambition—a powerful but volatile combination.',
        description: 'You don\'t just want to create; you want to be *known* for creating. Your art is often a vehicle for status. When your work is praised, you soar. When it\'s ignored or criticized, you can spiral into defensiveness or self-doubt masked as arrogance. You might catch yourself designing for the audience\'s reaction rather than your own truth.',
        triggers: ['Public criticism of your work', 'Being outshone by a peer', 'Lack of recognition or "likes"'],
        earlyWarnings: ['Checking metrics obsessively after sharing something', 'Feeling bitter about others\' success', 'Over-promising on capabilities'],
        recoveryStrategy: 'Create one thing a week purely for yourself, with no audience. Reconnect with the joy of creation without validation.'
    },
    'AS': {
        title: 'The Emotional Sponge',
        intro: 'Your sensitivity is your superpower, but it can also drain you.',
        description: 'You feel everything—your own creative frustrations *and* everyone else\'s pain. You absorb the emotions in a room and often struggle to distinguish your feelings from others\'. This makes you a compassionate friend but also leaves you vulnerable to burnout and codependency.',
        triggers: ['Conflict or "bad vibes" in your environment', 'Feeling responsible for others\' emotions', 'Witnessing injustice'],
        earlyWarnings: ['Feeling exhausted after social interactions', 'Saying yes when you mean no', 'Obsessing over someone else\'s problem'],
        recoveryStrategy: 'Build a physical sanctuary—a space where no one else is allowed. Practice saying "I need a moment" before responding to requests.'
    },
    'AI': {
        title: 'The Isolated Genius',
        intro: 'You live in your head, analyzing emotions rather than feeling them.',
        description: 'Your intellectual curiosity often leads you to observe life from a distance rather than participate in it. You may find yourself dissecting relationships instead of enjoying them. Your ideas are brilliant, but they can remain trapped in your mind, never seeing the light of day because you\'re waiting for "perfection."',
        triggers: ['Forced socialization or small talk', 'Mundane administrative tasks', 'Feeling intellectually underestimated'],
        earlyWarnings: ['Procrastinating on execution while "researching"', 'Choosing solitude over community', 'Critiquing others\' work without creating your own'],
        recoveryStrategy: 'Set a timer: 30 minutes of analysis, then 10 minutes of action. Ship imperfect work.'
    },
    'EA': {
        title: 'The Performative Leader',
        intro: 'Your ambition masks a deeper need for creative validation.',
        description: 'You lead with charisma and vision, but sometimes the "vision" is more about *seeming* visionary than actually building something real. Style can eclipse substance. You\'re excellent at selling ideas—sometimes before they\'re fully baked.',
        triggers: ['Being exposed as "not knowing" something', 'Someone questioning your competence publicly', 'Slow, methodical processes'],
        earlyWarnings: ['Over-promising and under-delivering', 'Avoiding detailed work', 'Taking credit for team efforts'],
        recoveryStrategy: 'Partner with a detail-oriented (C-type) person and genuinely trust them to handle execution while you focus on strategy.'
    },
    'ES': {
        title: 'The People-Pleasing CEO',
        intro: 'You lead with heart, but struggle to make tough calls.',
        description: 'You want to be liked *and* respected, which can be a contradiction. Your teams love you, but you may avoid the hard conversations—giving critical feedback, firing underperformers, or setting unpopular boundaries. This can lead to resentment from high-performers who feel they carry the weight.',
        triggers: ['Having to fire someone or give negative feedback', 'Choosing between team harmony and individual performance', 'Being called "too soft"'],
        earlyWarnings: ['Delaying difficult conversations', 'Making exceptions "just this once" that become patterns', 'Feeling drained by managing emotions'],
        recoveryStrategy: 'Reframe tough love as *necessary for growth*. The kindest thing you can do is tell people the truth.'
    },
    'SE': {
        title: 'The Crusader',
        intro: 'You want to save the world—and you want credit for it.',
        description: 'Your drive to help is genuine, but it\'s entangled with a desire for influence and recognition. You may burn bridges in the name of your cause, dismissing those who don\'t share your fervor. You can become preachy, self-righteous, or martyred when your efforts aren\'t acknowledged.',
        triggers: ['Perceived injustice or lack of recognition for your efforts', 'Being called "performative"', 'Slow institutional change'],
        earlyWarnings: ['Posting about your good deeds on social media', 'Feeling resentful when others don\'t join your cause', 'Overworking to the point of burnout'],
        recoveryStrategy: 'Focus on *impact*, not *recognition*. Ask: "Would I do this if no one ever knew?"'
    },
    'SI': {
        title: 'The Paralyzed Helper',
        intro: 'You want to help, but you overthink the "best" way to do it.',
        description: 'Your combination of empathy (S) and analysis (I) creates a unique tension: you see the problem, analyze 100 solutions, and end up doing nothing because you\'re afraid of choosing wrong. Meanwhile, the person needing help is still waiting.',
        triggers: ['High-pressure immediate decisions', 'Ambiguous emotional situations', 'Being asked "just do something"'],
        earlyWarnings: ['Googling answers instead of asking people', 'Saying "let me think about it" repeatedly', 'Feeling guilty for not helping fast enough'],
        recoveryStrategy: 'Adopt the "70% rule": If 70% of you thinks it\'s the right move, act. Perfection causes paralysis.'
    },
    'DEFAULT': {
        title: 'The Complex Personality',
        intro: 'Your profile doesn\'t fit a common pattern—which is actually a strength.',
        description: 'You balance multiple drives that don\'t obviously align. This can feel like internal chaos, but it also means you\'re adaptable and multi-dimensional. Your challenge is integration: learning to let different parts of yourself take the lead at appropriate times.',
        triggers: ['Feeling like you don\'t fit in any "box"', 'Being asked to define yourself simply'],
        earlyWarnings: ['Feeling scattered or unfocused', 'Comparing yourself to people with clearer paths'],
        recoveryStrategy: 'Embrace the "portfolio life": You don\'t need one identity. You can be a creative *and* a strategist *and* a helper.'
    }
};

// --- COMMUNICATION STYLES ---
export const COMMUNICATION_CONTENT: Record<string, { best: string; stress: string }> = {
    'R': { best: 'Direct, factual, and solution-oriented. You cut through the noise and get to the point.', stress: 'Blunt to the point of coldness, dismissive of emotions, or completely silent.' },
    'I': { best: 'Precise, insightful, and evidence-based. You bring clarity to complex discussions.', stress: 'Over-complicated explanations, nitpicking details, or condescending "well, actually..." corrections.' },
    'A': { best: 'Expressive, metaphorical, and inspiring. You paint pictures with words.', stress: 'Melodramatic, vague, passive-aggressive, or overly sensitive to tone.' },
    'S': { best: 'Warm, empathetic, and encouraging. You make people feel heard and valued.', stress: 'Guilt-tripping, overly accommodating, or conflict-avoidant to the point of resentment building.' },
    'E': { best: 'Confident, persuasive, and decisive. You command a room and inspire action.', stress: 'Domineering, dismissive of dissent, or manipulative to get your way.' },
    'C': { best: 'Structured, detailed, and accurate. You ensure nothing falls through the cracks.', stress: 'Rigid, bureaucratic, or paralyzed by the need for perfect documentation before acting.' }
};

// --- ENERGY & HOBBIES ---
export const ENERGY_CONTENT: Record<string, {
    rechargeMethod: string;
    drains: string[];
    soloHobbies: string[];
    socialHobbies: string[];
}> = {
    'R': {
        rechargeMethod: 'tactile autonomy—working with your hands on a project with a clear, tangible outcome',
        drains: ['Long meetings without action items', 'Abstract philosophical debates', 'Dealing with interpersonal drama'],
        soloHobbies: ['Woodworking', 'Hiking', 'Tinkering with cars or electronics', 'Cooking complex recipes'],
        socialHobbies: ['Team sports', 'Group hikes', 'DIY club projects']
    },
    'I': {
        rechargeMethod: 'intellectual stimulation—diving deep into a subject with no interruptions',
        drains: ['Small talk', 'Rushed decisions without data', 'Noisy, chaotic environments'],
        soloHobbies: ['Reading non-fiction', 'Chess or strategy games', 'Coding side projects', 'Documentaries'],
        socialHobbies: ['Book clubs', 'Debate societies', 'Hackathons']
    },
    'A': {
        rechargeMethod: 'unfiltered creative expression—making something without judgment or deadlines',
        drains: ['Rigid schedules', 'Repetitive tasks', 'Criticism during the creative process'],
        soloHobbies: ['Painting or drawing', 'Writing poetry/stories', 'Playing an instrument', 'Photography'],
        socialHobbies: ['Improv classes', 'Open mics', 'Art jams', 'Band practice']
    },
    'S': {
        rechargeMethod: 'meaningful human connection—helping someone or deep conversation',
        drains: ['Isolation', 'Cold, transactional environments', 'Witnessing conflict without resolution'],
        soloHobbies: ['Journaling about relationships', 'Volunteering', 'Cooking for others'],
        socialHobbies: ['Dinner parties', 'Team sports', 'Community service', 'Support groups']
    },
    'E': {
        rechargeMethod: 'visible progress and influence—seeing the impact of your decisions',
        drains: ['Bureaucracy', 'Being overlooked', 'Slow-moving projects with no milestones'],
        soloHobbies: ['Investing', 'Competitive gaming', 'Content creation', 'Business podcasts'],
        socialHobbies: ['Networking events', 'Public speaking', 'Leading clubs', 'Team competitions']
    },
    'C': {
        rechargeMethod: 'ordered progression—completing tasks in a systematic, predictable way',
        drains: ['Chaos', 'Ambiguity', 'Last-minute changes'],
        soloHobbies: ['Puzzle games', 'Genealogy research', 'Organizing collections', 'Baking'],
        socialHobbies: ['Board game nights (rules-heavy games)', 'Finance clubs', 'Data viz meetups']
    }
};

// --- GROWTH TIMELINE ---
export function getGrowthTimeline(profile: Profile): Array<{ phase: string; title: string; description: string; actions: string[] }> {
    const type = profile.primary;
    const timelines: Record<string, any[]> = {
        'R': [
            { phase: 'Month 1-2', title: '🔧 Foundation', description: 'Get your hands dirty with small projects to build confidence.', actions: ['Complete 1 online course with a hands-on component', 'Build or fix something physical', 'Shadow someone in your target field'] },
            { phase: 'Month 3-4', title: '🛠️ Skill Stacking', description: 'Add complementary technical skills to your core expertise.', actions: ['Learn a new tool or software', 'Get certified in a specialized area', 'Start a side project you can showcase'] },
            { phase: 'Month 5-6', title: '📈 Visibility', description: 'Show the world what you can build.', actions: ['Document your project on a portfolio or GitHub', 'Present your work to a local group', 'Apply to 3 roles or apprenticeships'] }
        ],
        'I': [
            { phase: 'Month 1-2', title: '📚 Deep Research', description: 'Immerse yourself in the theory and fundamentals.', actions: ['Read 3 foundational books', 'Identify 5 experts to follow', 'Write notes synthesizing what you learn'] },
            { phase: 'Month 3-4', title: '🧪 Experimentation', description: 'Apply your knowledge to real-world problems.', actions: ['Start a research project', 'Analyze a dataset', 'Write a blog post explaining a complex concept'] },
            { phase: 'Month 5-6', title: '🎤 Thought Leadership', description: 'Share your insights publicly.', actions: ['Publish an article', 'Speak at a meetup', 'Mentor a beginner'] }
        ],
        'A': [
            { phase: 'Month 1-2', title: '🎨 Exploration', description: 'Feed your creative soul with new inputs.', actions: ['Visit galleries, shows, or read widely', 'Try 3 new creative mediums', 'Fill a sketchbook or idea journal'] },
            { phase: 'Month 3-4', title: '🖼️ Portfolio Building', description: 'Create a cohesive body of work.', actions: ['Produce 5-10 strong pieces', 'Get feedback from peers or mentors', 'Define your unique style'] },
            { phase: 'Month 5-6', title: '🌐 Exhibition', description: 'Put your work in front of an audience.', actions: ['Launch a personal website or portfolio', 'Submit to competitions or publications', 'Showcase at an event'] }
        ],
        'S': [
            { phase: 'Month 1-2', title: '🤝 Networking', description: 'Build relationships in your field of interest.', actions: ['Conduct 5 informational interviews', 'Join a professional community', 'Volunteer for a cause you care about'] },
            { phase: 'Month 3-4', title: '🌱 Service & Growth', description: 'Gain experience by helping others.', actions: ['Take on a mentoring role', 'Lead a small group or project', 'Get training in counseling or coaching fundamentals'] },
            { phase: 'Month 5-6', title: '🏡 Community Building', description: 'Create spaces for others to connect.', actions: ['Start a meetup or online group', 'Organize an event', 'Establish yourself as a connector in your niche'] }
        ],
        'E': [
            { phase: 'Month 1-2', title: '🔍 Market Research', description: 'Identify opportunities and gaps.', actions: ['Analyze 5 competitors or role models', 'Interview potential customers or colleagues', 'Identify your unique value proposition'] },
            { phase: 'Month 3-4', title: '🚀 Launch Something', description: 'Take action and build momentum.', actions: ['Start a side hustle or project', 'Lead a new initiative at work', 'Build a personal brand (LinkedIn, content)'] },
            { phase: 'Month 5-6', title: '📊 Scale & Optimize', description: 'Double down on what is working.', actions: ['Hire or delegate tasks', 'Increase revenue or impact metrics', 'Seek a promotion or expand your influence'] }
        ],
        'C': [
            { phase: 'Month 1-2', title: '🗺️ Planning & Structure', description: 'Create a detailed roadmap for your goals.', actions: ['Write a 12-month plan with milestones', 'Set up tracking systems (spreadsheets, dashboards)', 'Identify 3 certifications to pursue'] },
            { phase: 'Month 3-4', title: '🏅 Certification', description: 'Earn credentials that validate your expertise.', actions: ['Complete a professional certification', 'Pass an industry exam', 'Update your resume and LinkedIn with new credentials'] },
            { phase: 'Month 5-6', title: '⚙️ Process Optimization', description: 'Demonstrate your value through efficiency.', actions: ['Streamline a process at work', 'Create documentation or SOPs', 'Propose a system improvement to leadership'] }
        ]
    };
    return timelines[type] || timelines['R'];
}

// --- SOFT SKILLS ---
export function getSoftSkills(profile: Profile): { superpowers: string[]; toDevelop: string[] } {
    const type = profile.primary;
    const secondary = profile.secondary;

    const skills: Record<string, { superpowers: string[]; toDevelop: string[] }> = {
        'R': { superpowers: ['Problem-solving', 'Technical aptitude', 'Reliability', 'Practical thinking'], toDevelop: ['Emotional intelligence', 'Public speaking', 'Collaboration in abstract projects'] },
        'I': { superpowers: ['Critical thinking', 'Research skills', 'Attention to detail', 'Logical analysis'], toDevelop: ['Networking', 'Selling ideas', 'Taking action without full information'] },
        'A': { superpowers: ['Creativity', 'Innovation', 'Design thinking', 'Storytelling'], toDevelop: ['Time management', 'Following processes', 'Accepting critical feedback'] },
        'S': { superpowers: ['Empathy', 'Communication', 'Teamwork', 'Conflict resolution'], toDevelop: ['Setting boundaries', 'Making tough decisions', 'Self-promotion'] },
        'E': { superpowers: ['Leadership', 'Persuasion', 'Strategic thinking', 'Risk-taking'], toDevelop: ['Listening skills', 'Patience with details', 'Humility'] },
        'C': { superpowers: ['Organization', 'Data management', 'Accuracy', 'Process design'], toDevelop: ['Adaptability', 'Embracing ambiguity', 'Creative brainstorming'] }
    };

    const result = skills[type] || skills['R'];
    // Add one skill from secondary type to develop
    const secondarySkill = skills[secondary]?.toDevelop?.[0];
    if (secondarySkill && !result.toDevelop.includes(secondarySkill)) {
        result.toDevelop.push(secondarySkill);
    }
    return result;
}
