// course.controller.test.ts
// Tests for course management: fetching all courses (with filters) and getting single course details

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import * as courseController from '../../src/controllers/course.controller';
import Course from '../../src/models/Course';

// Mock Mongoose Models
jest.mock('../../src/models/Course', () => {
    return {
        __esModule: true,
        default: {
            find: jest.fn(),
            findOne: jest.fn()
        }
    };
});

// Mock Result model (used by RIASEC domain scoring)
jest.mock('../../src/models/Result', () => {
    const mockQuery = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue(null as never) };
    return {
        __esModule: true,
        default: { findOne: jest.fn().mockReturnValue(mockQuery) }
    };
});

// Main test suite
describe('Course Controller', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let json: jest.Mock;
    let status: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        json = jest.fn();
        status = jest.fn(() => ({ json }));
        res = { status, json } as any;
        req = { query: {}, params: {} };
    });

    // Test 1: Fetch all courses standard
    it('should return 200 and list of courses', async () => {
        const mockCoursesPlain = [{ title: 'Course 1' }, { title: 'Course 2' }];
        const mockCourses = mockCoursesPlain.map(c => ({ ...c, toObject: () => c }));

        // Mock chain: find() -> sort() -> resolved value
        // Note: Casting jest.fn() to any prevents strict type errors with 'never'
        const sortMock = (jest.fn() as any).mockResolvedValue(mockCourses);
        (Course.find as any).mockReturnValue({ sort: sortMock });

        await courseController.getAllCourses(req as Request, res as Response);

        // Expect find with empty filter
        expect(Course.find).toHaveBeenCalledWith({ isArchived: false });
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith(mockCoursesPlain);
    });

    // Test 2: Fetch courses with text search
    it('should filter courses by query string if provided', async () => {
        req.query = { query: 'react' };

        const sortMock = (jest.fn() as any).mockResolvedValue([]);
        (Course.find as any).mockReturnValue({ sort: sortMock });

        await courseController.getAllCourses(req as Request, res as Response);

        // Expect find with Mongo text search syntax
        expect(Course.find).toHaveBeenCalledWith({
            $text: { $search: 'react' },
            isArchived: false
        });
    });

    // Test 3: Get single course success
    it('should return 200 and course details if found', async () => {
        req.params = { id: 'c1' };
        const mockCourse = { id: 'c1', title: 'Course' };

        (Course.findOne as any).mockResolvedValue(mockCourse);

        await courseController.getCourseById(req as Request, res as Response);

        expect(Course.findOne).toHaveBeenCalledWith({ id: 'c1', isArchived: false });
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith(mockCourse);
    });

    // Test 4: Get single course not found
    it('should return 404 if course is not found', async () => {
        req.params = { id: 'invalid' };
        (Course.findOne as any).mockResolvedValue(null);

        await courseController.getCourseById(req as Request, res as Response);

        expect(status).toHaveBeenCalledWith(404);
        expect(json).toHaveBeenCalledWith({ message: 'Course not found' });
    });
});
