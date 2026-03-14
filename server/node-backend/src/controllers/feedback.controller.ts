// Feedback controller — handles user feedback submission, admin review, resolution, and statistics
import { Request, Response } from 'express';
import Feedback, { FeedbackType, FeedbackStatus, RelatedEntityType } from '../models/Feedback';
import User from '../models/User';
import Resource, { ResourceStatus } from '../models/Resource';
import { UserRole } from '@in-aspired/shared';
import { uploadFeedbackFiles } from '../middleware/upload';

// Extended Request type for authenticated users
interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
    name?: string;
  };
}

// ============================================
// USER ENDPOINTS
// ============================================

// Submit new feedback from an authenticated user with optional file attachments
export const submitFeedback = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { type, message, relatedTo } = req.body;
    const files = req.files as Express.Multer.File[]; 

    // Validation
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ 
        message: 'Feedback message must be at least 10 characters' 
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({ 
        message: 'Feedback message cannot exceed 1000 characters' 
      });
    }

    if (type && !Object.values(FeedbackType).includes(type)) {
      return res.status(400).json({ 
        message: 'Invalid feedback type. Must be: bug, content, feature, or general' 
      });
    }

    // Get user details
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get relative file paths (remove absolute path, keep only uploads/feedback/...)
    const attachments = files ? files.map(file => {
      // Convert to forward slashes and extract relative path
      const normalized = file.path.replace(/\\/g, '/');
      // Extract just 'uploads/feedback/filename.png'
      const relativePath = normalized.substring(normalized.indexOf('uploads/'));
      return relativePath;
    }) : [];

    // Create feedback
    const feedback = await Feedback.create({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      type: type || FeedbackType.GENERAL,
      message: message.trim(),
      relatedTo: relatedTo || undefined,
      status: FeedbackStatus.PENDING,
      attachments: attachments 
    });

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: {
        _id: feedback._id,
        type: feedback.type,
        message: feedback.message,
        status: feedback.status,
        attachments: feedback.attachments, 
        createdAt: feedback.createdAt
      }
    });

  } catch (err) {
    console.error('Submit feedback error:', err);
    res.status(500).json({ message: 'Failed to submit feedback' });
  }
};

// GET /api/feedback/my - Get current user's feedback history
// Returns all feedback submitted by the authenticated user, sorted by newest first
export const getMyFeedback = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const feedback = await Feedback.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      count: feedback.length,
      feedback
    });

  } catch (err) {
    console.error('Get my feedback error:', err);
    res.status(500).json({ message: 'Failed to fetch feedback' });
  }
};

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /api/admin/feedback - Get all feedback (admin only)
// Supports filtering by status and type, pagination, and sorting
export const getAllFeedback = async (req: AuthRequest, res: Response) => {
  try {
    // Check admin permission
    if (req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Query parameters
    const { 
      status, 
      type, 
      limit = '50', 
      page = '1',
      sort = 'newest' 
    } = req.query;

    // Build filter
    const filter: any = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (type && type !== 'all') {
      filter.type = type;
    }

    // Pagination
    const limitNum = parseInt(limit as string);
    const pageNum = parseInt(page as string);
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    let sortOptions: any = { createdAt: -1 }; // Default: newest first
    if (sort === 'oldest') sortOptions = { createdAt: 1 };
    if (sort === 'type') sortOptions = { type: 1, createdAt: -1 };

    // Execute query
    const [feedback, total] = await Promise.all([
      Feedback.find(filter)
        .sort(sortOptions)
        .limit(limitNum)
        .skip(skip)
        .select('-__v')
        .lean(),
      Feedback.countDocuments(filter)
    ]);

    // Get statistics
    const stats = await Feedback.getStats();

    res.json({
      feedback,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      },
      stats
    });

  } catch (err) {
    console.error('Get all feedback error:', err);
    res.status(500).json({ message: 'Failed to fetch feedback' });
  }
};

// Get a single feedback entry by ID with user and resolver details (admin only)
export const getFeedbackById = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const feedback = await Feedback.findById(req.params.id)
      .populate('userId', 'name email role')
      .populate('resolvedBy', 'name email');

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    res.json({ feedback });

  } catch (err) {
    console.error('Get feedback by ID error:', err);
    res.status(500).json({ message: 'Failed to fetch feedback' });
  }
};

// Mark a feedback entry as resolved (admin only)
export const resolveFeedback = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    if (feedback.status === FeedbackStatus.RESOLVED) {
      return res.status(400).json({ message: 'Feedback already resolved' });
    }

    // Resolve the feedback
    await feedback.resolve(req.user.id as any);

    res.json({
      message: 'Feedback resolved successfully',
      feedback: {
        _id: feedback._id,
        status: feedback.status,
        resolvedAt: feedback.resolvedAt,
        resolvedBy: feedback.resolvedBy
      }
    });

  } catch (err) {
    console.error('Resolve feedback error:', err);
    res.status(500).json({ message: 'Failed to resolve feedback' });
  }
};

// Revert a resolved feedback back to pending, restoring hidden resources if applicable (admin only)
export const unresolveFeedback = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    if (feedback.status === FeedbackStatus.PENDING) {
      return res.status(400).json({ message: 'Feedback is already pending' });
    }

    // If this was a resource report (false/dismissed case), restore the resource to active
    if (feedback.relatedTo?.type === RelatedEntityType.RESOURCE && feedback.relatedTo.id) {
      await Resource.findByIdAndUpdate(feedback.relatedTo.id, { status: ResourceStatus.ACTIVE });
    }

    // Unresolve
    feedback.status = FeedbackStatus.PENDING;
    feedback.resolvedAt = undefined;
    feedback.resolvedBy = undefined;
    await feedback.save();

    res.json({
      message: feedback.relatedTo?.type === RelatedEntityType.RESOURCE
        ? 'Report dismissed — resource restored'
        : 'Feedback marked as pending',
      feedback: {
        _id: feedback._id,
        status: feedback.status
      }
    });

  } catch (err) {
    console.error('Unresolve feedback error:', err);
    res.status(500).json({ message: 'Failed to unresolve feedback' });
  }
};

// Permanently delete a feedback entry (admin only)
export const deleteFeedback = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const feedback = await Feedback.findByIdAndDelete(req.params.id);

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    res.json({
      message: 'Feedback deleted successfully'
    });

  } catch (err) {
    console.error('Delete feedback error:', err);
    res.status(500).json({ message: 'Failed to delete feedback' });
  }
};

// Get aggregated feedback statistics for the admin dashboard (admin only)
export const getFeedbackStats = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const stats = await Feedback.getStats();

    res.json(stats);

  } catch (err) {
    console.error('Get feedback stats error:', err);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
};