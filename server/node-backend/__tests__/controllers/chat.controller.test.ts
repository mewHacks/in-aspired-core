// chat.controller.test.ts
// Tests for the hybrid intelligent chat controller
// Covers: auth, validation, action blocking, personality queries, system info, general chat, data retrieval

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

// Mock all external dependencies before imports
jest.mock('../../src/utils/intent.utils');
jest.mock('../../src/services/ai.service');
jest.mock('../../src/services/embedding.service');
jest.mock('../../src/data/systemInfo', () => ({ SYSTEM_INFO: 'Mock system info' }));
jest.mock('../../src/data/domains', () => ({
    DOMAIN_MAP: { technology: ['software', 'programming'] },
    interestDomains: [
        { id: 'technology', label: 'Technology' },
        { id: 'art', label: 'Art & Design' }
    ]
}));
jest.mock('../../src/models/Career');
jest.mock('../../src/models/Course');
jest.mock('../../src/models/AIConversation');
jest.mock('../../src/models/AIChatMessage');
jest.mock('../../src/models/Result');

import { handleChatMessage } from '../../src/controllers/chat.controller';
import { analyzeIntent, analyzeDataIntent, isAmbiguousQuery, ChatIntent, DataIntent } from '../../src/utils/intent.utils';
import { aiService } from '../../src/services/ai.service';
import { embeddingService } from '../../src/services/embedding.service';
import Career from '../../src/models/Career';
import Course from '../../src/models/Course';
import AIConversation from '../../src/models/AIConversation';
import AIChatMessage from '../../src/models/AIChatMessage';
import Result from '../../src/models/Result';

// ==============================
// Helpers
// ==============================
function buildMocks(overrides: { user?: any; body?: any } = {}) {
    const json = jest.fn();
    const status = jest.fn(() => ({ json })) as any;
    const next = jest.fn() as unknown as NextFunction;
    const res = { status, json } as unknown as Response;
    const req = {
        user: 'user' in overrides ? overrides.user : { id: 'user123' },
        body: overrides.body ?? { message: 'Hello' },
        ip: '127.0.0.1'
    } as any;
    return { req, res, next, status, json };
}

// Sets up default mocks for a conversation flow
function setupConversationMocks() {
    // AIConversation.create returns a mock conversation
    (AIConversation.create as any).mockResolvedValue({ _id: 'conv123' });

    // AIChatMessage.find returns empty history (chain: sort -> limit -> select -> lean)
    const leanMock = (jest.fn() as any).mockResolvedValue([]);
    const selectMock = (jest.fn() as any).mockReturnValue({ lean: leanMock });
    const limitMock = (jest.fn() as any).mockReturnValue({ select: selectMock });
    const sortMock = (jest.fn() as any).mockReturnValue({ limit: limitMock });
    (AIChatMessage.find as any).mockReturnValue({ sort: sortMock });

    // AIChatMessage.create for saving messages
    (AIChatMessage.create as any).mockResolvedValue({});

    // AIConversation.findByIdAndUpdate for updating metadata
    (AIConversation.findByIdAndUpdate as any).mockResolvedValue({});

    // Result.findOne — no personality results by default (chain: sort -> lean)
    const resultLeanMock = (jest.fn() as any).mockResolvedValue(null);
    const resultSortMock = (jest.fn() as any).mockReturnValue({ lean: resultLeanMock });
    (Result.findOne as any).mockReturnValue({ sort: resultSortMock });
}

