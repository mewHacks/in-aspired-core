// Recommendation controller — generates RIASEC-based domain/course recommendations, saves results, and matches careers
import { Request, Response } from 'express'; // Import Express types
import Result from '../models/Result'; // Import Mongoose model
import User from '../models/User'; // Import User model
import Career from '../models/Career'; // Import Career model for RIASEC matching
import { courses } from '../data/courses'; // Import static course data
import { interestDomains } from '../data/domains'; // Import static domain data
import { institutions } from '../data/institutions'; // Import static institution data
import { AuthenticatedRequest } from '../types/express'; // Import custom request type
import { codeToVector, scoresToVector, normalizeVector, cosineSimilarity } from '../utils/riasec.utils';
import { RiasecScore, InterestDomain, Course, Institution } from '../types/education';

// Weights for RIASEC scoring (same algorithm as recommendation.service.ts)
const PRIMARY_WEIGHT = 2.0;
const SECONDARY_WEIGHT = 1.0;

// Generate domain rankings and course recommendations from RIASEC personality scores
export const getRecommendations = async (req: Request, res: Response) => {
    try {
        // Extract scores from request body
        const { scores } = req.body;
        console.log('--- START RECOMMENDATION ---');
        console.log('1. Received scores:', scores?.length);

        // Validate input
        if (!scores || !Array.isArray(scores) || scores.length === 0) {
            return res.status(400).json({ message: 'Scores are required' }); // Return 400 if missing
        }

        // 1. Calculate RIASEC affinity inline
        const scoreMap: Record<string, number> = {};
        for (const s of scores as RiasecScore[]) {
            scoreMap[s.type] = s.score;
        }

        const rankedDomains = interestDomains.map((domain: InterestDomain) => {
            let score = 0;
            for (const t of domain.riasecProfile.primary) {
                score += (scoreMap[t] || 0) * PRIMARY_WEIGHT;
            }
            for (const t of domain.riasecProfile.secondary) {
                score += (scoreMap[t] || 0) * SECONDARY_WEIGHT;
            }
            return {
                domainId: domain.id,
                score: Math.round(score * 100) / 100,
                matchExplanation: domain.matchExplanation || ''
            };
        }).sort((a: { score: number }, b: { score: number }) => b.score - a.score);

        console.log('2. Ranked domains calculated:', rankedDomains.length, 'items');

        // 2. Process Data (Hybrid Approach)
        // Slice top 3 domains
        const topRanked = rankedDomains.slice(0, 3);
        const topDomainIds = topRanked.map((d: { domainId: string }) => d.domainId);
        console.log('3. Top Domain IDs:', topDomainIds);

        // Hydrate top domains with full static data (label, description)
        const topDomains = topRanked.map((rankedItem: { domainId: string; score: number; matchExplanation: string }) => {
            const staticDomain = interestDomains.find((d: InterestDomain) => d.id === rankedItem.domainId);
            if (!staticDomain) console.warn('Warning: Domain not found:', rankedItem.domainId);
            return {
                ...staticDomain,
                matchExplanation: rankedItem.matchExplanation,
                affinityScore: rankedItem.score
            };
        }).filter((d: any): d is InterestDomain => d && d.id); // Filter out any that weren't found (safety)
        console.log('4. Top Domains Hydrated:', topDomains.length);

        // Filter and map courses
        // We find courses that match the user's top domains and attach institution details
        const recommendedCourses = courses
            .filter((course: Course) => course.domainIds.some((id: string) => topDomainIds.includes(id)))
            .map((course: Course) => {
                const institution = institutions.find((inst: Institution) => inst.id === course.institutionId);
                return {
                    ...course,
                    institution
                };
            });
        console.log('5. Recommended Courses:', recommendedCourses.length);

        // Return final JSON response
        res.json({
            rankedDomains,
            topDomains,
            recommendedCourses
        });

    } catch (error) {
        console.error('Recommendation Error:', error);

        // Return 502 error if calculation fails
        res.status(502).json({
            message: 'Failed to generate recommendations',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// --- Persistence ---

// Save the authenticated user's RIASEC result (scores, domains, courses) to MongoDB
export const saveResult = async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('--- SAVE RESULT HIT ---');
        // specific check for user authentication
        if (!req.user) {
            console.log('Save Result: Unauthorized (No User)');
            return res.status(401).json({ message: 'Unauthorized' });
        }
        console.log('Save Result: User ID:', req.user.id);

        const { scores, topDomains, recommendedCourses } = req.body;
        console.log('Save Result: Payload:', {
            scoresLen: scores?.length,
            topDomainsLen: topDomains?.length,
            coursesLen: recommendedCourses?.length
        });

        // Create new Result document
        const newResult = new Result({
            userId: req.user.id,
            scores,
            topDomains,
            recommendedCourses
        });

        // Award "Self Explorer" badge for completing the RIASEC personality test if not present
        const user = await User.findById(req.user!.id);
        if (user) {
            if (!user.badges) user.badges = [];
            if (!user.badges.includes('self-explorer')) {
                user.badges.push('self-explorer');
                await user.save();
                console.log(`[BADGE] Awarded 'self-explorer' to user ${user.id}`);
            }
        }

        // Save to database
        const saved = await newResult.save();
        console.log('Save Result: Success. ID:', saved._id);

        res.status(201).json({ message: 'Result saved successfully', result: newResult });
    } catch (error) { // Error handling
        console.error('Save Result Error:', error);
        res.status(500).json({ message: 'Failed to save result' });
    }
};

// Retrieve the most recent RIASEC result for the authenticated user
export const getLatestResult = async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('--- GET LATEST RESULT HIT ---');
        // specific check for user authentication
        if (!req.user) {
            console.log('Get Latest: Unauthorized');
            return res.status(401).json({ message: 'Unauthorized' });
        }
        console.log('Get Latest: User ID:', req.user.id);

        // Query database: Find the most recent result for this user
        const latestResult = await Result.findOne({ userId: req.user.id })
            .sort({ createdAt: -1 }) // Sort by newest first
            .limit(1); // Get only one

        if (!latestResult) {
            console.log('Get Latest: No result found in DB.');
            return res.status(404).json({ message: 'No results found' });
        }
        console.log('Get Latest: Found result ID:', latestResult._id);

        // Return in the format the frontend expects (ResultState part)
        // We reconstruct the "results" object
        res.json({
            results: {
                topDomains: latestResult.topDomains,
                recommendedCourses: latestResult.recommendedCourses,
                rankedDomains: [] // Empty array as we don't store full ranking in this view
            },
            scores: latestResult.scores
        });

    } catch (error) {
        console.error('Fetch Result Error:', error);
        res.status(500).json({ message: 'Failed to fetch result' });
    }
};

