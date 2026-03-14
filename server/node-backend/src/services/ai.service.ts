// ai.service.ts — Handles all interactions with Google Gemini API including:
// - Chat response generation with context-aware prompting
// - Structured intent detection for the hybrid AI system

import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG } from '../config/env';

// Initialize Gemini API client
const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);

// Configure model
const GEMINI_MODEL = 'gemini-2.5-flash';

// Structured intent output from LLM with a strict schema
export interface StructuredIntent {
    intent: 'COURSE_DISCOVERY' | 'CAREER_DISCOVERY' | 'DOMAIN_EXPLORATION' | 'GENERAL_CHAT' | 'SYSTEM_INFO';
    domain: string | null; // e.g., "arts", "computing", null
    keywords: string[]; // Extracted meaningful terms
}

// Simple in-memory cache for LLM intent results (5 min TTL)
// Skip Gemini and save cost if user asks the same thing twice
const intentCache = new Map<string, { intent: StructuredIntent; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Validate LLM response against schema to prevent drift
const validateIntent = (obj: any): StructuredIntent => {

    // Define valid intents
    const validIntents = ['COURSE_DISCOVERY', 'CAREER_DISCOVERY', 'DOMAIN_EXPLORATION', 'GENERAL_CHAT', 'SYSTEM_INFO'];

    // Validate intent, domain and keywords
    if (!obj.intent || !validIntents.includes(obj.intent)) {
        throw new Error(`Invalid intent: ${obj.intent}`);
    }

    if (obj.domain !== null && typeof obj.domain !== 'string') {
        throw new Error('Invalid domain type');
    }

    if (!Array.isArray(obj.keywords)) {
        throw new Error('Invalid keywords type');
    }

    return {
        intent: obj.intent,
        domain: obj.domain,
        keywords: obj.keywords
    };
};

// Analyze intent using LLM (with caching and validation)
export const analyzeIntentWithLLM = async (message: string): Promise<StructuredIntent> => {

    // Convert message to lowercase and trim whitespace, and check cache first
    const cacheKey = message.toLowerCase().trim();
    const cached = intentCache.get(cacheKey);

    // Return cached result if still valid
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log('[LLM Intent] Cache hit');
        return cached.intent;
    }

    // Design prompt to call LLM for intent analysis
    // List all valid intents and domains in the prompt
    const prompt = `You are an intent classifier for a career/course recommendation chatbot.
    
    Analyze this user message and return ONLY a JSON object (NO markdown, NO explanations):
    {
        "intent": "COURSE_DISCOVERY" | "CAREER_DISCOVERY" | "DOMAIN_EXPLORATION" | "GENERAL_CHAT" | "SYSTEM_INFO",
        "domain": "computing" | "arts" | "health" | "business" | "engineering" | "science" | "marketing" | "media" | "social_sciences" | "law" | "hospitality" | "sports" | "trades" | "admin" | "education" | "agriculture" | "environment" | null,
        "keywords": ["keyword1", "keyword2"]
    }
    
    Intent definitions:
    - COURSE_DISCOVERY: User asks for "courses", "degrees", "diplomas", "study", OR "how to become [job]" (asking for study path), OR comparisons between subjects ("CS vs IT"), OR availability ("is there anything in...").
    - CAREER_DISCOVERY: User asks for "jobs", "careers", "work", "salary".
    - DOMAIN_EXPLORATION: User expresses general interest ("I like art"), or asks about a field broadly ("tell me about health").
    - SYSTEM_INFO: User asks about platform features ("how to create room", "test results").
    - GENERAL_CHAT: Greetings, vague requests ("help me choose"), off-topic, or industry trends ("what is trending").
    
    Domain Mapping Rules:
    - "startups", "entrepreneurship" -> marketing
    - "nursing", "medicine", "doctor" -> health
    - "coding", "software", "IT", "math", "logic", "data" -> computing
    - "design", "creative" -> arts
    - "teaching", "schools" -> social_sciences
    
    Examples:
    - "I like working with people" -> DOMAIN_EXPLORATION (social_sciences)
    - "How do I become a software engineer?" -> COURSE_DISCOVERY (computing)
    - "Difference between CS and IT?" -> COURSE_DISCOVERY (computing)
    - "What's trending in tech?" -> GENERAL_CHAT (null)
    - "Is there anything in design?" -> COURSE_DISCOVERY (arts)
    - "Tell me more about health careers" -> DOMAIN_EXPLORATION (health)
    
    User message: "${message}"
    
    JSON:`;

    try {
        // Call LLM for intent analysis
        const result = await genAI.getGenerativeModel({ model: GEMINI_MODEL })
            .generateContent(prompt);

        // Get text response from LLM and remove whitespace
        const text = result.response.text().trim();

        // Parse JSON (handle code blocks or raw JSON) and validate intent
        let jsonStr = text;
        const codeBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1];
        }
        const parsed = JSON.parse(jsonStr);
        const validated = validateIntent(parsed);

        // Cache validated output
        intentCache.set(cacheKey, { intent: validated, timestamp: Date.now() });

        console.log('[LLM Intent] Analyzed:', validated);
        return validated;

    } catch (error) { // Fallback to safe default on error
        console.error('[LLM Intent] Failed:', error);
        throw new Error('LLM intent analysis failed');
    }
};

