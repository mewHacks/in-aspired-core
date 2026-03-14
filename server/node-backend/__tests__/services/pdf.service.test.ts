import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { PdfService } from '../../src/services/pdf.service';
import User from '../../src/models/User';
import Result from '../../src/models/Result';
import Career from '../../src/models/Career';
import puppeteer from 'puppeteer';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock Dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/models/Result');
jest.mock('../../src/models/Career');
jest.mock('puppeteer');
jest.mock('@google/generative-ai');

describe('PdfService', () => {
    let pdfService: PdfService;
    let mockPage: any;
    let mockBrowser: any;

    beforeEach(() => {
        jest.clearAllMocks();
        pdfService = new PdfService();

        // Setup Puppeteer Mocks
        mockPage = {
            setDefaultNavigationTimeout: jest.fn(),
            goto: jest.fn().mockResolvedValue(undefined as never),
            setContent: jest.fn().mockResolvedValue(undefined as never),
            pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content') as never),
        };

        mockBrowser = {
            newPage: jest.fn().mockResolvedValue(mockPage as never),
            close: jest.fn().mockResolvedValue(undefined as never),
        };

        (puppeteer.launch as any) = jest.fn().mockResolvedValue(mockBrowser as never);

        // Setup Gemini Mocks
        const mockGenerateContent = jest.fn().mockResolvedValue({
            response: {
                text: () => JSON.stringify({
                    mirror: 'Mocked mirror content',
                    structure: 'Mocked structure',
                    gap: 'Mocked gap',
                    suppression: 'Mocked suppression'
                })
            }
        } as never);

        const mockGetGenerativeModel = jest.fn().mockReturnValue({
            generateContent: mockGenerateContent
        });

        (GoogleGenerativeAI as any).prototype.getGenerativeModel = mockGetGenerativeModel;
    });

    it('should generate a PDF report and CACHE the AI insight if not present', async () => {
        const userId = 'user123';
        const transactionId = 'trans456';
        const resultId = 'result789';

        // Mock Database Responses
        (User.findById as any).mockResolvedValue({
            _id: userId,
            name: 'Test User',
            avatar: 'http://example.com/avatar.png',
        });

        (Result.findOne as any).mockReturnValue({
            sort: (jest.fn() as any).mockResolvedValue({
                _id: resultId,
                userId,
                scores: [
                    { type: 'R', score: 80 },
                    { type: 'I', score: 70 },
                    { type: 'A', score: 60 },
                    { type: 'S', score: 50 },
                    { type: 'E', score: 40 },
                    { type: 'C', score: 30 },
                ],
                topDomains: [{ label: 'Technology' }],
                recommendedCourses: [{ title: 'CS101', institution: { name: 'Uni' } }],
                // aiInsight is missing
            } as any)
        });

        (Result.findByIdAndUpdate as any).mockResolvedValue({});
        (Career.find as any).mockReturnValue({
            select: (jest.fn() as any).mockResolvedValue([
                { name: 'Data Analyst', description: 'Analyze data trends and produce actionable insights.', riasec_code: 'IAC', salary_low: 3000, salary_high: 6000, demand_level: 'High', education_level_required: 'Degree' },
                { name: 'UX Researcher', description: 'Study user behavior to improve product experiences.', riasec_code: 'IAS', salary_low: 3500, salary_high: 7000, demand_level: 'Medium', education_level_required: 'Degree' },
                { name: 'QA Analyst', description: 'Test systems to ensure quality and reliability.', riasec_code: 'IRC', salary_low: 2800, salary_high: 5200, demand_level: 'Medium', education_level_required: 'Diploma' }
            ])
        });

        const pdfBuffer = await pdfService.generateReport(userId, transactionId);

        // Verifications
        expect(User.findById).toHaveBeenCalledWith(userId);
        expect(Result.findOne).toHaveBeenCalledWith({ userId });
        
        // Should have called Gemini because cache was empty
        expect(GoogleGenerativeAI).toHaveBeenCalled();
        
        // Should have cached the result
        expect(Result.findByIdAndUpdate).toHaveBeenCalledWith(resultId, expect.objectContaining({
            aiInsight: expect.objectContaining({
                mirror: 'Mocked mirror content'
            })
        }));

        expect(puppeteer.launch).toHaveBeenCalled();
        expect(pdfBuffer.toString()).toBe('mock-pdf-content');
    });

    it('should USE CACHED AI insight if available (saving credits)', async () => {
        const userId = 'user_cached';
        const transactionId = 'trans_cached';

        (User.findById as any).mockResolvedValue({ _id: userId, name: 'Cached User' });

        (Result.findOne as any).mockReturnValue({
            sort: (jest.fn() as any).mockResolvedValue({
                userId,
                scores: [
                    { type: 'R', score: 80 },
                    { type: 'I', score: 70 },
                    { type: 'A', score: 60 },
                    { type: 'S', score: 50 },
                    { type: 'E', score: 40 },
                    { type: 'C', score: 30 },
                ],
                aiInsight: {
                    mirror: 'Existing cached insight',
                    structure: 's',
                    gap: 'g',
                    suppression: 'supp'
                }
            } as any)
        });
        (Career.find as any).mockReturnValue({
            select: (jest.fn() as any).mockResolvedValue([])
        });

        await pdfService.generateReport(userId, transactionId);

        // Verification: Gemini should NOT be called
        const mockGetGenerativeModel = (GoogleGenerativeAI as any).prototype.getGenerativeModel;
        expect(mockGetGenerativeModel).not.toHaveBeenCalled();
        
        // Result.findByIdAndUpdate (caching call) should NOT be called
        expect(Result.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should throw error if user is not found', async () => {
        (User.findById as any).mockResolvedValue(null);

        await expect(pdfService.generateReport('nonexistent', 'trans123'))
            .rejects.toThrow('User not found');
    });

    it('should throw error if result is not found', async () => {
        (User.findById as any).mockResolvedValue({ _id: 'user123' });
        (Result.findOne as any).mockReturnValue({
            sort: (jest.fn() as any).mockResolvedValue(null as any)
        });

        await expect(pdfService.generateReport('user123', 'trans123'))
            .rejects.toThrow('Result not found');
    });
});
