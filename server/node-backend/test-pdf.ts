
import mongoose from 'mongoose';
import { pdfService } from './src/services/pdf.service';
import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect with short timeout so Career.find() gets real data if available,
// but fails fast (returns []) instead of blocking if Atlas is unreachable
mongoose.set('bufferTimeoutMS', 1500);
mongoose.connect(process.env.MONGODB_URI as string, { serverSelectionTimeoutMS: 1500 })
    .then(() => console.log('[MongoDB] Connected (career data available)'))
    .catch(() => console.log('[MongoDB] Skipped (career data will be empty — OK for testing)'));

// Mock user
const mockUser = {
    _id: '000000000000000000000001',
    name: 'Test User',
    email: 'test@example.com',
    avatar: null,
    badges: ['early-adopter'],
    role: 'student',
    isPremium: false,
};

// Mock result — RIASEC scores MUST use single-letter codes: R, I, A, S, E, C
const mockResult = {
    _id: '000000000000000000000002',
    userId: '000000000000000000000001',
    scores: [
        { type: 'I', score: 88 },
        { type: 'A', score: 74 },
        { type: 'R', score: 55 },
        { type: 'S', score: 48 },
        { type: 'C', score: 32 },
        { type: 'E', score: 27 },
    ],
    topDomains: [
        { label: 'Computing & Technology', matchExplanation: 'Your Investigative and Analytical traits align strongly with problem-solving in computing.' },
        { label: 'Design & Creative Arts', matchExplanation: 'Your Artistic tendencies suggest strong creative potential in visual design.' },
        { label: 'Science & Research', matchExplanation: 'Your curiosity and methodical thinking suit research-oriented fields.' },
    ],
    recommendedCourses: [
        { name: 'Computer Science', title: 'Computer Science', institution: { name: 'National University of Singapore' }, level: 'Degree', duration: '4 years', description: 'A rigorous programme covering algorithms, AI, and software engineering.' },
        { name: 'Information Systems', title: 'Information Systems', institution: { name: 'Singapore Management University' }, level: 'Degree', duration: '3 years', description: 'Bridges technology with business problem-solving.' },
        { name: 'Interactive Media Design', title: 'Interactive Media Design', institution: { name: 'Nanyang Polytechnic' }, level: 'Diploma', duration: '3 years', description: 'Combines UX design with creative digital production.' },
    ],
    // Set to null to trigger Gemini AI generation.
    // After first run, paste the printed aiInsight JSON here to skip API calls on reruns.
    aiInsight: null,
    createdAt: new Date(),
};

async function testPdfGeneration() {
    try {
        await new Promise(res => setTimeout(res, 2000));

        console.log('Generating PDF from mock data...');
        const pdfBuffer = await pdfService.generateReportFromData(mockUser, mockResult, 'TEST-LOCAL-001');

        const outputPath = path.join(__dirname, 'test-report.pdf');
        fs.writeFileSync(outputPath, pdfBuffer);

        console.log(`✅ PDF saved to: ${outputPath}`);
        console.log('Open the file to review the design.');
    } catch (error) {
        console.error('Error generating PDF:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

testPdfGeneration();