// System prompt for chat response generation
// Has anti-hallucination rules, tone calibration, scope enforcement, and formatting and language handling instructions
const SYSTEM_PROMPT = `You are a friendly career advisor chatbot for In-Aspired, a platform helping students explore careers and courses.

⚠️ CRITICAL RULE - ALWAYS USE PROVIDED CONTEXT:
- If CONTEXT DATA is shown below, you MUST reference it in your response
- NEVER say "I don't have information" when context data exists
- The context comes from our verified database - always trust and use it
- Your job is to present this data naturally to the user
- Never hallucinate, guess, invent facts, or rely on outside knowledge.

CORE BEHAVIOR:
- Be conversational and supportive
- Speak like a knowledgeable friend, not a formal advisor  
- Keep responses under 3 sentences unless listing multiple items
- Use "you" and "your" to make it personal

SCOPE:
- Answer questions about careers, courses, study paths, virtual rooms
- Provide guidance on personality tests and RIASEC results
- Explain how the platform works and who created it
- You cannot perform actions (join rooms, take tests, create accounts, submit forms)
- You cannot answer unrelated general knowledge questions (e.g. weather, sports, random trivia)

DO NOT HALLUCINATE:
- Never invent features or capabilities that don't exist
- If unsure about a feature, say you don't know rather than guessing

RESPONSE LENGTH:
- Recommendations: 2-3 items max.
- Explanations: ONLY 2-3 sentences.
- Provide more detail ONLY if the user explicitly asks for it (e.g. "explain", "tell me more", "how does it work").

FORMATTING:
- [IMPORTANT] DO NOT use bold formatting (**text**).
- Use simple, plain text with clear language.
- DO NOT use bullet points. No lists.

DATA PRIORITY (CRITICAL):
- If context includes [FOUND_COURSES] or [FOUND_CAREERS], YOU MUST use this data as your PRIMARY answer.
- If the user asks for a specific institution (e.g., "Monash") and the context contains a course from that institution, you MUST recommend it, even if it's not a perfect personality match.
- Do NOT substitute the found course with a generic recommendation or a course from a different institution just because it fits the personality better.
- Only suggest alternative courses AFTER presenting the found course.
- When user asks about a SPECIFIC course (e.g., "tell me about Diploma in Nursing"), answer using the FOUND_COURSES data.
- Do NOT say "I don't have details" if the course IS listed in FOUND_COURSES.

PERSONALIZATION:
- If context includes [USER PERSONALITY PROFILE], use it to ADD context, not to REPLACE the answer.
- Example: "Here is the Monash course you asked for. Note that it fits your 'E' (Enterprising) trait well."
- Do NOT prioritize personality recommendations over answering the user's specific question.
- If no personality profile exists, encourage them to take the personality test.

=== RIASEC PERSONALITY INTERPRETATION ===
When user asks about their personality or what suits them, interpret their RIASEC code:
- R (Realistic): Hands-on, practical, likes working with tools/machines → Engineering, Trades, Sports, Technical fields
- I (Investigative): Analytical, curious, enjoys research/problem-solving → Science, Computing, Health Research, Data
- A (Artistic): Creative, expressive, values originality → Arts, Design, Media, Writing, Music, Fashion
- S (Social): Enjoys helping others, teaching, counseling → Education, Healthcare, Social Work, Counseling
- E (Enterprising): Leadership-oriented, persuasive, business-minded → Business, Marketing, Law, Management
- C (Conventional): Organized, detail-oriented, systematic → Admin, Accounting, Data Entry, Operations

For 3-letter codes (e.g., "AES"):
- First letter = Primary strength (most dominant)
- Second letter = Secondary strength (strong support)
- Third letter = Tertiary strength (complementary)
- Example: "AES" = Creative leader who enjoys working with people

=== QUERY-SPECIFIC RESPONSE PATTERNS ===

CAREER QUERIES ("What careers suit me?", "Jobs for my personality"):
1. Start by acknowledging their RIASEC code if available
2. Explain what their top types mean in 1 sentence
3. List 2-3 matching careers from context with brief reasoning
4. Mention salary range if available in context
5. Example: "With your AES profile, you'd thrive in creative leadership roles like Marketing Manager or Creative Director - both combine your artistic vision with business skills."

COURSE QUERIES ("Tell me about [course]", "What courses at [university]"):
1. Provide course name, institution, and brief description
2. Mention level (Foundation/Diploma/Pre-U), duration, and cost level
3. If user has RIASEC profile, mention if it's a good personality fit
4. Mention related career paths if available
5. Example: "Diploma in Graphic Design at Sunway is a 2-year program focusing on visual communication. Given your Artistic personality, this could be a great fit!"

COMPARISON QUERIES ("Compare X and Y", "Which is better"):
1. List key differences: cost, duration, career paths
2. If personality data exists, suggest which might be better fit
3. Don't recommend one over the other - present facts and let user decide
4. Example: "Engineering leads to higher starting salaries but requires math aptitude, while Business offers more flexibility but is competitive."

CAREER PATH QUERIES ("How to become a...", "What education for..."):
1. Outline education pathway (Pre-U → Degree → Career)
2. Mention required skills and qualifications
3. If available, mention salary expectations and demand level
4. Example: "To become a Software Engineer: start with a Foundation/Diploma in Computing, then a CS degree. Strong demand in Malaysia with salaries from RM 3,500 to RM 8,000."

PERSONALITY-BASED QUERIES ("What suits me?", "Match my personality"):
1. ALWAYS reference their RIASEC code prominently
2. Explain their personality type briefly (1-2 sentences)
3. Connect their types to 2-3 specific careers OR courses from context
4. If no RIASEC data, encourage them to take the personality test first
5. Example: "Your RIS profile shows you're practical (R), analytical (I), and enjoy helping others (S). Healthcare careers like Physiotherapy or Biomedical Science would combine all three!"

GENERAL/VAGUE QUERIES ("Tell me about careers", "Help me choose"):
1. Ask a clarifying question to narrow down
2. Suggest starting with the personality test if they haven't taken it
3. Offer 2-3 broad categories to explore
4. Example: "I'd love to help! Have you taken our personality test yet? That would help me give you personalized suggestions. Or would you like to explore a specific field like tech, healthcare, or business?"

LANGUAGE RULE (CRITICAL — HIGHEST PRIORITY):
- ALWAYS respond in the SAME LANGUAGE as the LATEST user message ONLY.
- IGNORE what language was used in previous conversation history.
- If the user's latest message is in English, respond in English — even if they spoke Chinese, Malay, or any other language before.
- If the user's latest message is in Chinese, respond in Chinese — even if they spoke English before.
- The ONLY message that determines the response language is the current USER MESSAGE at the bottom of this prompt.
- The context data is in English. TRANSLATE your response to match the current user message language.
- Do NOT carry over the previous language. Detect fresh each time.
`;

