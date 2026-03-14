// Career controller — handles CRUD for careers, user save/unsave, archive toggling, and career lookup
import { Request, Response } from 'express';
import Career from '../models/Career';
import UserSavedCareer from '../models/UserSavedCareer';
import { AuthRequest } from '../middleware/auth.middleware';
import { logActivity, buildMeta } from "../middleware/activityLogger";

// GET ALL CAREERS
// Fetch all careers that are NOT archived.

// Features:
// - Optional text search
// - Optional pagination
// - Always hides archived careers
export const getAllCareers = async (req: Request, res: Response) => {
  try {
    // Step 1: Read query parameters
    const { query: rawQuery, page: rawPage, limit: rawLimit } = req.query;

    // rawQuery - search keyword
    // rawPage - page number for pagination
    // rawLimit - how many items per page 
   
    // Step 2: Default filter
    // Always hide archived careers
    let filter: any = { isArchived: false };

    // Step 3: Sanitize and validate search query
    const query = rawQuery
      ? String(rawQuery).trim().slice(0, 200)
      : null;

    // trim() removes spaces
    // slice(0,200) prevents extremely long search strings
    // (basic protection against abuse)
  
    // Step 4: Apply text search
    if (query) {
      filter = {
        isArchived: false,
        $text: { $search: query }
      };

      // MongoDB text search:
      // Searches indexed fields (name, description, etc.)
    }

    // Step 5: If pagination parameters exist, return paginated response
    if (rawPage || rawLimit) {

      // Ensure page is at least 1
      const page = Math.max(1, parseInt(rawPage as string) || 1);

      // Limit results between 1 and 100
      const limit = Math.min(100, Math.max(1, parseInt(rawLimit as string) || 20));

      // Calculate how many records to skip
      const skip = (page - 1) * limit;

      /*
        Example:

        page = 2
        limit = 10

        skip = (2 - 1) * 10 = 10

        MongoDB skips first 10 results
      */

      // Run queries in parallel for better performance
      const [careers, total] = await Promise.all([

        Career.find(filter)
          .sort({ createdAt: -1 }) // newest first
          .skip(skip)
          .limit(limit),

        Career.countDocuments(filter)

      ]);


      return res.status(200).json({
        data: careers,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    }

    // Step 6: Default behaviour (no pagination)
    // Default: return raw array for backwards compatibility
    const careers = await Career.find(filter)
      .sort({ createdAt: -1 });

    res.status(200).json(careers);

  } catch (error) {

    // Generic error response
    res.status(500).json({
      message: 'Error fetching careers',
      error
    });
  }
};

//GET SINGLE CAREER
// Fetch a single non-archived career by its custom string ID
// Example ID: software-engineer
export const getCareerById = async (req: Request, res: Response) => {
  try {

    // Read ID from URL
    const { id } = req.params;

    // Fetch career by custom string ID, not ObjectId
    // Always hide archived careers.
    const career = await Career.findOne({
      id,
      isArchived: false
    });

    // Return error if career not found
    if (!career) {
      return res.status(404).json({
        message: 'Career not found'
      });
    }

    // Return results
    res.status(200).json(career);

  } catch (error) { // Error handling
    res.status(500).json({
      message: 'Error fetching career',
      error
    });

  }
};

// CREATE CAREER (ADMIN)
// Only administrators should create careers.

// This function:
// - Validates input
// - Prevents duplicate IDs
// - Creates new career
// - Logs admin activity
export const createCareer = async (req: AuthRequest, res: Response) => {
  try {

    // Extract fields from request body
    const {
      id,
      name,
      description,
      industry,
      skills,
      related_courses,
      related_domains,
      salary_low,
      salary_high,
      demand_level,
      education_level_required,
      riasec_code,
      masco_code,
      work_environment
    } = req.body;

    // REQUIRED FIELD VALIDATION
    if (!id || !name || !description) {
      return res.status(400).json({
        message: 'Missing required fields'
      });
    }

    if (!Array.isArray(industry) || industry.length === 0) {
      return res.status(400).json({
        message: 'At least one industry is required'
      });
    }

    if (!Array.isArray(skills)) {
      return res.status(400).json({
        message: 'Skills must be an array'
      });
    }

    if (!Array.isArray(related_domains)) {
      return res.status(400).json({
        message: 'Related domains must be an array'
      });
    }

    if (salary_low === undefined || salary_high === undefined) {
      return res.status(400).json({
        message: 'Salary fields are required'
      });
    }

    // Salary sanity check
    if (salary_low < 0 || salary_high < 0 || salary_low > salary_high) {
      return res.status(400).json({
        message: 'Invalid salary range'
      });
    }

    // DUPLICATE ID CHECK
    // Prevent two careers with the same ID
    const existingCareer = await Career.findOne({ id });

    if (existingCareer) {
      return res.status(400).json({
        message: 'Career ID already exists'
      });
    }

    // CREATE CAREER DOCUMENT
    const career = new Career({

      id,
      name,
      description,

      industry,
      skills,
      related_courses,
      related_domains,

      salary_low,
      salary_high,

      demand_level,
      education_level_required,

      riasec_code,
      masco_code,

      // If admin does not specify environment
      // default to Office
      work_environment: work_environment || 'Office',

      job_type: 'Full-time',

      // Automatically determine demand
      is_in_demand: demand_level === 'High',

      career_path: [],

      isArchived: false

    });

    // Save career to database
    await career.save();

    // ACTIVITY LOGGING
    if (req.user) {
      await logActivity({
        userId: req.user.id,
        activity: 'Created a career',
        type: 'Career',
        ip: req.ip,
        meta: buildMeta(req.user, {
          careerId: id,
          name
        })
      });
    }

    return res.status(201).json(career);

  } catch (error: any) {

    console.error('CREATE CAREER ERROR:', error);

    return res.status(400).json({
      message: error.message || 'Error creating career'
    });
  }
};

// UPDATE CAREER
// Uses findOne + save instead of findOneAndUpdate
// Reason: The model contains a pre-save hook that regenerates vector embeddings.
export const updateCareer = async (req: AuthRequest, res: Response) => {
  try {

    const { id } = req.params;

    // Use findOne + save instead of findOneAndUpdate so that the pre-save
    // hook fires and regenerates the vector embedding when name/description/skills change.
    const career = await Career.findOne({ id });

    if (!career) {
      return res.status(404).json({
        message: 'Career not found'
      });
    }


    // Copy request fields into the career document
    Object.assign(career, req.body);

    // Validate and save — triggers pre-save hook for embedding generation
    const updatedCareer = await career.save();

    if (req.user) {
      await logActivity({
        userId: req.user.id,
        activity: 'Updated a career',
        type: 'Career',
        ip: req.ip,
        meta: buildMeta(req.user, { careerId: id })
      });
    }

    res.status(200).json({
      message: 'Career updated successfully',
      career: updatedCareer
    });

  } catch (error: any) {

    console.error('UPDATE CAREER ERROR:', error);

    res.status(400).json({
      message: error.message || 'Error updating career',
      error
    });
  }
};

// DELETE CAREER
// Permanently delete a career from the database.
export const deleteCareer = async (req: AuthRequest, res: Response) => {
  try {

    const { id } = req.params;

    const deletedCareer = await Career.findOneAndDelete({ id });

    if (!deletedCareer) {
      return res.status(404).json({
        message: 'Career not found'
      });
    }

    if (req.user) {
      await logActivity({
        userId: req.user.id,
        activity: 'Deleted a career',
        type: 'Career',
        ip: req.ip,
        meta: buildMeta(req.user, { careerId: id })
      });
    }

    res.status(200).json({
      message: 'Career deleted successfully'
    });

  } catch (error) {

    res.status(500).json({
      message: 'Error deleting career',
      error
    });

  }
};

// SAVE CAREER
// Save a career to the authenticated user's saved list
export const saveCareer = async (req: AuthRequest, res: Response) => {
  try {
    const { id: careerId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Make sure the career exists
    const career = await Career.findOne({
      id: careerId,
      isArchived: false
    });
    if (!career) return res.status(404).json({ message: 'Career not found' });

    // Check if this user already saved it
    const exists = await UserSavedCareer.findOne({ user_id: userId, career_id: careerId });
    if (exists) return res.status(400).json({ message: 'Career already saved by you' });

    // Create the saved entry for this user
    await UserSavedCareer.create({ user_id: userId, career_id: careerId });

    // Increment the global saved count (optional)
    await Career.updateOne({ id: careerId }, { $inc: { saved_count: 1 } });

    await logActivity({
      userId,
      activity: 'Saved a career',
      type: 'Career',
      ip: req.ip,
      meta: buildMeta(req.user!, { careerId })
    });

    return res.status(200).json({ message: 'Career saved', career_id: careerId });
  } catch (err: any) {
    console.error('SAVE CAREER ERROR:', err);
    return res.status(500).json({ message: 'Failed to save career' });
  }
};

// Unsave career
// Remove a career from the authenticated user's saved list
export const unsaveCareer = async (req: AuthRequest, res: Response) => {
  try {
    const { id: careerId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Remove only this user's saved career
    const deleted = await UserSavedCareer.findOneAndDelete({ user_id: userId, career_id: careerId });
    if (!deleted) return res.status(404).json({ message: 'Saved career not found' });

    // Decrement global count
    await Career.updateOne({ id: careerId }, { $inc: { saved_count: -1 } });

    await logActivity({
      userId,
      activity: 'Unsaved a career',
      type: 'Career',
      ip: req.ip,
      meta: buildMeta(req.user!, { careerId })
    });

    return res.status(200).json({ message: 'Career unsaved', career_id: careerId });
  } catch (err: any) {
    console.error('UNSAVE CAREER ERROR:', err);
    return res.status(500).json({ message: 'Failed to unsave career', error: err.message });
  }
};

// Check whether a specific career is saved by the current user
export const checkCareerSaved = async (req: AuthRequest, res: Response) => {
  try {
    const { id: careerId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const exists = await UserSavedCareer.findOne({ user_id: userId, career_id: careerId });

    return res.status(200).json({ is_saved: !!exists });
  } catch (err: any) {
    console.error('CHECK SAVED ERROR:', err);
    return res.status(500).json({ message: 'Failed to check saved career', error: err.message });
  }
};

// Fetch all non-archived careers that the authenticated user has saved
export const fetchSavedCareers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Get all saved entries for this user
    const savedEntries = await UserSavedCareer.find({ user_id: userId });
    const careerIds = savedEntries.map(e => e.career_id);

    if (careerIds.length === 0) return res.status(200).json([]);

    // Fetch the actual career documents. Always hide archived careers.
    const careers = await Career.find(
      {
        id: { $in: careerIds },
        isArchived: false
      },
      { _id: 0 }
    );

    // Attach saved info for frontend
    const result = careers.map(career => ({
      ...career.toObject(),
      saved_by_current_user: true
    }));

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('FETCH SAVED CAREERS ERROR:', err);
    return res.status(500).json({ message: 'Failed to fetch saved careers', error: err.message });
  }
};

// Fetch all archived careers for admin review (admin only)
export const getArchivedCareers = async (req: Request, res: Response) => {
  try {
    console.log('getArchivedCareers HIT');
    const career = await Career.find({ isArchived: true })
      .sort({ createdAt: -1 });

    res.status(200).json(career);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch archived careers' });
  }
};

// Toggle a career's archive status between archived and active
export const toggleCareerArchive = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const career = await Career.findOne({ id });
    if (!career) {
      return res.status(404).json({ message: 'Career not found' });
    }

    career.isArchived = !career.isArchived;
    await career.save();

    if (req.user) {
      await logActivity({
        userId: req.user.id,
        activity: career.isArchived ? 'Archived a career' : 'Restored a career',
        type: 'Career',
        ip: req.ip,
        meta: buildMeta(req.user, { careerId: id })
      });
    }

    res.status(200).json({
      message: `Career ${career.isArchived ? 'archived' : 'restored'} successfully`,
      career
    });
  } catch (error) {
    console.error('TOGGLE CAREER ARCHIVE ERROR:', error);
    res.status(500).json({ message: 'Failed to toggle archive status' });
  }
};