// --- RIASEC Career Matching ---

// Match user RIASEC scores against career RIASEC codes using cosine similarity
// Returns top 6 careers with similarity >= 0.5
export const getMatchingCareers = async (req: Request, res: Response) => {
    try {
        console.log('--- CAREER MATCHING START ---');

        // Get user scores from request body
        const { scores } = req.body;

        // Validate input
        if (!scores || !Array.isArray(scores) || scores.length === 0) {
            return res.status(400).json({ message: 'RIASEC scores are required' });
        }

        // Convert user scores to normalized vector
        const userVector = scoresToVector(scores);
        console.log('1. User vector:', userVector);

        // Create dynamic domain ID to label mapping from official domains list
        const domainLabels: Record<string, string> = {};
        interestDomains.forEach((domain: InterestDomain) => {
            domainLabels[domain.id] = domain.label;
        });

        // Fetch all careers with riasec_code
        const careers = await Career.find({
            riasec_code: { $exists: true, $ne: '' },
            isArchived: { $ne: true }
        }).select('id name description riasec_code salary_low salary_high demand_level industry related_domains');

        console.log('2. Found careers with RIASEC codes:', careers.length);

        // Calculate similarity for each career
        const rankedCareers = careers.map(career => {

            // Convert career code to vector
            const careerVector = codeToVector(career.riasec_code);

            // Normalize career vector
            const normalizedCareerVector = normalizeVector(careerVector);

            // Calculate similarity
            const similarity = cosineSimilarity(userVector, normalizedCareerVector);

            // Map domain IDs to full labels, deduplicate, and handle missing labels
            const uniqueLabels = new Set<string>();
            (career.related_domains || []).forEach((id: string) => {
                // Legacy Safety Net: Map old IDs to official ones before looking up label
                let sanitizedId = id;
                if (id === 'science' || id === 'math' || id === 'pharmacy') sanitizedId = 'health';
                if (id === 'education' || id === 'psychology') sanitizedId = 'social_sciences';
                if (id === 'agriculture') sanitizedId = 'environment';
                if (id === 'culinary') sanitizedId = 'hospitality';

                const label = domainLabels[sanitizedId] || id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                uniqueLabels.add(label);
            });

            const relatedDomainLabels = Array.from(uniqueLabels).slice(0, 2);

            // Return career object with similarity
            return {
                career: {
                    id: career.id,
                    name: career.name,
                    description: career.description,
                    riasec_code: career.riasec_code,
                    salary_low: career.salary_low,
                    salary_high: career.salary_high,
                    demand_level: career.demand_level,
                    industry: career.industry,
                    related_domains: relatedDomainLabels
                },
                similarity: Math.round(similarity * 100) / 100 // Round to 2 decimals
            };
        });

        // Filter by threshold (>= 0.5) and sort by similarity
        const MIN_SIMILARITY = 0.5;
        const TOP_COUNT = 6;
        const MIN_RESULTS = 3; // Safety: always show at least this many in case user gets match < 0.5 (low match)

        // Sort all careers by similarity descending first
        rankedCareers.sort((a, b) => b.similarity - a.similarity);

        // Try to get careers meeting the threshold
        let topCareers = rankedCareers.filter(r => r.similarity >= MIN_SIMILARITY);

        // If we have fewer than minimum results, just take the top ones regardless of score
        if (topCareers.length < MIN_RESULTS) {
            console.log(`Safety net triggered: Found ${topCareers.length} matches >= ${MIN_SIMILARITY}, falling back to top ${MIN_RESULTS}`);
            topCareers = rankedCareers.slice(0, MIN_RESULTS);
        } else {
            // Otherwise, limit to top count
            topCareers = topCareers.slice(0, TOP_COUNT);
        }

        console.log('3. Top careers to return:', topCareers.length);

        // Return the top careers
        res.json({
            careers: topCareers,
            totalMatched: topCareers.length
        });

    } catch (error) { // Error handling
        console.error('Career Matching Error:', error);
        res.status(500).json({
            message: 'Failed to match careers',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
