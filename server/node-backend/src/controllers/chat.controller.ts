// Chat controller — hybrid intelligent chat handler
// Authenticates user, maintains conversation state, analyzes intent,
// retrieves structured data (courses/careers) from DB, decides when to use LLM vs templates,
// generates context-aware responses, and persists conversation and analysis

// Debug logger - only logs in development to prevent exposing internal logic to attackers
const debugLog = (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(...args);
    }
};

import { Request, Response, NextFunction } from 'express';
import { analyzeIntent, analyzeDataIntent, isAmbiguousQuery, ChatIntent, DataIntent } from '../utils/intent.utils';
import { aiService } from '../services/ai.service';
import { SYSTEM_INFO } from '../data/systemInfo';
import { DOMAIN_MAP, interestDomains } from '../data/domains';
import Career from '../models/Career';
import Course from '../models/Course';
import AIConversation from '../models/AIConversation';
import AIChatMessage from '../models/AIChatMessage';
import Result from '../models/Result';
import { embeddingService } from '../services/embedding.service';

// Intent mapping from LLM output (string) to DataIntent enum
// Protect against typos
const INTENT_MAP: Record<string, DataIntent> = {
    'COURSE_DISCOVERY': DataIntent.COURSE_DISCOVERY,
    'CAREER_DISCOVERY': DataIntent.CAREER_DISCOVERY,
    'DOMAIN_EXPLORATION': DataIntent.DOMAIN_EXPLORATION,
    'SPECIFIC_QUERY': DataIntent.SPECIFIC_QUERY,

    // Fallback mappings for common LLM variations in lower case
    'course_discovery': DataIntent.COURSE_DISCOVERY,
    'career_discovery': DataIntent.CAREER_DISCOVERY,
    'domain_exploration': DataIntent.DOMAIN_EXPLORATION,
    'specific_query': DataIntent.SPECIFIC_QUERY,
};

// Resolve user keyword to interest domain
// Supports direct keyword mapping, partial keyword mapping, and synonym expansion via DOMAIN_MAP
const resolveDomain = (keyword: string): { id: string; label: string } | null => {

    // Convert to lower case for case-insensitive matching and trim whitespace
    const lower = keyword.toLowerCase().trim();

    // DEBUG: Check if interestDomains is loaded correctly
    if (interestDomains.length === 0) console.warn('[Hybrid] WARNING: interestDomains is empty!');
    // Log hospitality specifically to see what it looks like
    const hosp = interestDomains.find(d => d.id === 'hospitality');
    if (keyword === 'hospitality' && hosp) debugLog('[Hybrid] DEBUG: Found hospitality domain object:', hosp);

    const byId = interestDomains.find(d => d.id === lower);
    if (byId) return { id: byId.id, label: byId.label };

    // Partial keyword match (second fastest)
    const byLabel = interestDomains.find(d => d.label.toLowerCase().includes(lower));
    if (byLabel) return { id: byLabel.id, label: byLabel.label };

    // Synonym expansion via DOMAIN_MAP (slowest)
    for (const [key, values] of Object.entries(DOMAIN_MAP)) {
        if (key.toLowerCase() === lower || values.some(v => v.toLowerCase() === lower)) {
            const domain = interestDomains.find(d => d.id === key || d.label.toLowerCase().includes(key));
            if (domain) return { id: domain.id, label: domain.label };
        }
    }

    // No match found
    return null;
};

// Define institution name mapping (for course filtering)
const INSTITUTION_MAP: Record<string, string> = {
    'sunway': 'sunway',
    'taylor': 'taylors',
    "taylor's": 'taylors',
    'taylors': 'taylors',
    'monash': 'monash',
    'um': 'um',
    'university of malaya': 'um',
    'ucsi': 'ucsi',
    'apu': 'apu',
    'asia pacific': 'apu',
    'nottingham': 'nottingham',
    'inti': 'inti',
    'help': 'help',
    'tarumt': 'tarumt',
    'tunku abdul rahman': 'tarumt',
    'mmu': 'mmu',
    'multimedia': 'mmu',
    'multimedia university': 'mmu',
    'limkokwing': 'limkokwing',
    'segi': 'segi'
};

// Detect institution from user message (context-aware)
// Use conservative matching to avoid false positives
const detectInstitution = (message: string): string | null => {

    // Convert to lower case for case-insensitive matching
    const lower = message.toLowerCase();

    // Special handling for "help" because it is ambiguous
    // Conservative approach: only match if referring to the actual help university via keywords to avoid false positives
    if (lower.includes('help')) {
        const isClearInstitution =
            /\bhelp\s+(university|uni|college|campus|institute)\b/i.test(message) ||
            /\b(at|in|from)\s+help\b/i.test(message);

        if (isClearInstitution) {
            return 'help';
        }

        // Otherwise ignore "help" entirely
        return null;
    }

    debugLog('[Hybrid] Detecting institution in:', lower);

    // Check other institutions using WORD BOUNDARY matching
    // This prevents false positives like "Communication" matching "multimedia"
    for (const [keyword, institutionId] of Object.entries(INSTITUTION_MAP)) {

        if (keyword === 'help') continue; // Already handled above

        // Use word boundary regex to prevent false matches
        const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (wordBoundaryRegex.test(message)) {
            console.log(`[Hybrid] Matched institution '${institutionId}' with keyword '${keyword}'`);
            return institutionId;
        }
    }

    return null;
};

