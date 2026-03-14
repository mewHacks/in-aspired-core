// Course controller — handles CRUD for courses, user save/unsave, archive toggling, and vector search
import { Request, Response } from 'express';
import Course from '../models/Course';
import UserSavedCourse from '../models/UserSavedCourse';
import { AuthRequest } from '../middleware/auth.middleware';
import { logActivity, buildMeta } from '../middleware/activityLogger';
import { unknown } from 'zod';
import Result from '../models/Result';

// Fetch all non-archived courses with optional search, pagination, and RIASEC-based scoring
export const getAllCourses = async (req: AuthRequest, res: Response) => {
  console.log('GET /api/courses hit');
  try {
    // Read query string
    const { query: rawQuery, page: rawPage, limit: rawLimit } = req.query;

    // Always hide archived courses
    let filter: any = { isArchived: false };

    // Sanitize and validate query
    const query = rawQuery ? String(rawQuery).trim().slice(0, 200) : null;

    // Text search filter if query is provided
    if (query) {
      filter = {
        isArchived: false,
        $text: { $search: query as string }
      };
    }

    // If pagination params are provided, return paginated response
    if (rawPage || rawLimit) {
      const page = Math.max(1, parseInt(rawPage as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(rawLimit as string) || 20));
      const skip = (page - 1) * limit;

      const [courses, total] = await Promise.all([
        Course.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Course.countDocuments(filter)
      ]);

      return res.status(200).json({
        data: courses,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    }

    // Default: return raw array for backwards compatibility
    const courses = await Course.find(filter).sort({ createdAt: -1 });
    const coursesPlain = courses.map(c => c.toObject());

    // Score courses by RIASEC domain overlap
    let enrichedCourses: any[] = coursesPlain;

    if (req.user) {
      const latestResult = await Result.findOne({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(1);

      if (latestResult && latestResult.topDomains && latestResult.topDomains.length > 0) {
        // Extract user's top domain IDs (up to 3)
        const userTopDomains = latestResult.topDomains
          .slice(0, 3)
          .map((d: any) => d.id)
          .filter(Boolean);

        // Score each course by direct domain overlap
        enrichedCourses = coursesPlain.map(course => {
          let matchScore = 0;

          if (course.domainIds && course.domainIds.length > 0) {
            for (const domainId of course.domainIds) {
              const rank = userTopDomains.indexOf(domainId);
              if (rank !== -1) {
                matchScore += (3 - rank); // Top domain = 3pts, 2nd = 2pts, 3rd = 1pt
              }
            }
          }

          return {
            ...course,
            matchScore,
            isRecommended: matchScore > 0
          };
        });

        // Sort by matchScore descending
        enrichedCourses.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
      }
    }

    res.status(200).json(enrichedCourses);

  } catch (error) { // Error handling
    res.status(500).json({ message: 'Error fetching courses', error });
  }
};

// Fetch a single non-archived course by its custom string ID
export const getCourseById = async (req: Request, res: Response) => {
  try {
    // Read course ID from params
    const { id } = req.params;

    // Fetch course by custom string ID, not ObjectId
    // Always hide archived courses
    const course = await Course.findOne({ id, isArchived: false });

    // Return error if course not found
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Return results
    res.status(200).json(course);

  } catch (error) { // Error handling
    res.status(500).json({ message: 'Error fetching course', error });
  }
};

// Create a new course with full field validation (admin only)
export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    const {
      id,
      title,
      institutionId,
      level,
      type,
      mqa_code,
      duration_year,
      cost_level,
      description,
      apply_url,
      campuses,
      accredited_from,
      accredited_to,
      difficulty,
      tags,
      domainIds,
      careers
    } = req.body;

    // ---- REQUIRED FIELD VALIDATION ----
    if (!id || !title || !institutionId || !level || !type || !mqa_code || !duration_year || !cost_level || !description || !apply_url) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // ---- ARRAY FIELD VALIDATION ----
    if (campuses && !Array.isArray(campuses)) {
      return res.status(400).json({ message: 'Campuses must be an array' });
    }
    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({ message: 'Tags must be an array' });
    }
    if (domainIds && !Array.isArray(domainIds)) {
      return res.status(400).json({ message: 'Domain IDs must be an array' });
    }
    if (careers && !Array.isArray(careers)) {
      return res.status(400).json({ message: 'Careers must be an array' });
    }

    // ---- DUPLICATE ID CHECK ----
    const existingCourse = await Course.findOne({ id });
    if (existingCourse) {
      return res.status(400).json({ message: 'Course ID already exists' });
    }

    // ---- CREATE COURSE ----
    const course = new Course({
      id,
      title,
      institutionId,
      level,
      type,
      mqa_code,
      duration_year,
      cost_level,
      description,
      apply_url,
      campuses: campuses || [],
      accredited_from,
      accredited_to,
      difficulty,
      tags: tags || [],
      domainIds: domainIds || [],
      careers: careers || [],
      view_count: 0,
      is_featured: false,
      isArchived: false
    });

    await course.save();

    // Log activity with WebSocket broadcast
    if (req.user) {
      await logActivity({
        userId: req.user.id,
        activity: 'Created a course',
        type: 'Course',
        ip: req.ip,
        meta: buildMeta(req.user, { courseId: id, courseTitle: title })
      });
    }

    return res.status(201).json(course);

  } catch (error: any) {
    console.error('CREATE COURSE ERROR:', error);
    return res.status(400).json({
      message: error.message || 'Error creating course'
    });
  }
};

// Update an existing course by ID, triggering pre-save hooks for embedding regeneration (admin only)
export const updateCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Use findOne + save instead of findOneAndUpdate so that the pre-save
    // hook fires and regenerates the vector embedding when title/description change.
    const course = await Course.findOne({ id });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Apply updates from request body to the document
    Object.assign(course, req.body);

    // Validate and save — triggers pre-save hook for embedding generation
    const updatedCourse = await course.save();

    // Log activity with WebSocket broadcast
    if (req.user) {
      await logActivity({
        userId: req.user.id,
        activity: 'Updated a course',
        type: 'Course',
        ip: req.ip,
        meta: buildMeta(req.user, { courseId: id, courseTitle: updatedCourse.title })
      });
    }

    res.status(200).json({
      message: 'Course updated successfully',
      course: updatedCourse
    });

  } catch (error: any) {
    console.error('UPDATE COURSE ERROR:', error);
    if (error.name === 'ValidationError') {
      console.error('Validation Details:', JSON.stringify(error.errors, null, 2));
    }
    res.status(400).json({
      message: error.message || 'Error updating course',
      error
    });
  }
};