// ==============================
// Main test suite
// ==============================
describe('Chat Controller - handleChatMessage', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        setupConversationMocks();
    });

    // ========================================
    // Authentication & Validation
    // ========================================
    describe('Authentication & Validation', () => {

        it('should return 401 when user is not authenticated', async () => {
            const { req, res, next, status, json } = buildMocks({ user: undefined });
            await handleChatMessage(req as Request, res, next);

            expect(status).toHaveBeenCalledWith(401);
            expect(json).toHaveBeenCalledWith({ error: 'Authentication required' });
        });

        it('should return 400 when message is missing', async () => {
            const { req, res, next, status, json } = buildMocks({ body: {} });
            await handleChatMessage(req as Request, res, next);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith({ error: 'Message is required and must be a string.' });
        });

        it('should return 400 when message is not a string', async () => {
            const { req, res, next, status, json } = buildMocks({ body: { message: 123 } });
            await handleChatMessage(req as Request, res, next);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith({ error: 'Message is required and must be a string.' });
        });

        it('should return 400 when message is empty string', async () => {
            const { req, res, next, status, json } = buildMocks({ body: { message: '' } });
            await handleChatMessage(req as Request, res, next);

            expect(status).toHaveBeenCalledWith(400);
        });
    });

    // ========================================
    // Conversation Management
    // ========================================
    describe('Conversation Management', () => {

        it('should create new conversation when no conversationId provided', async () => {
            // Set up intent mocks for GENERAL_CHAT path
            (analyzeIntent as any).mockReturnValue(ChatIntent.GENERAL_CHAT);
            (aiService.generateResponse as any).mockResolvedValue('Hello!');

            const { req, res, next } = buildMocks({ body: { message: 'Hi' } });
            await handleChatMessage(req as Request, res, next);

            // Verify conversation was created
            expect(AIConversation.create).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user123',
                title: expect.any(String)
            }));
        });

        it('should load existing conversation when conversationId provided', async () => {
            (AIConversation.findOne as any).mockResolvedValue({ _id: 'existing-conv' });
            (analyzeIntent as any).mockReturnValue(ChatIntent.GENERAL_CHAT);
            (aiService.generateResponse as any).mockResolvedValue('Hello!');

            const { req, res, next } = buildMocks({ body: { message: 'Hi', conversationId: 'existing-conv' } });
            await handleChatMessage(req as Request, res, next);

            expect(AIConversation.findOne).toHaveBeenCalledWith({
                _id: 'existing-conv',
                userId: 'user123'
            });
        });

        it('should return 403 when conversation not found or access denied', async () => {
            (AIConversation.findOne as any).mockResolvedValue(null);

            const { req, res, next, status, json } = buildMocks({ body: { message: 'Hi', conversationId: 'wrong-conv' } });
            await handleChatMessage(req as Request, res, next);

            expect(status).toHaveBeenCalledWith(403);
            expect(json).toHaveBeenCalledWith({ error: 'Conversation not found or access denied' });
        });
    });

    // ========================================
    // Action Blocking
    // ========================================
    describe('Action Blocking', () => {

        it('should block "join room" requests with a guide', async () => {
            (analyzeIntent as any).mockReturnValue(ChatIntent.GENERAL_CHAT);

            const { req, res, next, json } = buildMocks({ body: { message: 'Can you join room ABC123?' } });
            await handleChatMessage(req as Request, res, next);

            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                intent: 'ACTION_BLOCKED',
                conversationId: 'conv123'
            }));
        });

        it('should block "create room" requests with a guide', async () => {
            (analyzeIntent as any).mockReturnValue(ChatIntent.GENERAL_CHAT);

            const { req, res, next, json } = buildMocks({ body: { message: 'Please create room for me' } });
            await handleChatMessage(req as Request, res, next);

            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                intent: 'ACTION_BLOCKED'
            }));
        });

        it('should block "take test" requests with a guide', async () => {
            (analyzeIntent as any).mockReturnValue(ChatIntent.GENERAL_CHAT);

            const { req, res, next, json } = buildMocks({ body: { message: 'I want to take test' } });
            await handleChatMessage(req as Request, res, next);

            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                intent: 'ACTION_BLOCKED'
            }));
        });
    });

    // ========================================
    // Personality Query Detection
    // ========================================
    describe('Personality Query Detection', () => {

        it('should prompt user to take test when personality query but no results', async () => {
            const { req, res, next, json } = buildMocks({ body: { message: 'What suits me best?' } });
            await handleChatMessage(req as Request, res, next);

            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                intent: 'PERSONALITY_PROMPT',
                conversationId: 'conv123'
            }));
        });

        it('should enhance context when user has RIASEC profile and asks personality question', async () => {
            // Mock user having RIASEC results
            const resultLeanMock = (jest.fn() as any).mockResolvedValue({
                scores: [
                    { type: 'I', score: 90 },
                    { type: 'A', score: 80 },
                    { type: 'S', score: 70 }
                ],
                topDomains: [{ id: 'technology', label: 'Technology' }],
                recommendedCourses: []
            });
            const resultSortMock = (jest.fn() as any).mockReturnValue({ lean: resultLeanMock });
            (Result.findOne as any).mockReturnValue({ sort: resultSortMock });

            // Career.find for matching careers (chain: select -> limit -> lean)
            const careerLeanMock = (jest.fn() as any).mockResolvedValue([]);
            const careerLimitMock = (jest.fn() as any).mockReturnValue({ lean: careerLeanMock });
            const careerSelectMock = (jest.fn() as any).mockReturnValue({ limit: careerLimitMock });
            (Career.find as any).mockReturnValue({ select: careerSelectMock });

            // Should go to SYSTEM_INFO or GENERAL_CHAT path and call LLM
            (analyzeIntent as any).mockReturnValue(ChatIntent.GENERAL_CHAT);
            (aiService.generateResponse as any).mockResolvedValue('Based on your RIASEC code IAS...');

            const { req, res, next, json } = buildMocks({ body: { message: 'What career suits me based on my personality?' } });
            await handleChatMessage(req as Request, res, next);

            // Should use LLM to generate personalized response
            expect(aiService.generateResponse).toHaveBeenCalled();
            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                response: expect.stringContaining('RIASEC')
            }));
        });
    });

    // ========================================
    // System Info Path
    // ========================================
    describe('System Info Path', () => {

        it('should handle SYSTEM_INFO intent with LLM response', async () => {
            (analyzeIntent as any).mockReturnValue(ChatIntent.SYSTEM_INFO);
            (aiService.generateResponse as any).mockResolvedValue('Here is how the platform works...');

            const { req, res, next, json } = buildMocks({ body: { message: 'How do I use this platform?' } });
            await handleChatMessage(req as Request, res, next);

            expect(aiService.generateResponse).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ intent: 'SYSTEM_INFO' })
            );
            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                intent: 'SYSTEM_INFO',
                conversationId: 'conv123'
            }));
        });

        it('should save both user and assistant messages for SYSTEM_INFO', async () => {
            (analyzeIntent as any).mockReturnValue(ChatIntent.SYSTEM_INFO);
            (aiService.generateResponse as any).mockResolvedValue('System info response');

            const { req, res, next } = buildMocks({ body: { message: 'What is this?' } });
            await handleChatMessage(req as Request, res, next);

            // Should create 2 chat messages (user + assistant)
            expect(AIChatMessage.create).toHaveBeenCalledTimes(2);
            // Should update conversation metadata
            expect(AIConversation.findByIdAndUpdate).toHaveBeenCalled();
        });
    });

    // ========================================
    // General Chat Path
    // ========================================
    describe('General Chat Path', () => {

        it('should handle GENERAL_CHAT intent with LLM response', async () => {
            (analyzeIntent as any).mockReturnValue(ChatIntent.GENERAL_CHAT);
            (aiService.generateResponse as any).mockResolvedValue('Hello! How can I help you?');

            const { req, res, next, json } = buildMocks({ body: { message: 'Hello there' } });
            await handleChatMessage(req as Request, res, next);

            expect(aiService.generateResponse).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ intent: 'GENERAL_CHAT' })
            );
            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                intent: 'GENERAL_CHAT',
                response: 'Hello! How can I help you?'
            }));
        });
    });

    // ========================================
    // Data Retrieval Path
    // ========================================
    describe('Data Retrieval Path', () => {

        it('should search for courses and careers when DATA_RETRIEVAL intent detected', async () => {
            (analyzeIntent as any).mockReturnValue(ChatIntent.DATA_RETRIEVAL);
            (analyzeDataIntent as any).mockReturnValue(DataIntent.COURSE_DISCOVERY);
            (isAmbiguousQuery as any).mockReturnValue(false);

            // Embedding service (vector search not available)
            (embeddingService.generateEmbedding as any).mockResolvedValue({ usedFallback: true, embedding: null, error: 'not available' });

            // Mock Career.find chain: select -> limit
            const careerLimitMock = (jest.fn() as any).mockResolvedValue([{ name: 'Software Engineer', description: 'Develops software' }]);
            const careerSelectMock = (jest.fn() as any).mockReturnValue({ limit: careerLimitMock });
            (Career.find as any).mockReturnValue({ select: careerSelectMock });

            // Mock Course.find chain: select -> limit
            const courseLimitMock = (jest.fn() as any).mockResolvedValue([{ title: 'Diploma in IT', description: 'IT program', institutionId: 'sunway' }]);
            const courseSelectMock = (jest.fn() as any).mockReturnValue({ limit: courseLimitMock });
            (Course.find as any).mockReturnValue({ select: courseSelectMock });

            // LLM response for data context
            (aiService.generateResponse as any).mockResolvedValue('Here are some IT courses...');

            const { req, res, next, json } = buildMocks({ body: { message: 'Show me technology courses' } });
            await handleChatMessage(req as Request, res, next);

            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                response: expect.any(String),
                conversationId: 'conv123'
            }));
        });

        it('should detect institution from message and filter courses', async () => {
            (analyzeIntent as any).mockReturnValue(ChatIntent.DATA_RETRIEVAL);
            (analyzeDataIntent as any).mockReturnValue(DataIntent.COURSE_DISCOVERY);
            (isAmbiguousQuery as any).mockReturnValue(false);

            (embeddingService.generateEmbedding as any).mockResolvedValue({ usedFallback: true });

            // Mock Career.find and Course.find chains
            const careerLimitMock = (jest.fn() as any).mockResolvedValue([]);
            const careerSelectMock = (jest.fn() as any).mockReturnValue({ limit: careerLimitMock });
            (Career.find as any).mockReturnValue({ select: careerSelectMock });

            const courseLimitMock = (jest.fn() as any).mockResolvedValue([{ title: 'Foundation in Engineering', description: 'Engineering program at Sunway', institutionId: 'sunway' }]);
            const courseSelectMock = (jest.fn() as any).mockReturnValue({ limit: courseLimitMock });
            (Course.find as any).mockReturnValue({ select: courseSelectMock });

            (aiService.generateResponse as any).mockResolvedValue('Sunway offers Foundation in Engineering...');

            const { req, res, next, json } = buildMocks({ body: { message: 'What courses does sunway offer?' } });
            await handleChatMessage(req as Request, res, next);

            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                response: expect.stringContaining('Sunway')
            }));
        });
    });

    // ========================================
    // Error Handling
    // ========================================
    describe('Error Handling', () => {

        it('should call next(error) on unexpected errors', async () => {
            // Force AIConversation.create to throw
            (AIConversation.create as any).mockRejectedValue(new Error('DB connection lost'));

            const { req, res, next } = buildMocks({ body: { message: 'Hello' } });
            await handleChatMessage(req as Request, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    // ========================================
    // Message Truncation
    // ========================================
    describe('Message Truncation', () => {

        it('should truncate messages longer than 500 characters', async () => {
            (analyzeIntent as any).mockReturnValue(ChatIntent.GENERAL_CHAT);
            (aiService.generateResponse as any).mockResolvedValue('Truncated response');

            const longMessage = 'a'.repeat(600);
            const { req, res, next } = buildMocks({ body: { message: longMessage } });
            await handleChatMessage(req as Request, res, next);

            // The LLM should receive at most 500 chars
            const callArgs = (aiService.generateResponse as any).mock.calls[0];
            expect(callArgs[0].length).toBeLessThanOrEqual(500);
        });
    });
});