// Build deterministic template response for domain exploration, course discovery, and career discovery
// Used ONLY when no course-specific context exists
const buildDiscoveryResponse = (
    dataIntent: DataIntent,
    domain: { id: string; label: string } | null,
    courses: any[],
    careers: any[]
): string => {

    // Domain exploration (e.g., "I'm interested in art")
    if (dataIntent === DataIntent.DOMAIN_EXPLORATION && domain) {
        if (courses.length > 0) {
            const courseList = courses.slice(0, 3).map(c => c.title).join(', ');
            return `If you're into ${domain.label}, you might enjoy courses like ${courseList}. Want something more hands-on or theory-based?`;
        }
        if (careers.length > 0) {
            const careerList = careers.slice(0, 3).map(c => c.name).join(', ');
            return `${domain.label} offers exciting career paths like ${careerList}. Curious about any specific one?`;
        }
        return `${domain.label} is a great field! It typically includes areas like design, creativity, and innovation. Would you like me to find related careers instead?`;
    }

    // Course discovery (e.g., "I want to study art")
    if (dataIntent === DataIntent.COURSE_DISCOVERY) {
        if (courses.length > 0) {
            const top3 = courses.slice(0, 3).map(c => `• ${c.title}`).join('\n');
            return `Here are some courses you might like:\n${top3}\n\nWant me to narrow it down by institution or level?`;
        }
    }

    // Career discovery (e.g., "I want to be a doctor")
    if (dataIntent === DataIntent.CAREER_DISCOVERY) {
        if (careers.length > 0) {
            const top3 = careers.slice(0, 3).map(c => `• ${c.name}`).join('\n');
            return `Based on your interests, here are some career paths:\n${top3}\n\nCurious about salary or demand for any of these?`;
        }
    }

    // Default response when no intent is detected
    return "I can help you explore careers, courses, or specific fields. What interests you most?";
};