// Permanently delete a course by its custom string ID (admin only)
export const deleteCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const deletedCourse = await Course.findOneAndDelete({ id });

    if (!deletedCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Log activity with WebSocket broadcast
    if (req.user) {
      await logActivity({
        userId: req.user.id,
        activity: 'Deleted a course',
        type: 'Course',
        ip: req.ip,
        meta: buildMeta(req.user, { courseId: id })
      });
    }

    res.status(200).json({
      message: 'Course deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error deleting course',
      error
    });
  }
};

// Save a course to the authenticated user's saved list
export const saveCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { id: courseId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Make sure the course exists AND is not archived
    const course = await Course.findOne({
      id: courseId,
      isArchived: false
    });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Check if this user already saved it
    const exists = await UserSavedCourse.findOne({
      user_id: userId,
      course_id: courseId
    });
    if (exists) return res.status(400).json({ message: 'Course already saved by you' });

    // Create the saved entry for this user
    await UserSavedCourse.create({
      user_id: userId,
      course_id: courseId
    });

    // Increment the global saved count (optional)
    await Course.updateOne(
      { id: courseId },
      { $inc: { saved_count: 1 } }
    );

    // Log activity with WebSocket broadcast
    await logActivity({
      userId,
      activity: 'Saved a course',
      type: 'Course',
      ip: req.ip,
      meta: buildMeta(req.user!, { courseId, courseTitle: course.title })
    });

    return res.status(200).json({
      message: 'Course saved',
      course_id: courseId
    });
  } catch (err: any) {
    console.error('SAVE COURSE ERROR:', err);
    return res.status(500).json({ message: 'Failed to save course' });
  }
};

