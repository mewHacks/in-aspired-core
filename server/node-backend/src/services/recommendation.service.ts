// recommendation.service.ts — Calculates RIASEC-based domain affinity scores
// and returns ranked course/institution recommendations for a user's quiz results.
import { interestDomains } from '../data/domains';
import { courses } from '../data/courses';
import { institutions } from '../data/institutions';
import { RiasecScore, InterestDomain, Course, Institution, RiasecType, DomainScore } from '../types/education';

// Weights for RIASEC domain scoring
const PRIMARY_WEIGHT = 2.0;
const SECONDARY_WEIGHT = 1.0;

// Service layer for recommendation logic
export const recommendationService = {

    // Calculate RIASEC domain affinity scores using weighted matching.
    // Algorithm: For each domain, sum (user score × weight) for primary and secondary RIASEC types.
    calculateDomainAffinity: async (userScores: RiasecScore[]): Promise<DomainScore[]> => {
        // Build a lookup map: { R: 5, I: 8, A: 3, ... }
        const scoreMap: Record<string, number> = {};
        for (const s of userScores) {
            scoreMap[s.type] = s.score;
        }

        // Score every domain
        const scored = interestDomains.map(domain => {
            let score = 0;

            // Primary types contribute with higher weight
            for (const t of domain.riasecProfile.primary) {
                score += (scoreMap[t] || 0) * PRIMARY_WEIGHT;
            }
            // Secondary types contribute with lower weight
            for (const t of domain.riasecProfile.secondary) {
                score += (scoreMap[t] || 0) * SECONDARY_WEIGHT;
            }

            return {
                domain: { ...domain },
                score: Math.round(score * 100) / 100 // Round to 2 decimals
            } as DomainScore;
        });

        // Sort descending by score
        scored.sort((a, b) => b.score - a.score);

        return scored;
    },

    // Function to get recommended courses + institutions based on top interest domains
    // Pure frontend logic
    getRecommendations: (topDomains: InterestDomain[]) => {

        // Extract domain ID
        const topDomainIds = topDomains.map(d => d.id);

        // Filter courses that match ANY of the top domains
        // (a course can belong to multiple domains)
        const matchingCourses = courses.filter(course =>
            course.domainIds.some((id: string) => topDomainIds.includes(id))
        );

        // Hydrate with institution data (optional, but helpful for UI)
        const hydratedCourses = matchingCourses.map(course => {
            const institution = institutions.find(Inst => Inst.id === course.institutionId);
            return {
                ...course,
                institution
            };
        });

        return hydratedCourses; // Return value
    }
};
