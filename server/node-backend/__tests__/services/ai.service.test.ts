// ai.service.test.ts
// Tests for the Gemini AI service layer
// Verifies LLM intent analysis (JSON parsing, code-block handling, schema validation, caching)
// and response generation (context injection, conversation history formatting)

import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';

// Define mock output function used inside the factory
const mockGenerateContent = jest.fn();

// Mock the module. Logic:
// 1. GoogleGenerativeAI is a class constructor (jest.fn)
// 2. It returns an instance
// 3. The instance has getGenerativeModel (jest.fn)
// 4. getGenerativeModel returns an object with generateContent (our spy)
jest.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => {
            return {
                getGenerativeModel: () => ({ // Plain function to survive resetMocks
                    generateContent: mockGenerateContent
                })
            };
        })
    };
});

describe('AI Service', () => {
    let aiService: any;

    beforeAll(async () => {
        // Dynamic import ensures the module loads AFTER the mock is set up.
        // This avoids issues where top-level "new GoogleGenerativeAI()" runs before our mock is ready.
        const module = await import('../../src/services/ai.service');
        aiService = module.aiService;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGenerateContent.mockReset(); // Clear previous behaviors
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    // Test suite for analyzeIntentWithLLM
    describe('analyzeIntentWithLLM', () => {

        // Test 1: Valid JSON response
        it('should call Gemini API and parse valid JSON response', async () => {
            const mockResponse = {
                response: {
                    text: () => JSON.stringify({
                        intent: 'COURSE_DISCOVERY',
                        domain: 'computing',
                        keywords: ['programming']
                    })
                }
            };
            (mockGenerateContent as any).mockResolvedValue(mockResponse);

            const result = await aiService.analyzeIntentWithLLM('I want to learn coding');

            expect(mockGenerateContent).toHaveBeenCalled();
            expect(result).toEqual({
                intent: 'COURSE_DISCOVERY',
                domain: 'computing',
                keywords: ['programming']
            });
        });

        // Test 2: Code-blocked JSON response
        it('should handle code-blocked JSON response', async () => {
            const mockResponse = {
                response: {
                    text: () => "```json\n" + JSON.stringify({
                        intent: 'CAREER_DISCOVERY',
                        domain: null,
                        keywords: ['jobs']
                    }) + "\n```"
                }
            };
            (mockGenerateContent as any).mockResolvedValue(mockResponse);

            const result = await aiService.analyzeIntentWithLLM('what jobs are there');

            expect(result.intent).toBe('CAREER_DISCOVERY');
        });

        // Test 3: Invalid intent schema
        it('should throw error for invalid intent schema', async () => {
            const mockResponse = {
                response: {
                    text: () => JSON.stringify({
                        intent: 'INVALID_INTENT_NAME', // Invalid
                        domain: null,
                        keywords: []
                    })
                }
            };
            (mockGenerateContent as any).mockResolvedValue(mockResponse);

            // Expect the service wrapper to log error and throw its own generic error
            await expect(aiService.analyzeIntentWithLLM('bad input'))
                .rejects.toThrow('LLM intent analysis failed');
        });

        // Test 4: Cache results for identical queries
        it('should cache results for identical queries', async () => {
            const mockResponse = {
                response: {
                    text: () => JSON.stringify({
                        intent: 'GENERAL_CHAT',
                        domain: null,
                        keywords: []
                    })
                }
            };
            (mockGenerateContent as any).mockResolvedValue(mockResponse);

            // First call
            await aiService.analyzeIntentWithLLM('hello unique 123');
            expect(mockGenerateContent).toHaveBeenCalledTimes(1);

            // Second call (should hit cache)
            await aiService.analyzeIntentWithLLM('hello unique 123');
            expect(mockGenerateContent).toHaveBeenCalledTimes(1);
        });
    });

    // Test suite for generateResponse
    describe('generateResponse', () => {

        // Test 1: Generate response using context
        it('should generate response using context', async () => {
            const mockResponse = {
                response: {
                    text: () => "Here is a recommendation."
                }
            };
            (mockGenerateContent as any).mockResolvedValue(mockResponse);

            const response = await aiService.generateResponse('tell me about this', {
                intent: 'COURSE_DISCOVERY',
                data: 'Course: Computer Science'
            });

            expect(response).toBe("Here is a recommendation.");
            expect(mockGenerateContent).toHaveBeenCalledWith(
                expect.stringContaining('CONTEXT DATA:\nCourse: Computer Science')
            );
        });

        // Test 2: Format conversation history correctly
        it('should format conversation history correctly', async () => {
            const mockResponse = {
                response: {
                    text: () => "Response."
                }
            };
            (mockGenerateContent as any).mockResolvedValue(mockResponse);

            await aiService.generateResponse('follow up', {
                intent: 'GENERAL_CHAT',
                conversationHistory: [
                    { role: 'user', content: 'hi' },
                    { role: 'assistant', content: 'hello' }
                ]
            });

            expect(mockGenerateContent).toHaveBeenCalledWith(
                expect.stringContaining('USER: hi\nASSISTANT: hello')
            );
        });
    });
});