// Main chat handler — processes user messages through intent classification, DB retrieval, and response generation
export const handleChatMessage = async (req: Request, res: Response, next: NextFunction) => {

    // Start latency timer for performance tracking and analytics
    const startTime = Date.now();

    try {
        // Extract request payload
        const { message, conversationId } = req.body;
        const userId = (req as any).user?.id;

        // Check if user is authenticated
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Check if message is valid and not empty
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required and must be a string.' });
        }

        // Truncate message to 500 characters to prevent prompt abuse and cost explosion
        const truncatedMessage = message.trim().slice(0, 500);

        // Conversation management (stateful chat)
        let currentConversation: any;

        if (conversationId) {
            // Ensure existing conversation belongs to one user 
            currentConversation = await AIConversation.findOne({
                _id: conversationId,
                userId
            });

            // Conversation not found or access denied
            if (!currentConversation) {
                return res.status(403).json({ error: 'Conversation not found or access denied' });
            }
        } else {
            // Create new conversation
            currentConversation = await AIConversation.create({
                userId,
                title: truncatedMessage.substring(0, 50), // First message as title
                lastMessageAt: new Date(),
                messageCount: 0
            });
        }

        // Fetch conversation history for short-term memory (last 10 messages, oldest first)
        const conversationHistory = await AIChatMessage.find({
            conversationId: currentConversation._id
        })
            .sort({ createdAt: -1 }) // Newest first
            .limit(10)
            .select('role content') // Only role and content, no metadata
            .lean();

        // Reverse to get oldest (newest for LLM context)
        conversationHistory.reverse();

        // Fetch user's personality test results (if any)
        let userRiasecContext = '';
        try {
            // Get most recent personality test result
            // userId from auth middleware may be a string, mongoose handles conversion
            const testResult = await Result.findOne({ userId })
                .sort({ createdAt: -1 }) // Most recent result
                .lean();

            // If test result exists and has scores, and the score array is not empty
            if (testResult && testResult.scores && testResult.scores.length > 0) {

                // Calculate RIASEC code from top 3 scores
                const riasecCode = testResult.scores
                    .sort((a: any, b: any) => b.score - a.score)
                    .slice(0, 3)
                    .map((s: any) => s.type)
                    .join('');

                // Get top domains
                const topDomainsStr = testResult.topDomains
                    ?.slice(0, 3)
                    .map((d: any) => d.label)
                    .join(', ') || 'Not available';

                // Get recommended courses (if saved)
                // Filter out recommended courses if the user is doing a specific search to prevent confusion
                const isSpecificSearch = /what|which|show|find|list|tell|give/i.test(truncatedMessage) &&
                    (detectInstitution(truncatedMessage) || /course|degree|diploma/i.test(truncatedMessage));

                const recommendedCoursesStr = !isSpecificSearch && testResult.recommendedCourses
                    ? testResult.recommendedCourses
                        .slice(0, 5)
                        .map((c: any) => c.title || c.name)
                        .join(', ')
                    : '';

                if (isSpecificSearch) {
                    debugLog('[Hybrid] Specific search detected - suppressing past recommended courses from context');
                }

                // Fetch careers related to the user's top domains

                // Extract domain IDs first
                const topDomainIds = testResult.topDomains
                    ?.slice(0, 3)
                    .map((d: any) => d.id)
                    .filter(Boolean)  // remove null or undefined
                    || [];

                let matchingCareersStr = '';
                if (topDomainIds.length > 0) {
                    // Query careers matching any of the user's top domains
                    const matchingCareers = await Career.find({
                        related_domains: { $in: topDomainIds }
                    })
                        .select('name')
                        .limit(6)
                        .lean();

                    // Convert to comma-separated string for prompt injection
                    matchingCareersStr = matchingCareers
                        .map((c: any) => c.name)
                        .join(', ');


                }

                // Build final RIASEC context block for prompt injection
                userRiasecContext = `
[USER PERSONALITY PROFILE]
RIASEC Code: ${riasecCode}
Top Matched Domains: ${topDomainsStr}
${matchingCareersStr ? `Matching Careers: ${matchingCareersStr}` : ''}
${recommendedCoursesStr ? `Recommended Courses: ${recommendedCoursesStr}` : ''}
Note: Use this to personalize career/course recommendations.`;

            } else {
                // User has no test results
            }
        } catch (err) {
            console.error('[Hybrid] Error fetching test results:', err);
        }

        // Define refuse action patterns so that bot knows what actions to NOT perform, only explain
        const actionPatterns: { pattern: RegExp; action: string; guide: string }[] = [
            { pattern: /\b(join\s+room)\b/i, action: 'join a room', guide: 'Go to Virtual Study Room and click "Join Room" with your room code.' },
            { pattern: /\b(create\s+room)\b/i, action: 'create a room', guide: 'Go to Virtual Study Room and click "Create Room" to get started.' },
            { pattern: /\b(take|start|do)\s+test\b/i, action: 'take the personality test', guide: 'Head to the Personality Test page and click "Start Test".' },
            { pattern: /\b(create\s+account|sign\s*up|register)\b/i, action: 'create an account', guide: 'Click "Sign Up" in the top right corner to register.' },
            { pattern: /\b(login|log\s*in|sign\s*in)\b/i, action: 'log in', guide: 'Click "Login" in the top right corner.' },
            { pattern: /\b(submit|apply)\b/i, action: 'submit an application', guide: 'Visit the course page and click "Apply Now" to go to the institution\'s application portal.' }
        ];

        // Based on the action patterns, return a context-aware response to the user
        for (const { pattern, action, guide } of actionPatterns) {
            if (pattern.test(truncatedMessage)) {
                return res.json({
                    response: `I can explain how to ${action}, but I can't do it for you.\n\n**How to ${action}:**\n${guide}`,
                    intent: 'ACTION_BLOCKED',
                    conversationId: currentConversation._id
                });
            }
        }

        // =============================================
        // Personality Query Detection
        // Detect "what suits me" type queries to boost personality recommendations
        // =============================================

        // Check if the message is a personality query
        const isPersonalityQuery = /suit(?:s|ed)?\s*(?:me|my)|match(?:es|ing)?\s*(?:my|me)|fit(?:s)?\s*(?:me|my)|for me|best for me|right for me|based on my|according to my|my (?:personality|results?|test|type|riasec)/i.test(truncatedMessage);

        // If user asks personality-based question but has no test results, prompt them to take the test
        if (isPersonalityQuery && !userRiasecContext) {
            return res.json({
                response: `I'd love to give you personalized recommendations, but I don't have your personality profile yet!\n\nTake our quick personality test (5-10 minutes) to discover your RIASEC code and get matched with careers and courses that fit you.\n\nHead to the Personality Test page to get started!`,
                intent: 'PERSONALITY_PROMPT',
                conversationId: currentConversation._id
            });
        }

        // If personality query AND user has RIASEC profile, boost the context with explanation
        if (isPersonalityQuery && userRiasecContext) {
            // Extract RIASEC code from context for enhanced prompt
            const riasecMatch = userRiasecContext.match(/RIASEC Code: (\w+)/);
            const riasecCode = riasecMatch ? riasecMatch[1] : '';

            // Add explanation of what their RIASEC code means
            if (riasecCode && riasecCode.length >= 2) {
                const riasecExplanations: Record<string, string> = {
                    'R': 'practical and hands-on (likes working with tools/machines)',
                    'I': 'analytical and research-oriented (enjoys problem-solving)',
                    'A': 'creative and expressive (values originality and art)',
                    'S': 'helpful and people-oriented (enjoys teaching/counseling)',
                    'E': 'leadership-driven and persuasive (business-minded)',
                    'C': 'organized and detail-oriented (systematic thinker)'
                };

                // Get top 3 RIASEC types and their explanations
                const topTypes = riasecCode.slice(0, 3).split('').map((letter: string) =>
                    `${letter} = ${riasecExplanations[letter] || 'unknown'}`
                ).join(', ');

                // Enhance the RIASEC context with explanation
                userRiasecContext = userRiasecContext.replace(
                    'Note: Use this to personalize career/course recommendations.',
                    `Personality Meaning: ${topTypes}\nNote: User is asking about personality-based recommendations. PROMINENTLY reference their RIASEC code and explain why suggestions fit them.`
                );
            }
        }

        console.log('[Hybrid] Personality query detected:', isPersonalityQuery, '| Has RIASEC:', !!userRiasecContext);

        // =============================================
        // Course/Career Name Detection
        // Must happen before intent classification to prevent misrouting
        // =============================================

        // Extract course/career name patterns (e.g., "Diploma in xxx", "Foundation in xxx")
        const courseNameMatch = truncatedMessage.match(/(diploma|foundation)\s+(?:in|of)\s+[A-Za-z]+(?:\s+[A-Za-z]+){0,4}/i);

        // Normalize extraction result (if no match, use null for later)
        let extractedCourseName = courseNameMatch ? courseNameMatch[0].trim() : null;

        // Clean up: remove trailing noise words which are not part of course name (e.g., "Diploma in xxx tell me more")
        if (extractedCourseName) {
            extractedCourseName = extractedCourseName
                .replace(/\s+(elaborate|tell|more|please|details|about|explain|what|how|show|i|me|want|interested|know)$/i, '')
                .trim();
        }

        // If no course name extracted and history exists, search history
        // This catches all implicit references (this, that, there, it, etc.) without needing exhaustive keyword lists
        if (!extractedCourseName && conversationHistory.length > 0) {
            console.log('[Hybrid] No course in message, searching history for context');

            // Iterate back to find the most recent course name
            // Limit to last 3 messages (user -> bot -> user) to prevent "sticky" context from previous topics
            for (const msg of [...conversationHistory].reverse().slice(0, 3)) {

                // Look for course-like patterns in past assistant or user messages
                // Matches: "Diploma in X", "Foundation in X", "A-Levels", "MUFY", "AUSMAT"
                const historyMatch = msg.content.match(/(diploma|foundation|a-levels?|mufy|ausmat|cambridge)\s+(?:in|of)?[^.!?,;]*?(?=\s+(?:is|by|at|from|was|has|can|will|would|,|\.|\!|\?)|\s*$)/i);

                // If found, extract course name and clean it up
                if (historyMatch) {
                    extractedCourseName = historyMatch[0].trim()
                        // Remove trailing sentence fragments and noise
                        .replace(/\s+(is|by|at|from|was|has|can|will|would|should|could|a|an|the|your|our|this|that|which|offered|recommended|great|good|perfect|excellent).*$/i, '')
                        .replace(/\s+(elaborate|tell|more|please|details|about|explain)$/i, '')
                        .trim();

                    // Validate: must be at least 2 words (e.g., "Diploma in" alone is not enough)
                    if (extractedCourseName.split(/\s+/).length >= 3 || /mufy|ausmat|a-levels?|cambridge/i.test(extractedCourseName)) {
                        console.log('[Hybrid] Found course in history:', extractedCourseName);
                        break;
                    } else {
                        extractedCourseName = null; // Reset if too short
                    }
                }
            }
        }

        // Detect education level queries (e.g., "show me all diplomas")
        let levelFilter: string | null = null;
        if (/a-level|a level|alevel|pre-u|pre u|pre university|cambridge|matriculation|stpm|ausmat|mufy|nottingham|wace|foundation year/i.test(truncatedMessage)) {
            levelFilter = 'General Pre-U'; // Covers: AUSMAT, MUFY, Cambridge A-Levels, Nottingham Foundation, STPM
        } else if (/\bdiplomas?\b/i.test(truncatedMessage) && !extractedCourseName) {
            levelFilter = 'Diploma';
        } else if (/\bfoundations?\b/i.test(truncatedMessage) && !extractedCourseName) {
            levelFilter = 'Foundation';
        }

        console.log('[Hybrid] Early extraction - Course:', extractedCourseName, '| Level:', levelFilter);

        // ==================================
        // Intent Classification
        // If course name found, FORCE DATA_RETRIEVAL path
        // ==================================

        // Run fast deterministic intent classifier
        const topIntent = analyzeIntent(truncatedMessage);

        // Check if we have course context
        const hasCourseContext = extractedCourseName !== null || levelFilter !== null;

        // OVERRIDE: If we have course context, go straight to DATA_RETRIEVAL, skip SYSTEM_INFO and GENERAL_CHAT
        const effectiveIntent = hasCourseContext ? ChatIntent.DATA_RETRIEVAL : topIntent;

        console.log('[Hybrid] Intent:', topIntent, '-> Effective:', effectiveIntent, '(hasCourseContext:', hasCourseContext, ')');


        // ==========================
        // FAST PATH: System Info
        // ==========================
        if (effectiveIntent === ChatIntent.SYSTEM_INFO) {

            // Pull static system info from local variable
            // Include user's personality profile if available
            const contextData = `${userRiasecContext}\n\n${SYSTEM_INFO}`;

            // Use LLM with conversation history to phrase it nicely for the user
            const responseText = await aiService.generateResponse(truncatedMessage, {
                intent: 'SYSTEM_INFO',
                data: contextData,
                conversationHistory // Pass history for context-aware responses
            });

            // Save user messages
            await AIChatMessage.create({
                conversationId: currentConversation._id,
                role: 'user',
                content: truncatedMessage
            });

            // Save assistant response (trimmed for safety)
            await AIChatMessage.create({
                conversationId: currentConversation._id,
                role: 'assistant',
                content: responseText.slice(0, 800)
            });

            // Update conversation metadata
            await AIConversation.findByIdAndUpdate(currentConversation._id, {
                lastMessageAt: new Date(),
                $inc: { messageCount: 2 }
            });

            // Return response to client (no DB search, no hybrid pipeline)
            return res.json({
                response: responseText.slice(0, 800),
                intent: 'SYSTEM_INFO',
                conversationId: currentConversation._id
            });
        }

        // ==========================
        // FAST PATH: General Chat
        // ==========================
        if (effectiveIntent === ChatIntent.GENERAL_CHAT) {

            // Use LLM with conversation history to phrase it nicely for the user
            // Include user's personality profile if available
            const response = await aiService.generateResponse(truncatedMessage, {
                intent: 'GENERAL_CHAT',
                data: `${userRiasecContext}\n\n${SYSTEM_INFO}`, // Pass full context (Gemini Large Context window can handle it)
                conversationHistory // Pass history for context-aware responses
            });

            // Save user messages
            await AIChatMessage.create({
                conversationId: currentConversation._id,
                role: 'user',
                content: truncatedMessage
            });

            // Save assistant response
            await AIChatMessage.create({
                conversationId: currentConversation._id,
                role: 'assistant',
                content: response
            });

            // Update conversation metadata
            await AIConversation.findByIdAndUpdate(currentConversation._id, {
                lastMessageAt: new Date(),
                $inc: { messageCount: 2 }
            });

            // Return response to client
            return res.json({
                response,
                intent: 'GENERAL_CHAT',
                conversationId: currentConversation._id
            });
        }

        // ==================================
        // Slow path: Data Retrieval Pipeline
        // Understand keyword, resolve ambiguity, retrieve data from database and generate response
        // ==================================

        // Filter out noise words 
        const noiseWords = [
            // Question words
            'which', 'what', 'where', 'how', 'who', 'when', 'does', 'have', 'offer', 'offers',
            'school', 'schools', 'university', 'universities', 'college', 'colleges',
            // Common verbs
            'tell', 'show', 'find', 'give', 'recommend', 'take', 'study', 'want', 'like', 'need', 'list',
            // Articles and prepositions
            'the', 'about', 'there', 'some', 'any', 'this', 'that', 'with', 'from', 'into',
            // Domain-generic words
            'courses', 'course', 'careers', 'career', 'role', 'become', 'mean', 'available'
        ];

        // Split sentence into words, remove punctuation and filter out noise words
        const rawKeywords = truncatedMessage
            .split(/\s+/)
            .map(w => w.replace(/[^a-zA-Z0-9]/g, '')) // Remove punctuation
            .filter(w => w.length > 2 && !noiseWords.includes(w.toLowerCase()));

        console.log('[Hybrid] Extracted course name:', extractedCourseName);
        console.log('[Hybrid] Raw keywords:', rawKeywords);

        // Determine deterministic intent (courses/careers/specific query)
        const deterministicDataIntent = analyzeDataIntent(truncatedMessage);

        // Check ambiguity to determine whether the query is clear enough to be handled without LLM
        const ambiguous = isAmbiguousQuery(truncatedMessage, rawKeywords, topIntent);

        // Define hybrid state variables
        let finalDataIntent = deterministicDataIntent;
        let resolvedDomain: { id: string; label: string } | null = null;
        let expandedKeywords: string[] = [];
        let usedLLM = false;

        // ==========================
        // HYBRID DECISION POINT
        // Clear query goes to deterministic logic (fast and cheap)
        // Ambiguous query gets consulted by LLM (slow and expensive)
        // ==========================

        if (!ambiguous) {
            // FAST PATH: Clear query, deterministic
            console.log('[Hybrid] Clear query - using deterministic pipeline');

            // Expand keywords via domain map (e.g. "it" → ["software", "programming", "systems"])
            rawKeywords.forEach(keyword => {
                const lowerKey = keyword.toLowerCase();
                expandedKeywords.push(keyword);

                if (DOMAIN_MAP[lowerKey]) {
                    expandedKeywords.push(...DOMAIN_MAP[lowerKey]);
                }
            });

            // Try to resolve domain using keywords
            for (const keyword of rawKeywords) {
                const domain = resolveDomain(keyword);
                if (domain) {
                    resolvedDomain = domain;
                    break; // Stop at first valid match
                }
            }

        } else {
            // SLOW PATH: Ambiguous, consult LLM
            console.log('[Hybrid] Ambiguous query - calling LLM for intent clarification');

            try {
                // Ask LLM to classify intent + domain + keywords
                const llmIntent = await aiService.analyzeIntentWithLLM(truncatedMessage);
                usedLLM = true;

                if (llmIntent.intent === 'GENERAL_CHAT' || llmIntent.intent === 'SYSTEM_INFO') {
                    // Cast to any to bypass strict Enum check since we handle it downstream
                    finalDataIntent = llmIntent.intent as any;
                    console.log(`[Hybrid] Redirection -> Logic switched to ${llmIntent.intent}`);
                } else {
                    // Map LLM intent to our enum using strict mapper
                    finalDataIntent = INTENT_MAP[llmIntent.intent] || DataIntent.SPECIFIC_QUERY;
                }

                // Use LLM keyword extraction
                expandedKeywords = llmIntent.keywords || [];

                // Resolve domain from LLM suggestion
                if (llmIntent.domain) {
                    resolvedDomain = resolveDomain(llmIntent.domain);
                }

                console.log('[Hybrid] LLM clarified:', { intent: llmIntent.intent, domain: llmIntent.domain });

                // Extra debug for domain resolution
                if (llmIntent.domain && !resolvedDomain) {
                    console.log('[Hybrid] WARNING: LLM returned domain', llmIntent.domain, 'but resolveDomain returned null');
                } else if (llmIntent.domain && resolvedDomain && resolvedDomain.id !== llmIntent.domain && resolvedDomain.label.toLowerCase() !== llmIntent.domain.toLowerCase()) {
                    console.log('[Hybrid] NOTICE: Domain mapped from', llmIntent.domain, 'to', resolvedDomain.label);
                }

            } catch (error) { // Error handling, if LLM failed, fallback to deterministic
                console.warn('[Hybrid] LLM fallback triggered:', error);
                usedLLM = false;
                // Continue with deterministic flow
            }
        }

        // ==========================
        // REDIRECT: GENERAL_CHAT & SYSTEM_INFO
        // ==========================
        if ((finalDataIntent as any) === 'GENERAL_CHAT' || (finalDataIntent as any) === 'SYSTEM_INFO') {
            // Use LLM with conversation history to phrase it nicely for the user
            // Include user's personality profile if available
            const response = await aiService.generateResponse(truncatedMessage, {
                intent: 'GENERAL_CHAT',
                data: `${userRiasecContext}\n\n${SYSTEM_INFO}`,
                conversationHistory
            });

            // Save user messages
            await AIChatMessage.create({
                conversationId: currentConversation._id,
                role: 'user',
                content: truncatedMessage,
                metadata: { intent: 'GENERAL_CHAT', usedLLM: true }
            });

            // Save assistant response
            await AIChatMessage.create({
                conversationId: currentConversation._id,
                role: 'assistant',
                content: response,
                metadata: { intent: 'GENERAL_CHAT', usedLLM: true }
            });

            // Update conversation metadata
            await AIConversation.findByIdAndUpdate(currentConversation._id, {
                lastMessageAt: new Date(),
                $inc: { messageCount: 2 }
            });

            // Return response to client
            return res.json({
                response,
                intent: 'GENERAL_CHAT',
                conversationId: currentConversation._id
            });
        }

        // ==================
        // DATABASE SEARCH
        // ==================

        // Detect institution mention (e.g., "sunway courses")
        const detectedInstitution = detectInstitution(truncatedMessage);

        // Remove institution name from keywords to prevent over-filtering
        // e.g. "taylor courses" -> institution: taylors, keywords: ["courses"] (which is noise) -> final keywords: []
        // This ensures { institutionId: "taylors" } query runs instead of { institutionId: "taylors", title: /taylor/ }
        let filteredKeywords = rawKeywords;
        if (detectedInstitution) {
            filteredKeywords = rawKeywords.filter(k => {
                const lowerK = k.toLowerCase();
                // Check if keyword is part of the institution map
                return !Object.keys(INSTITUTION_MAP).includes(lowerK) && lowerK !== detectedInstitution;
            });
        }

        // Use extracted course name OR keywords for search
        const searchTerm = extractedCourseName || filteredKeywords.join(' ');
        const keywords = expandedKeywords.length > 0 ? expandedKeywords : filteredKeywords;

        // Build simple regex for fallback (if no course name extracted)
        let searchRegex: RegExp;
        if (keywords.length > 0) {
            const safeKeywords = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            searchRegex = new RegExp(safeKeywords.join('|'), 'i');
        } else { // Match everything (fallback)
            searchRegex = /.*/i;
        }

        console.log('[Hybrid] Search term:', searchTerm, '| Institution:', detectedInstitution);

        // Initialize storage for DB results
        let careers: any[] = [];
        let courses: any[] = [];
        let usedVectorSearch = false;

        try {
            // Build course query based on extracted course name or keywords
            let courseQuery: any;
            let careerQuery: any;

            // General Pre-U query - search by level directly
            if (levelFilter) {
                console.log('[Hybrid] Using level filter for Pre-U:', levelFilter);
                if (detectedInstitution) {
                    courseQuery = { institutionId: detectedInstitution, level: levelFilter };
                } else {
                    courseQuery = { level: levelFilter };
                }
                careerQuery = { $or: [{ name: searchRegex }, { description: searchRegex }] };
            }
            // Specific course name 
            else if (extractedCourseName) {
                console.log('[Hybrid] Using direct title match for:', extractedCourseName);
                const titleRegex = new RegExp(extractedCourseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

                if (detectedInstitution) {
                    courseQuery = { institutionId: detectedInstitution, title: titleRegex };
                } else {
                    courseQuery = { title: titleRegex };
                }
                careerQuery = { name: searchRegex }; // Fall back to keyword search for careers
            }

            // Institution + keywords
            else if (detectedInstitution && keywords.length > 0) {
                courseQuery = {
                    institutionId: detectedInstitution,
                    $or: [
                        { title: searchRegex },
                        { description: searchRegex }
                    ]
                };
                careerQuery = {
                    $or: [
                        { name: searchRegex },
                        { description: searchRegex }
                    ]
                };
            }

            // Institution only
            else if (detectedInstitution) {
                courseQuery = { institutionId: detectedInstitution };
                careerQuery = { related_domains: { $exists: true } }; // Return some careers
            }

            // Keywords only
            else if (keywords.length > 0) {
                courseQuery = {
                    $or: [
                        { title: searchRegex },
                        { description: searchRegex }
                    ]
                };
                careerQuery = {
                    $or: [
                        { name: searchRegex },
                        { description: searchRegex }
                    ]
                };
            }
            // Fallback: return some courses
            else {
                courseQuery = {};
                careerQuery = {};
            }

            console.log('[Hybrid] Course query:', JSON.stringify(courseQuery));

            // Try vector search first if we have a semantic query (not level filter or institution-only)
            const canUseVectorSearch = !levelFilter && !detectedInstitution && searchTerm.length > 5;

            if (canUseVectorSearch) {
                console.log('[Hybrid] Attempting vector search for:', searchTerm);
                const embeddingResult = await embeddingService.generateEmbedding(searchTerm);

                if (!embeddingResult.usedFallback && embeddingResult.embedding) {
                    // Vector search available - use MongoDB $vectorSearch for BOTH courses and careers
                    try {
                        const vectorSearchStage = embeddingService.buildVectorSearchStage(embeddingResult.embedding);

                        // Cast to any because $vectorSearch is MongoDB Atlas-specific, not in Mongoose types
                        const [courseResults, careerResults] = await Promise.all([
                            Course.aggregate([
                                vectorSearchStage as any,
                                { $project: { title: 1, description: 1, institutionId: 1, domainIds: 1, level: 1, cost_level: 1, type: 1, difficulty: 1, duration_year: 1, campuses: 1, careers: 1, apply_url: 1, mqa_code: 1, score: { $meta: 'vectorSearchScore' } } }
                            ]),
                            Career.aggregate([
                                vectorSearchStage as any,
                                { $project: { name: 1, description: 1, salary_low: 1, salary_high: 1, demand_level: 1, riasec_code: 1, job_type: 1, work_environment: 1, education_level_required: 1, skills: 1, industry: 1, related_domains: 1, career_path: 1, related_courses: 1, score: { $meta: 'vectorSearchScore' } } }
                            ])
                        ]);

                        courses = courseResults;
                        careers = careerResults;
                        usedVectorSearch = true;
                        console.log(`[Hybrid] Vector search returned ${courses.length} courses and ${careers.length} careers`);
                    } catch (vectorError) {
                        console.warn('[Hybrid] Vector search failed, falling back to regex:', vectorError);
                        // Continue to regex fallback below
                    }
                } else {
                    console.log('[Hybrid] Embedding service fallback triggered:', embeddingResult.error);
                }
            }

            // Fallback to regex search if vector search wasn't used or failed
            if (!usedVectorSearch) {
                [careers, courses] = await Promise.all([
                    Career.find(careerQuery).select('name description salary_low salary_high demand_level riasec_code job_type work_environment education_level_required skills industry related_domains career_path related_courses').limit(5),
                    Course.find(courseQuery).select('title description institutionId domainIds level cost_level type difficulty duration_year campuses careers apply_url mqa_code').limit(5)
                ]);
            }
            // If vector search successful, we already have both courses and careers. No else block needed.

            // Fallback: If direct title search returned no results, try broader search
            if (courses.length === 0 && extractedCourseName && keywords.length > 0) {
                console.log('[Hybrid] Direct title search returned 0 results, trying keyword fallback');
                const fallbackQuery = {
                    $or: [
                        { title: searchRegex },
                        { description: searchRegex }
                    ]
                };
                courses = await Course.find(fallbackQuery).select('title description institutionId domainIds level cost_level type difficulty duration_year campuses careers apply_url mqa_code').limit(5);
            }

            console.log(`[Hybrid] DB Results - Institution: ${detectedInstitution || 'none'}, Careers: ${careers.length}, Courses: ${courses.length}`);
            if (courses.length > 0) {
                console.log('[Hybrid] Sample course:', courses[0]);
            }
        } catch (dbError) { // DB error handling: continue with empty results rather than crashing
            console.error('[Hybrid] DATABASE ERROR:', dbError);
        }

        // Fallback: Secondary domain-based search (if no results)
        if (careers.length === 0 && courses.length === 0 && resolvedDomain) {
            [careers, courses] = await Promise.all([
                Career.find({ related_domains: resolvedDomain.id }).select('name description salary_low salary_high demand_level riasec_code job_type work_environment education_level_required skills industry related_domains').limit(3),
                Course.find({ domainIds: resolvedDomain.id }).select('title description institutionId domainIds level cost_level type difficulty duration_year campuses careers').limit(3)
            ]);
        }

        const resultsCount = careers.length + courses.length;

        // ==========================
        // RESPONSE GENERATION
        // Determine how to response after data fetching is done
        // ==========================

        // Initialize response variables
        let responseText = '';
        let responseSource = '';

        // Logic:
        // - Extracted a course name or level filter -> Use LLM for explanation
        // - Non-English -> Use LLM for translation
        // - Only use template for pure domain exploration

        // Detect non-English text using Unicode ranges
        const isLikelyNonEnglish = /[\u4e00-\u9fff\u3040-\u30ff\u0b80-\u0bff\u0600-\u06ff]/.test(truncatedMessage);

        // Course-specific context means the user is asking about a concrete thing (e.g. "Diploma in IT", "all diplomas")
        const hasCourseSpecificContext = extractedCourseName !== null || levelFilter !== null;

        // If any of these are true, use LLM
        const shouldUseLLMResponse = hasCourseSpecificContext || isLikelyNonEnglish || resultsCount > 0;

        // Debug logging to explain why LLM or template was chosen
        console.log('[Hybrid] Response decision - CourseContext:', hasCourseSpecificContext, '| NonEnglish:', isLikelyNonEnglish, '| Results:', resultsCount, '-> UseLLM:', shouldUseLLMResponse);

        // If LLM is used (explaining courses, summarize db result, translation)
        if (shouldUseLLMResponse) {
            // LLM response
            responseSource = 'llm';

            // Build career context data with clear indicators for empty sections
            const careersContext = careers.length > 0
                ? careers.map((c: any) => {

                    // Format salary nicely
                    const salaryRange = c.salary_low && c.salary_high
                        ? `RM ${c.salary_low.toLocaleString()} - RM ${c.salary_high.toLocaleString()}`
                        : 'Salary not specified';

                    // Assemble human-readable career info
                    const parts = [
                        `- ${c.name}: ${c.description.substring(0, 150)}...`,
                        `  Salary: ${salaryRange}`,
                        `  Demand: ${c.demand_level || 'Not specified'}`,
                        `  RIASEC: ${c.riasec_code || 'Not specified'}`,
                        `  Job Type: ${c.job_type || 'Not specified'}`,
                        `  Work Environment: ${c.work_environment || 'Not specified'}`,
                        `  Education Required: ${c.education_level_required || 'Not specified'}`,
                        c.skills && c.skills.length > 0 ? `  Skills: ${c.skills.join(', ')}` : null,
                        c.industry && c.industry.length > 0 ? `  Industries: ${c.industry.join(', ')}` : null,
                        c.career_path && c.career_path.length > 0 ? `  Career Path: ${c.career_path.join(' → ')}` : null,
                        c.related_courses && c.related_courses.length > 0 ? `  Related Courses: ${c.related_courses.slice(0, 3).join(', ')}` : null
                    ].filter(Boolean);
                    return parts.join('\n');
                }).join('\n\n')
                : '(No careers found for this query)';

            // Build course context data with clear indicators for empty sections
            const coursesContext = courses.length > 0
                ? courses.map((c: any) => {

                    // Assemble human-readable course info
                    const parts = [
                        `- ${c.title} by ${c.institutionId}: ${c.description.substring(0, 150)}...`,
                        `  Level: ${c.level || 'Not specified'}`,
                        `  Cost: ${c.cost_level || 'Not specified'}`,
                        `  Type: ${c.type || 'Not specified'}`,
                        `  Duration: ${c.duration_year || 'Not specified'}`,
                        c.difficulty ? `  Difficulty: ${c.difficulty}` : null,
                        c.campuses && c.campuses.length > 0 ? `  Campuses: ${c.campuses.join(', ')}` : null,
                        c.mqa_code ? `  MQA Code: ${c.mqa_code}` : null,
                        c.apply_url ? `  Apply: ${c.apply_url}` : null,
                        c.careers && c.careers.length > 0 ? `  Leads to Careers: ${c.careers.slice(0, 3).join(', ')}` : null
                    ].filter(Boolean); // Remove nulls
                    return parts.join('\n');
                }).join('\n\n')
                : '(No courses found for this query)';

            console.log('[Hybrid] Courses in context:', courses.map((c: any) => c.title));

            // Build final context data sent to LLM
            // Has personality test results, courses adn careers found
            // Trimmed to prevent cost explosion
            const contextData = `
${userRiasecContext}

[FOUND CAREERS]
${careersContext}

[FOUND COURSES]
${coursesContext}
      `.slice(0, 2500);


            // Call LLM to generate natural language response
            responseText = await aiService.generateResponse(truncatedMessage, {
                intent: finalDataIntent,
                data: contextData,
                conversationHistory // Pass history for context
            });

            // Safety trim (UI / DB protection)
            responseText = responseText.slice(0, 800);

        } else {
            // Deterministic template for broad queries (e.g. "What can i do in IT? ")
            responseSource = 'template';
            responseText = buildDiscoveryResponse(finalDataIntent, resolvedDomain, courses, careers);
        }

        // ==========================
        // SAVE MESSAGES TO DATABASE
        // For conversation continuity via context, analytics and debugging
        // ==========================

        // Calculate latency
        const latencyMs = Date.now() - startTime;

        // Save user message
        await AIChatMessage.create({
            conversationId: currentConversation._id,
            role: 'user',
            content: truncatedMessage,
            metadata: {
                intent: finalDataIntent,
                usedLLM: ambiguous
            }
        });

        // Save assistant response
        await AIChatMessage.create({
            conversationId: currentConversation._id,
            role: 'assistant',
            content: responseText,
            metadata: {
                intent: finalDataIntent,
                resultsFound: resultsCount,
                usedLLM,
                latencyMs
            }
        });

        // Update conversation metadata
        await AIConversation.findByIdAndUpdate(currentConversation._id, {
            lastMessageAt: new Date(),
            $inc: { messageCount: 2 }
        });

        // ===================
        // ANALYTICS LOGGING
        // Helps evaulate LLM usage rate, ambiguity detection accuracy and performance
        // ===================

        console.log('[Hybrid Analytics]', {
            ambiguous,
            usedLLM,
            deterministicIntent: deterministicDataIntent,
            finalIntent: finalDataIntent,
            responseSource,
            resolvedDomain: resolvedDomain?.label || 'none',
            resultsFound: resultsCount,
            latency: `${Date.now() - startTime}ms`
        });

        // Final API response
        res.json({
            response: responseText,
            intent: finalDataIntent,
            domain: resolvedDomain?.label,
            conversationId: currentConversation._id
        });

    } catch (error) { // Error handling middleware
        next(error);
    }
};