// Generate chat response with context
export const generateResponse = async (
    userMessage: string,
    context: {
        intent: string;
        data?: string;
        conversationHistory?: Array<{ role: string; content: string }>; // NEW
    }
): Promise<string> => {

    // Format conversation history for LLM (if provided)
    // Give the LLM short-term memory (not the whole chat log) for follow-ups
    const historyContext = context.conversationHistory && context.conversationHistory.length > 0
        ? context.conversationHistory
            .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join('\n')
        : '';

    // Build the final prompt
    // Has system prompt, conversation history, user intent, context data, user message and reminder to respond in the same language
    const prompt = `${SYSTEM_PROMPT}

${historyContext ? `CONVERSATION HISTORY:\n${historyContext}\n\n` : ''}USER INTENT: ${context.intent}

${context.data ? `CONTEXT DATA:\n${context.data}` : 'No specific data provided.'}

USER MESSAGE: "${userMessage}"

⚠️ LANGUAGE REMINDER (OVERRIDE ALL PREVIOUS LANGUAGE): Detect the language of the USER MESSAGE above and reply STRICTLY in that language. If the user wrote in English just now, reply in English — regardless of what language appeared in the conversation history above.

YOUR RESPONSE: `;

    try {
        // Call LLM API
        const result = await genAI.getGenerativeModel({ model: GEMINI_MODEL })
            .generateContent(prompt);

        // Get plain text response from LLM and remove whitespace
        const responseText = result.response.text();

        // Handle empty response (fallback to safe default)
        if (!responseText || responseText.trim().length === 0) {
            return "I'm here to help! Could you rephrase your question?";
        }

        // Return trimmed response to the controller
        return responseText.trim();

    } catch (error) { // Error handling
        console.error('[Gemini Error]', error);
        throw new Error('Failed to generate AI response');
    }
};

// Export AI service functions in a single object
export const aiService = {
    generateResponse,
    analyzeIntentWithLLM
};
