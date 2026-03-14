// career.controller.test.ts
// Tests for career management: fetching careers, fetching by ID, updating, and deleting

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Auto-mock the module to prevent hoisting issues
jest.mock('../../src/models/Career');

import { Request, Response } from 'express';
import * as careerController from '../../src/controllers/career.controller';
import Career from '../../src/models/Career';

// Main test suite
describe('Career Controller', () => {

    // Initialize reusable request/response mocks
    let req: Partial<Request>;
    let res: Partial<Response>;
    let json: jest.Mock;
    let status: jest.Mock;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        // Mock res.json()
        json = jest.fn();

        // Mock res.status() which returns object with json method
        status = jest.fn(() => ({ json }));

        // Construct mock response object
        res = { status, json } as any;

        // Construct mock request object
        req = { query: {}, params: {}, body: {} };

        // Mock the constructor implementation for new Career(...)
        (Career as unknown as jest.Mock).mockImplementation((data: any) => ({
            ...data,
            save: (jest.fn() as any).mockResolvedValue(true)
        }));

        // Mock static methods
        (Career as any).find = jest.fn();
        (Career as any).findOne = jest.fn();
        (Career as any).findOneAndUpdate = jest.fn();
        (Career as any).findOneAndDelete = jest.fn();
        (Career as any).create = jest.fn();
    });

    // ========================================
    // GET Operations
    // ========================================
    describe('GET Operations', () => {

        // Test 1: Fetch all careers with sorting
        it('should return list of all careers', async () => {
            const mockCareers = [{ name: 'Engineer' }];

            // Mock chain: find() -> sort()
            const sortMock = (jest.fn() as any).mockResolvedValue(mockCareers);
            (Career.find as any).mockReturnValue({ sort: sortMock });

            // Call controller
            await careerController.getAllCareers(req as Request, res as Response);

            // Verify success response
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith(mockCareers);
        });

        // Test 2: Fetch specific career by ID
        it('should return career details if found', async () => {
            // Setup request params
            req.params = { id: 'car1' };
            const mockCareer = { id: 'car1', name: 'Dev' };

            // Mock finding career
            (Career.findOne as any).mockResolvedValue(mockCareer);

            // Call controller
            await careerController.getCareerById(req as Request, res as Response);

            // Verify response
            expect(json).toHaveBeenCalledWith(mockCareer);
        });

        // Test 3: Handle non-existent career
        it('should return 404 if career is missing', async () => {
            req.params = { id: 'missing' };

            // Mock null result
            (Career.findOne as any).mockResolvedValue(null);

            // Call controller
            await careerController.getCareerById(req as Request, res as Response);

            // Verify 404
            expect(status).toHaveBeenCalledWith(404);
        });
    });

    // ========================================
    // Admin Operations (Update/Delete)
    // ========================================
    describe('Admin Operations (Update/Delete)', () => {

        // Test 1: Update existing career using findOne + save (triggers pre-save hooks)
        it('should update career and return new document', async () => {
            req.params = { id: 'car1' };
            req.body = { name: 'Updated' };

            // Mock document returned by findOne with a save method
            const mockDoc = {
                id: 'car1',
                name: 'Original',
                save: (jest.fn() as any).mockResolvedValue({
                    id: 'car1',
                    name: 'Updated'
                })
            };
            (Career.findOne as any).mockResolvedValue(mockDoc);

            // Call controller
            await careerController.updateCareer(req as Request, res as Response);

            // Verify findOne was called with correct ID
            expect(Career.findOne).toHaveBeenCalledWith({ id: 'car1' });
            // Verify save was called (triggers pre-save embedding hook)
            expect(mockDoc.save).toHaveBeenCalled();
            expect(status).toHaveBeenCalledWith(200);
        });

        // Test 2: Delete career
        it('should delete career by ID', async () => {
            req.params = { id: 'car1' };

            // Mock findOneAndDelete success
            (Career.findOneAndDelete as any).mockResolvedValue({ id: 'car1' });

            // Call controller
            await careerController.deleteCareer(req as Request, res as Response);

            // Verify delete call
            expect(Career.findOneAndDelete).toHaveBeenCalledWith({ id: 'car1' });
            expect(status).toHaveBeenCalledWith(200);
        });

        // Test 3: Update career not found (findOne returns null)
        it('should return 404 when updating non-existent career', async () => {
            req.params = { id: 'missing' };
            req.body = { name: 'Updated' };

            // Mock null result from findOne (career not found)
            (Career.findOne as any).mockResolvedValue(null);

            // Call controller
            await careerController.updateCareer(req as Request, res as Response);

            // Verify response
            expect(status).toHaveBeenCalledWith(404);
        });

        // Test 4: Delete career not found
        it('should return 404 when deleting non-existent career', async () => {
            req.params = { id: 'missing' };

            // Mock null result
            (Career.findOneAndDelete as any).mockResolvedValue(null);

            // Call controller
            await careerController.deleteCareer(req as Request, res as Response);

            // Verify response
            expect(status).toHaveBeenCalledWith(404);
        });
    });

    // ========================================
    // Create Operation
    // ========================================
    describe('Create Operation', () => {

        // Valid mock data
        const mockCareerData = {
            id: 'new-career',
            name: 'New Career',
            description: 'Description',
            industry: ['Tech'],
            skills: ['Coding'],
            related_domains: ['Computing'],
            salary_low: 3000,
            salary_high: 5000,
            demand_level: 'High',
            education_level_required: 'Degree',
            riasec_code: 'IRC',
            masco_code: '1234'
        };

        // Test 1: Successful creation
        it('should create career successfully', async () => {
            req.body = { ...mockCareerData };

            // Mock duplicate check returning null (no duplicate)
            (Career.findOne as any).mockResolvedValue(null);

            // Call controller
            await careerController.createCareer(req as Request, res as Response);

            if (status.mock.calls.length > 0 && status.mock.calls[0][0] === 400) {
                throw new Error(`Controller returned 400: ${JSON.stringify(json.mock.calls)}`);
            }

            // Verify status called with 201 Created
            expect(status).toHaveBeenCalledWith(201);
        });

        // Test 2: Validation Failure
        it('should fail validation if required fields are missing', async () => {
            req.body = { name: 'Only Name' }; // Missing id, description, etc.

            // Call controller
            await careerController.createCareer(req as Request, res as Response);

            // Verify 400 Bad Request
            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Missing required fields' }));
        });

        // Test 3: Duplicate ID Check
        it('should fail if duplicate ID exists', async () => {
            req.body = { ...mockCareerData };

            // Mock existing career found
            (Career.findOne as any).mockResolvedValue({ id: 'new-career' });

            // Call controller
            await careerController.createCareer(req as Request, res as Response);

            // Verify 400 Bad Request
            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Career ID already exists' }));
        });

        // Test 4: Array Validation
        it('should fail if array fields are invalid', async () => {
            // Set invalid industry (string instead of array)
            req.body = { ...mockCareerData, industry: 'not-array' };

            // Call controller
            await careerController.createCareer(req as Request, res as Response);

            // Verify failure
            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'At least one industry is required' }));
        });

        // Test 5: Salary Validation
        it('should fail if salary range is invalid', async () => {
            // Set invalid salary (low > high)
            req.body = { ...mockCareerData, salary_low: 5000, salary_high: 3000 };

            // Call controller
            await careerController.createCareer(req as Request, res as Response);

            // Verify failure
            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid salary range' }));
        });
    });
});