// Remove a course from the authenticated user's saved list
export const unsaveCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { id: courseId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Get course details first for logging
    const course = await Course.findOne({ id: courseId });

    // Remove only this user's saved course
    const deleted = await UserSavedCourse.findOneAndDelete({
      user_id: userId,
      course_id: courseId
    });
    if (!deleted) {
      return res.status(404).json({ message: 'Saved course not found' });
    }

    // Decrement global count
    await Course.updateOne(
      { id: courseId },
      { $inc: { saved_count: -1 } }
    );

    // Log activity with WebSocket broadcast
    await logActivity({
      userId,
      activity: 'Unsaved a course',
      type: 'Course',
      ip: req.ip,
      meta: buildMeta(req.user!, { courseId, courseTitle: course?.title })
    });

    return res.status(200).json({
      message: 'Course unsaved',
      course_id: courseId
    });
  } catch (err: any) {
    console.error('UNSAVE COURSE ERROR:', err);
    return res.status(500).json({
      message: 'Failed to unsave course',
      error: err.message
    });
  }
};

// Check whether a specific course is saved by the current user
export const checkCourseSaved = async (req: AuthRequest, res: Response) => {
  try {
    const { id: courseId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const exists = await UserSavedCourse.findOne({
      user_id: userId,
      course_id: courseId
    });

    return res.status(200).json({ is_saved: !!exists });
  } catch (err: any) {
    console.error('CHECK SAVED COURSE ERROR:', err);
    return res.status(500).json({
      message: 'Failed to check saved course',
      error: err.message
    });
  }
};

// Fetch all non-archived courses that the authenticated user has saved
export const fetchSavedCourses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Get all saved entries for this user
    const savedEntries = await UserSavedCourse.find({ user_id: userId });
    const courseIds = savedEntries.map(e => e.course_id);

    if (courseIds.length === 0) return res.status(200).json([]);

    // Fetch the actual course documents
    const courses = await Course.find(
      {
        id: { $in: courseIds },
        isArchived: false
      },
      { _id: 0 }
    );


    // Attach saved info for frontend
    const result = courses.map(course => ({
      ...course.toObject(),
      saved_by_current_user: true
    }));

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('FETCH SAVED COURSES ERROR:', err);
    return res.status(500).json({
      message: 'Failed to fetch saved courses',
      error: err.message
    });
  }
};

// Fetch all archived courses for admin review (admin only)
export const getArchivedCourses = async (req: Request, res: Response) => {
  try {
    console.log('getArchivedCourses HIT');
    const course = await Course.find({ isArchived: true })
      .sort({ createdAt: -1 });

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch archived courses' });
  }
};

// Toggle a course's archive status between archived and active
export const toggleCourseArchive = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const course = await Course.findOne({ id });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    course.isArchived = !course.isArchived;
    await course.save();

    // Log activity with WebSocket broadcast
    if (req.user) {
      await logActivity({
        userId: req.user.id,
        activity: course.isArchived ? 'Archived a course' : 'Restored a course',
        type: 'Course',
        ip: req.ip,
        meta: buildMeta(req.user, { courseId: id, courseTitle: course.title })
      });
    }

    res.status(200).json({
      message: `Course ${course.isArchived ? 'archived' : 'restored'} successfully`,
      course
    });
  } catch (error) {
    console.error('TOGGLE COURSE ARCHIVE ERROR:', error);
    res.status(500).json({ message: 'Failed to toggle archive status' });
  }
};

// Perform semantic vector search on courses with optional level, type, cost, domain, and institution filters
export const vectorSearchCourses = async (req: Request, res: Response) => {
  try {
    const { q: query, limit = 10, level, type, cost_level, domainIds, institutionId } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: 'Query parameter (q) is required and must be a string' });
    }

    // Sanitize query
    const sanitizedQuery = String(query).trim().slice(0, 200);

    // Build filters for vector search
    const filters: any = {};
    if (level) filters.level = level;
    if (type) filters.type = type;
    if (cost_level) filters.cost_level = cost_level;
    if (domainIds) {
      const domains = Array.isArray(domainIds) ? domainIds : [domainIds];
      filters.domainIds = { $in: domains };
    }
    if (institutionId) filters.institutionId = institutionId;

    // Perform vector search
    const results = await Course.vectorSearch(
      sanitizedQuery,
      parseInt(limit as string) || 10,
      Object.keys(filters).length > 0 ? filters : undefined
    );

    res.status(200).json({
      query: sanitizedQuery,
      results,
      count: results.length
    });

  } catch (error: any) {
    console.error('VECTOR SEARCH ERROR:', error);
    res.status(500).json({
      message: 'Error performing vector search',
      error: error.message
    });
  }
};
