// Feedback.ts — Mongoose model for user-submitted feedback (bug reports,
// feature requests, content issues, general feedback). Includes instance
// methods, statics for analytics, and a virtual for human-readable timestamps.
import mongoose, { Schema, Document, Model } from 'mongoose';

// Feedback types
export enum FeedbackType {
  BUG = 'bug',
  CONTENT = 'content',
  FEATURE = 'feature',
  GENERAL = 'general'
}

// Feedback status
export enum FeedbackStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved'
}

// Related entity types
export enum RelatedEntityType {
  COURSE = 'course',
  CAREER = 'career',
  ROOM = 'room',
  RESOURCE = 'resource',
  GENERAL = 'general'
}

// Interface for Feedback document
export interface IFeedback extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  type: FeedbackType;
  message: string;
  status: FeedbackStatus;
  relatedTo?: {
    type: RelatedEntityType;
    id?: string;
    name?: string;
  };
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
  attachments?: string[];
  
  // Instance method
  resolve(adminId: mongoose.Types.ObjectId): Promise<IFeedback>;
}

// Interface for Feedback Model (statics)
interface IFeedbackModel extends Model<IFeedback> {
  getStats(): Promise<{
    total: number;
    pending: number;
    resolved: number;
    byType: Record<string, number>;
  }>;
}

// Feedback Schema
const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userName: {
      type: String,
      required: true
    },
    userEmail: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: Object.values(FeedbackType),
      required: true,
      default: FeedbackType.GENERAL,
      index: true
    },
    message: {
      type: String,
      required: true,
      minlength: [10, 'Feedback message must be at least 10 characters'],
      maxlength: [1000, 'Feedback message cannot exceed 1000 characters']
    },
    status: {
      type: String,
      enum: Object.values(FeedbackStatus),
      default: FeedbackStatus.PENDING,
      index: true
    },
    relatedTo: {
      type: {
        type: String,
        enum: Object.values(RelatedEntityType)
      },
      id: String,
      name: String
    },
    attachments: {
      type: [String],
      default: []
    },
    resolvedAt: {
      type: Date
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: 'feedbacks'
  }
);

// Indexes for better query performance
FeedbackSchema.index({ status: 1, createdAt: -1 }); // For filtering by status + sorting
FeedbackSchema.index({ type: 1, status: 1 }); // For filtering by type and status
FeedbackSchema.index({ userId: 1, createdAt: -1 }); // For user's feedback history

// Virtual for time since submission
FeedbackSchema.virtual('timeSinceSubmission').get(function() {
  const now = new Date();
  const diffMs = now.getTime() - this.createdAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return this.createdAt.toLocaleDateString();
});

// Method to resolve feedback
FeedbackSchema.methods.resolve = function(adminId: mongoose.Types.ObjectId) {
  this.status = FeedbackStatus.RESOLVED;
  this.resolvedAt = new Date();
  this.resolvedBy = adminId;
  return this.save();
};

// Static method to get feedback statistics
FeedbackSchema.statics.getStats = async function() {
  const total = await this.countDocuments();
  const pending = await this.countDocuments({ status: FeedbackStatus.PENDING });
  const resolved = await this.countDocuments({ status: FeedbackStatus.RESOLVED });
  
  const byType = await this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    total,
    pending,
    resolved,
    byType: byType.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {} as Record<string, number>)
  };
};

// Export the compiled Feedback model with statics and instance methods
const Feedback = mongoose.model<IFeedback, IFeedbackModel>('Feedback', FeedbackSchema);

export default Feedback;