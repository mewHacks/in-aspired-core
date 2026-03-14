import { RiasecType } from '../../../shared/src/types/education';

// Interaction types for different questions to ensure user stays focused
export type InteractionType =
    | 'standard-card'      // Default card for the rest of the questions
    | 'tv-remote'          // Q9
    | 'directional-nav'    // Q10
    | 'scene-selection'    // Q7, Q11, Q21, Q22, Q36
    | 'dialogue-choice';   // Q13-18, Q23

// Quiz option interface for different questions
export interface QuizOption {
    label: string;
    value: RiasecType;
    score: number;
    visualLabel?: string; // Short label for scene interaction (e.g. "Easel")
    visualImage?: string; // Path to asset
    coordinates?: { x: number; y: number }; // Percentage position (0-100) for interactive scenes
    scale?: number; // Optional scaling for specific items (default 1)
}

// Quiz question interface for different questions
export interface QuizQuestion {
    id: number;
    scenario: string;
    options: QuizOption[];
    interactionType?: InteractionType;
    visualContext?: {
        theme?: 'workspace' | 'lifestyle' | 'social' | 'environment' | 'deep-dive' | 'future'; // 6 distinct sections
        bgImage?: string; // Placeholder for asset path
    };
}

// 36 questions that takes around 6-8 minutes to complete
// Distributed into 6 distinct sections
export const quizQuestions: QuizQuestion[] = [

    // Section 1: Working Style (Q1-Q6)
    // Theme: Workspace (clean, isometric, professional)
    {
        id: 1,
        scenario: "When solving a complex problem at work/school, you prefer to:",
        visualContext: { theme: 'workspace' },
        options: [
            { label: "Analyze data and conduct research to find the logical answer.", value: 'I', score: 5 },
            { label: "Brainstorm creative, out-of-the-box solutions with no limits.", value: 'A', score: 5 },
            { label: "Organize the team and delegate tasks to get it done efficiently.", value: 'E', score: 5 },
        ]
    },
    {
        id: 2,
        scenario: "Ideally, your workspace would look like:",
        visualContext: { theme: 'workspace' },
        options: [
            { label: "A workshop with tools, machines, or outdoor equipment.", value: 'R', score: 5 },
            { label: "A quiet, well-organized office with clear filing systems.", value: 'C', score: 5 },
            { label: "A bustling collaborative space where you can help people.", value: 'S', score: 5 },
        ]
    },
    {
        id: 3,
        scenario: "You have a deadline approaching. Your approach is to:",
        visualContext: { theme: 'workspace' },
        options: [
            { label: "Execute a strategic, detailed plan to ensure everything runs perfectly.", value: 'C', score: 5 },
            { label: "Dive in hands-on and just start building/fixing it immediately.", value: 'R', score: 5 },
            { label: "Rely on your intuition and flow, improvising as you go.", value: 'A', score: 5 },
        ]
    },
    {
        id: 4,
        scenario: "Which role appeals to you most in a group project?",
        visualContext: { theme: 'workspace' },
        options: [
            { label: "The Negotiator: Persuading others and selling the group's idea.", value: 'E', score: 5 },
            { label: "The Helper: ensuring everyone feels included and supported.", value: 'S', score: 5 },
            { label: "The Scientist: Fact-checking and ensuring technical accuracy.", value: 'I', score: 5 },
        ]
    },
    {
        id: 5,
        scenario: "You feel most accomplished when you have:",
        visualContext: { theme: 'workspace' },
        options: [
            { label: "Built or repaired something tangible with your hands.", value: 'R', score: 5 },
            { label: "Taught someone a new skill or helped them through a tough time.", value: 'S', score: 5 },
            { label: "Successfully led a team to achieve a high-revenue goal.", value: 'E', score: 5 },
        ]
    },
    {
        id: 6,
        scenario: "If you had to write a book, it would likely be:",
        visualContext: { theme: 'workspace' },
        options: [
            { label: "A technical manual or a non-fiction analysis of a complex topic.", value: 'I', score: 5 },
            { label: "An expressive novel, poetry collection, or screenplay.", value: 'A', score: 5 },
            { label: "A guide on productivity, data management, or accounting.", value: 'C', score: 5 },
        ]
    },

    // Section 2: Interests & Hobbies (Q7-Q12)
    // Theme: Lifestyle (immersive, photographic)
    {
        id: 7,
        scenario: "It's a free Saturday. You are most likely to do:",
        interactionType: 'scene-selection',
        visualContext: {
            theme: 'lifestyle',
            bgImage: '/assets/quiz/living-room/scene_living_room_bg.webp'
        },
        options: [
            {
                label: "Go hiking, fix a car, or do woodworking.",
                visualLabel: "Hands-on Projects",
                value: 'R',
                score: 5,
                visualImage: '/assets/quiz/living-room/prop_toolbox_workbench.webp',
                coordinates: { x: 20, y: 70 }
            },
            {
                label: "Visit an art gallery or attend a concert.",
                visualLabel: "Creative Activities",
                value: 'A',
                score: 5,
                visualImage: '/assets/quiz/living-room/prop_easel_canvas.webp',
                coordinates: { x: 50, y: 65 }
            },
            {
                label: "Optimize your personal finances or organize your digital life.",
                visualLabel: "Planning & Organizing",
                value: 'C',
                score: 5,
                visualImage: '/assets/quiz/living-room/prop_laptop_planner.webp',
                coordinates: { x: 80, y: 70 }
            },
        ]
    },
    {
        id: 8,
        scenario: "You want to learn a new skill. You pick:",
        visualContext: { theme: 'lifestyle' },
        options: [
            { label: "Public speaking or sales negotiation.", value: 'E', score: 5 },
            { label: "Counseling or first aid to assist others.", value: 'S', score: 5 },
            { label: "Computer programming or advanced mathematics.", value: 'I', score: 5 },
        ]
    },
    {
        id: 9,
        scenario: "Pick a TV show to watch:",
        interactionType: 'tv-remote',
        visualContext: {
            theme: 'lifestyle',
            bgImage: '/assets/quiz/tv/scene_tv_room_bg.webp'
        },
        options: [
            {
                label: "Documentaries about science, nature, or history.",
                visualLabel: "Documentary",
                value: 'I',
                score: 5,
                visualImage: '/assets/quiz/tv/img_channel_nature.webp'
            },
            {
                label: "Reality shows about business competitions or politics.",
                visualLabel: "Reality TV",
                value: 'E',
                score: 5,
                visualImage: '/assets/quiz/tv/img_channel_reality.webp'
            },
            {
                label: "Talk shows or dramas focused on relationships and people.",
                visualLabel: "Talk Show",
                value: 'S',
                score: 5,
                visualImage: '/assets/quiz/tv/img_channel_talkshow.webp'
            },
        ]
    },
    {
        id: 10,
        scenario: "You are at a bookstore. You head straight for the section on:",
        interactionType: 'directional-nav',
        visualContext: {
            theme: 'lifestyle',
            bgImage: '/assets/quiz/bookstore/scene_bookstore_aisle.webp' // Planned asset
        },
        options: [
            {
                label: "Art, Design, or Fiction.",
                visualLabel: "Arts & Fiction",
                value: 'A',
                score: 5,
                visualImage: '/assets/quiz/bookstore/sign_arts_fiction.webp' // Hanging sign
            },
            {
                label: "Technology, Engineering, or Mechanics.",
                visualLabel: "Tech & Innovation",
                value: 'R',
                score: 5,
                visualImage: '/assets/quiz/bookstore/sign_tech_mechanics.webp' // Hanging sign
            },
            {
                label: "Business, Finance, or Law.",
                visualLabel: "Business & Law",
                value: 'C',
                score: 5,
                visualImage: '/assets/quiz/bookstore/sign_business_law.webp' // Hanging sign
            },
        ]
    },
    {
        id: 11,
        scenario: "You're planning a vacation. Your style is:",
        interactionType: 'scene-selection',
        visualContext: {
            theme: 'lifestyle',
            bgImage: '/assets/quiz/travel/scene_travel_desk_bg.webp'
        },
        options: [
            {
                label: "No fixed plan, just exploring culture and taking photos.",
                visualLabel: "Wilderness Adventure",
                value: 'A',
                score: 5,
                visualImage: '/assets/quiz/travel/prop_brochure_wild.webp',
                coordinates: { x: 25, y: 70 }
            },
            {
                label: "A group tour where you can meet locals and other travelers.",
                visualLabel: "Group Culture Tour",
                value: 'S',
                score: 5,
                visualImage: '/assets/quiz/travel/prop_brochure_tour.webp',
                coordinates: { x: 50, y: 65 }
            },
            {
                label: "A meticulously planned itinerary with spreadsheets.",
                visualLabel: "Luxury Itinerary",
                value: 'C',
                score: 5,
                visualImage: '/assets/quiz/travel/prop_brochure_plan.webp',
                coordinates: { x: 75, y: 70 }
            },
        ]
    },
    {
        id: 12,
        scenario: "If you won the lottery, you would:",
        visualContext: { theme: 'lifestyle' },
        options: [
            { label: "Start your own company or invest aggressively.", value: 'E', score: 5 },
            { label: "Buy a farm/workshop and work with machines/animals.", value: 'R', score: 5 },
            { label: "Fund a research lab to solve global mysteries.", value: 'I', score: 5 },
        ]
    },

    // Section 3: Social & Values (Q13-Q18)
    // Theme: Social (abstract, dialogue bubbles)
    {
        id: 13,
        scenario: "In a conversation, you enjoy talking about:",
        interactionType: 'dialogue-choice',
        visualContext: { theme: 'social' },
        options: [
            { label: "Abstract ideas, feelings, and artistic expression.", value: 'A', score: 5 },
            { label: "Concrete facts, numbers, and processes.", value: 'C', score: 5 },
            { label: "Strategies, leadership, and future ambitions.", value: 'E', score: 5 },
        ]
    },
    {
        id: 14,
        scenario: "Your friends describe you as:",
        interactionType: 'dialogue-choice',
        visualContext: { theme: 'social' },
        options: [
            { label: "The Problem Solver who fixes things.", value: 'R', score: 5 },
            { label: "The Intellectual who knows a lot of facts.", value: 'I', score: 5 },
            { label: "The Empath who is always there to listen.", value: 'S', score: 5 },
        ]
    },
    {
        id: 15,
        scenario: "What matters most to you in a career?",
        interactionType: 'dialogue-choice',
        visualContext: { theme: 'social' },
        options: [
            { label: "Prestige, status, and the ability to influence others.", value: 'E', score: 5 },
            { label: "Stability, organization, and clear procedures.", value: 'C', score: 5 },
            { label: "Making a difference in people's lives directly.", value: 'S', score: 5 },
        ]
    },
    {
        id: 16,
        scenario: "You see a complex machine. You wonder:",
        interactionType: 'dialogue-choice',
        visualContext: { theme: 'social' },
        options: [
            { label: "How does it work? (The physics/mechanics)", value: 'I', score: 5 },
            { label: "How can I operate it? (Hands-on usage)", value: 'R', score: 5 },
            { label: "How can this simplify my filing system? (Efficiency)", value: 'C', score: 5 },
        ]
    },
    {
        id: 17,
        scenario: "You are asked to give a presentation. You focus on:",
        interactionType: 'dialogue-choice',
        visualContext: { theme: 'social' },
        options: [
            { label: "Inspiring the audience emotionally with visuals.", value: 'A', score: 5 },
            { label: "Persuading them to take a specific action or buy in.", value: 'E', score: 5 },
            { label: "Sharing accurate research findings and data.", value: 'I', score: 5 },
        ]
    },
    {
        id: 18,
        scenario: "Volunteering opportunity! You choose to:",
        interactionType: 'dialogue-choice',
        visualContext: { theme: 'social' },
        options: [
            { label: "Build houses for the homeless.", value: 'R', score: 5 },
            { label: "Mentor logic/math students.", value: 'I', score: 5 },
            { label: "Organize the fundraising gala.", value: 'E', score: 5 },
        ]
    },

    // Section 4: Environment & Tasks (Q19-Q24)
    // Theme: Environment (tangible, locational)
    {
        id: 19,
        scenario: "You prefer tasks that are:",
        visualContext: { theme: 'environment' },
        options: [
            { label: "Physical and active (outdoors or hands-on).", value: 'R', score: 5 },
            { label: "Social and interactive (teaching/healing).", value: 'S', score: 5 },
            { label: "Creative and expressive (design/writing).", value: 'A', score: 5 },
        ]
    },
    {
        id: 20,
        scenario: "A software update changes your workflow. You:",
        visualContext: { theme: 'environment' },
        options: [
            { label: "Immediately read the documentation to understand the logic.", value: 'I', score: 5 },
            { label: "Make sure records are updated and compliant with new rules.", value: 'C', score: 5 },
            { label: "Ask colleagues how they feel about the change.", value: 'S', score: 5 },
        ]
    },
    {
        id: 21,
        scenario: "Which high school subject did/would you prefer?",
        interactionType: 'scene-selection',
        visualContext: {
            theme: 'environment',
            bgImage: '/assets/quiz/school/scene_school_hallway.webp'
        },
        options: [
            {
                label: "Shop Class, Athletics, or Agriculture.",
                visualLabel: "Workshop",
                value: 'R',
                score: 5,
                visualImage: '/assets/quiz/school/door_workshop.webp',
                coordinates: { x: 75, y: 60 }
            },
            {
                label: "Debate, Student Council, or Business.",
                visualLabel: "Debate Hall",
                value: 'E',
                score: 5,
                visualImage: '/assets/quiz/school/door_debate.webp',
                coordinates: { x: 50, y: 50 }
            },
            {
                label: "Art, Drama, or Creative Writing.",
                visualLabel: "Art Studio",
                value: 'A',
                score: 5,
                visualImage: '/assets/quiz/school/door_art_room.webp',
                coordinates: { x: 25, y: 68 }
            },
        ]
    },
    {
        id: 22,
        scenario: "You need to organize a party. You take charge of:",
        interactionType: 'scene-selection',
        visualContext: {
            theme: 'environment',
            bgImage: '/assets/quiz/party/scene_party_room_bg.webp'
        },
        options: [
            {
                label: "Creating the guest list and managing the budget.",
                visualLabel: "Guest List",
                value: 'C',
                score: 5,
                visualImage: '/assets/quiz/party/prop_guest_list.webp',
                coordinates: { x: 25, y: 75 }
            },
            {
                label: "Making sure everyone is having a good time.",
                visualLabel: "Crowd/People",
                value: 'S',
                score: 5,
                visualImage: '/assets/quiz/party/prop_crowd_group.webp',
                coordinates: { x: 50, y: 60 }
            },
            {
                label: "Setting up the lights, sound system, and decorations.",
                visualLabel: "DJ Booth",
                value: 'R',
                score: 5,
                visualImage: '/assets/quiz/party/prop_dj_booth.webp',
                coordinates: { x: 80, y: 65 }
            },
        ]
    },
    {
        id: 23,
        scenario: "You encounter a theory that contradicts your beliefs. You:",
        interactionType: 'dialogue-choice',
        visualContext: { theme: 'environment' },
        options: [
            { label: "Research it deeply to see if it makes logical sense.", value: 'I', score: 5 },
            { label: "Debate the person to prove your point of view.", value: 'E', score: 5 },
            { label: "Use it as inspiration for a story or artwork.", value: 'A', score: 5 },
        ]
    },
    {
        id: 24,
        scenario: "Your ideal retirement involves:",
        visualContext: { theme: 'environment' },
        options: [
            { label: "Running a small bed & breakfast or consulting firm.", value: 'E', score: 5 },
            { label: "Cataloging your massive collection of something.", value: 'C', score: 5 },
            { label: "Living in a cabin, fishing, and fixing things.", value: 'R', score: 5 },
        ]
    },

    // Section 5: Deep Dive (Q25-Q30)
    // Theme: Deep Dive (dark mode, minimalist)
    {
        id: 25,
        scenario: "You have to work on a team. What frustrates you most?",
        visualContext: { theme: 'deep-dive' },
        options: [
            { label: "Lack of specific instructions or disorganized workflows.", value: 'C', score: 5 },
            { label: "Restrictions on creativity and rigid rules.", value: 'A', score: 5 },
            { label: "People being insensitive or unkind to each other.", value: 'S', score: 5 },
        ]
    },
    {
        id: 26,
        scenario: "You fit best in a role where:",
        visualContext: { theme: 'deep-dive' },
        options: [
            { label: "You are the expert analyzing complex problems.", value: 'I', score: 5 },
            { label: "You are the boss making high-stakes decisions.", value: 'E', score: 5 },
            { label: "You are the artisan creating something unique.", value: 'A', score: 5 },
        ]
    },
    {
        id: 27,
        scenario: "If you could intern anywhere for a week, you'd choose:",
        visualContext: { theme: 'deep-dive' },
        options: [
            { label: "A busy hospital ER helping patients.", value: 'S', score: 5 },
            { label: "A high-tech robotics manufacturing plant.", value: 'R', score: 5 },
            { label: "A major accounting firm during tax season.", value: 'C', score: 5 },
        ]
    },
    {
        id: 28,
        scenario: "You are buying a computer. You care most about:",
        visualContext: { theme: 'deep-dive' },
        options: [
            { label: "The specs, processor speed, and technical benchmarks.", value: 'I', score: 5 },
            { label: "The aesthetics, design, and screen quality for art.", value: 'A', score: 5 },
            { label: "The brand prestige and resale value.", value: 'E', score: 5 },
        ]
    },
    {
        id: 29,
        scenario: "A friend comes to you with a problem. You:",
        visualContext: { theme: 'deep-dive' },
        options: [
            { label: "Listen empathetically and offer emotional support.", value: 'S', score: 5 },
            { label: "Offer a practical, step-by-step fix.", value: 'R', score: 5 },
            { label: "Analyze the root cause of why it happened.", value: 'I', score: 5 },
        ]
    },
    {
        id: 30,
        scenario: "At a networking event, you are:",
        visualContext: { theme: 'deep-dive' },
        options: [
            { label: "Working the room, exchanging cards, and making deals.", value: 'E', score: 5 },
            { label: "Talking to one person deeply about their life story.", value: 'S', score: 5 },
            { label: "Standing back, observing the dynamics, or checking the schedule.", value: 'C', score: 5 },
        ]
    },

    // Section 6: Final Scenarios (Q31-Q36)
    // Theme: Future (bright, visionary)
    {
        id: 31,
        scenario: "You're assigned a project with vague instructions. You:",
        visualContext: { theme: 'future' },
        options: [
            { label: "Love it! It's a blank canvas for my ideas.", value: 'A', score: 5 },
            { label: "Hate it. I need clear guidelines and expectations.", value: 'C', score: 5 },
            { label: "Research similar projects to determine the best approach.", value: 'I', score: 5 },
        ]
    },
    {
        id: 32,
        scenario: "Your dream startup would be:",
        visualContext: { theme: 'future' },
        options: [
            { label: "A non-profit dedicated to community health.", value: 'S', score: 5 },
            { label: "A construction or landscaping business.", value: 'R', score: 5 },
            { label: "A marketing agency with high growth potential.", value: 'E', score: 5 },
        ]
    },
    {
        id: 33,
        scenario: "You perform best when you are:",
        visualContext: { theme: 'future' },
        options: [
            { label: "Working independently on abstract concepts.", value: 'I', score: 5 },
            { label: "Working with your hands and tools.", value: 'R', score: 5 },
            { label: "Working with data, numbers, and details.", value: 'C', score: 5 },
        ]
    },
    {
        id: 34,
        scenario: "Which word best describes your ideal self?",
        visualContext: { theme: 'future' },
        options: [
            { label: "Imaginative.", value: 'A', score: 5 },
            { label: "Ambitious.", value: 'E', score: 5 },
            { label: "Helpful.", value: 'S', score: 5 },
        ]
    },
    {
        id: 35,
        scenario: "You find satisfaction in:",
        visualContext: { theme: 'future' },
        options: [
            { label: "Accuracy and precision.", value: 'C', score: 5 },
            { label: "Discovery and knowledge.", value: 'I', score: 5 },
            { label: "Expression and originality.", value: 'A', score: 5 },
        ]
    },
    {
        id: 36,
        scenario: "Final Question: If you had to pick a uniform, you'd choose:",
        interactionType: 'scene-selection',
        visualContext: {
            theme: 'future',
            bgImage: '/assets/quiz/wardrobe/scene_walkin_closet_bg.webp'
        },
        options: [
            {
                label: "A suit or professional business attire.",
                visualLabel: "The Executive",
                value: 'E',
                score: 5,
                visualImage: '/assets/quiz/wardrobe/outfit_suit.webp',
                coordinates: { x: 27.75, y: 53 }
            },
            {
                label: "Practical workwear (jeans, boots, safety gear).",
                visualLabel: "The Maker",
                value: 'R',
                score: 5,
                visualImage: '/assets/quiz/wardrobe/outfit_workwear.webp',
                coordinates: { x: 50, y: 53 }
            },
            {
                label: "Clothing that reflects my personality, creativity, or mood.",
                visualLabel: "The Creative",
                value: 'A',
                score: 5,
                visualImage: '/assets/quiz/wardrobe/outfit_creative.webp',
                coordinates: { x: 73, y: 53 },
                scale: 1.4
            },
        ]
    }
];
