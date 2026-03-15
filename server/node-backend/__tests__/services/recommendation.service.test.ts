// recommendation.service.test.ts
// Tests for recommendation service: RIASEC affinity calculation (inline) and course filtering

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { recommendationService } from '../../src/services/recommendation.service';

// Mock domain data with riasecProfile
jest.mock('../../src/data/domains', () => ({
    interestDomains: [
        {
            id: 'math', label: 'Mathematics',
            riasecProfile: { primary: ['I', 'C'], secondary: ['R'] },
            matchExplanation: 'Good fit for math'
        },
        {
            id: 'art', label: 'Arts',
            riasecProfile: { primary: ['A', 'S'], secondary: ['E'] },
            matchExplanation: 'Good fit for art'
        }
    ]
}));

jest.mock('../../src/data/courses', () => ({
    courses: [
        { id: 'c1', title: 'Calculus', domainIds: ['math'], institutionId: 'inst1' },
        { id: 'c2', title: 'Painting', domainIds: ['art'], institutionId: 'inst1' }
    ]
}));

jest.mock('../../src/data/institutions', () => ({
    institutions: [
        { id: 'inst1', name: 'Test Uni' }
    ]
}));

describe('Recommendation Service', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Test 1: Calculate Domain Affinity (inline — no Python call)
    it('should calculate domain affinity scores inline', async () => {
        const mockScores = [
            { type: 'I', score: 10 },
            { type: 'C', score: 8 },
            { type: 'R', score: 3 },
            { type: 'A', score: 2 },
            { type: 'S', score: 1 },
            { type: 'E', score: 0 }
        ];

        const result = await recommendationService.calculateDomainAffinity(mockScores as any);

        // Math: I(10)*2 + C(8)*2 + R(3)*1 = 39
        // Art:  A(2)*2 + S(1)*2 + E(0)*1  = 6
        expect(result).toHaveLength(2);
        expect(result[0].domain.id).toBe('math');
        expect(result[0].score).toBe(39);
        expect(result[1].domain.id).toBe('art');
        expect(result[1].score).toBe(6);
    });

    // Test 2: Results are sorted descending
    it('should return domains sorted by score descending', async () => {
        const mockScores = [
            { type: 'A', score: 10 },
            { type: 'S', score: 8 },
            { type: 'E', score: 5 },
            { type: 'I', score: 1 },
            { type: 'C', score: 0 },
            { type: 'R', score: 0 }
        ];

        const result = await recommendationService.calculateDomainAffinity(mockScores as any);

        // Art:  A(10)*2 + S(8)*2 + E(5)*1 = 41
        // Math: I(1)*2  + C(0)*2 + R(0)*1 = 2
        expect(result[0].domain.id).toBe('art');
        expect(result[0].score).toBe(41);
        expect(result[1].domain.id).toBe('math');
        expect(result[1].score).toBe(2);
    });

    // Test 3: Get Recommendations (Frontend Logic)
    it('should filter courses based on top domains', () => {
        const topDomains = [{ id: 'math', label: 'Mathematics' }];

        const result = recommendationService.getRecommendations(topDomains as any);

        // Should return only math courses
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('c1');
        expect(result[0].title).toBe('Calculus');

        // Check filtering (Art course excluded)
        expect(result.find((c: { id: string }) => c.id === 'c2')).toBeUndefined();

        // Check hydration
        expect(result[0].institution).toBeDefined();
        expect(result[0].institution!.name).toBe('Test Uni');
    });
});
