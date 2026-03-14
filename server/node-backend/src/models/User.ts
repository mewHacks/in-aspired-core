// User.ts — Mongoose model for platform users. Stores authentication credentials,
// profile information, 2FA secrets, push notification subscriptions, and preferences.
// Supports both local (email/password) and Google OAuth authentication providers.
import mongoose, { Schema, Document } from 'mongoose';
import { IUser, UserRole } from '@in-aspired/shared';
import bcrypt from 'bcryptjs';

// IUserDocument extends IUser and Document, add backend only fields
export interface IUserDocument extends Omit<IUser, 'id' | '_id'>, Document { // Remove id and _id from IUser because mongodb will handle them
    password?: string; // Hashed password (optional for Google users)
    googleId?: string; // Google ID
    avatar?: string; // Profile picture URL
    authProvider?: 'local' | 'google'; // Auth provider
    role: UserRole;

    // For user monitoring
    status: 'active' | 'inactive' | 'suspended';
    lastActive: Date;

    // Email verification
    isVerified: boolean; // Whether user has verified their email
    verifyEmailToken?: string; // Hashed token sent in verification email
    verifyEmailExpire?: Date; // Token expiry (24 hours from generation)

    resetPasswordToken?: string; // Password reset token
    resetPasswordExpire?: Date; // Password reset expiration timestamp
    twoFactorSecret?: string; // 2FA Secret
    isTwoFactorEnabled?: boolean; // 2FA Status
    twoFactorSetupDate?: Date; // 2FA Setup Timestamp
    twoFactorLastUsedStep?: number; // Last used TOTP time-step

    // Auth Hardening/ Locked Account
    loginAttempts: number;
    lockUntil?: Date;
    refreshTokens: {
        token: string;
        expires: Date;
        createdAt: Date;
        ip?: string;
    }[];

    // Preferences (Override generic IUser preferences to add backend-specific fields)
    preferences: {
        theme: string;
        language: string;
        notifications: boolean;
        emailNotifications: boolean;
        pushNotifications: boolean;
        pushSubscriptions?: {
            endpoint: string; // url
            keys: {
                auth: string; // authentication secret
                p256dh: string; // public key to encrypt message
            };
            userAgent?: string; // browser/device info
            createdAt?: Date;
        }[];
    };
}

// Mongoose schema definition for the User collection
const UserSchema: Schema = new Schema({
    // Required fields
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: false }, // Password is optional for Google users
    googleId: { type: String, unique: true, sparse: true }, // Unique if present, sparse allows nulls
    avatar: { type: String },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    role: {
        type: String,
        enum: Object.values(UserRole),
        default: UserRole.STUDENT
    },
     // For User monitoring
    status: { 
        type: String, 
        enum: ['active','inactive','suspended'], 
        default: 'active' 
    },
    lastActive: { type: Date, default: Date.now },
    badges: { // Badge IDs to promote gamification
        type: [String],
        default: []
    },
    // Optional fields
    phone: { type: String, required: false },
    phoneCountryCode: { type: String, required: false, default: '+60' },
    gender: { type: String, required: false },
    dateOfBirth: { type: String, required: false }, // Store as ISO String date or just string

    // Preferences
    preferences: {
        theme: { type: String, default: 'light' },
        language: { type: String, default: 'english' },
        notifications: { type: Boolean, default: true },
        emailNotifications: { type: Boolean, default: true },
        pushNotifications: { type: Boolean, default: false },
        pushSubscriptions: [{
            endpoint: { type: String, required: true },
            keys: {
                auth: { type: String, required: true },
                p256dh: { type: String, required: true }
            },
            userAgent: { type: String },
            createdAt: { type: Date, default: Date.now }
        }]
    },

    // 2FA
    twoFactorSecret: { type: String }, // Stores the secret key (should be encrypted in prod)
    isTwoFactorEnabled: { type: Boolean, default: false },
    twoFactorSetupDate: { type: Date }, // Track when secret was generated (for pending/expiry checks)
    twoFactorLastUsedStep: { type: Number, default: 0 }, // Track last used time-step for replay protection

    // Auth Hardening
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    // Refresh Tokens (Hashed)
    refreshTokens: [{
        token: { type: String, required: true }, // Verify hash
        expires: { type: Date, required: true },
        createdAt: { type: Date, default: Date.now },
        ip: { type: String } //IP binding
    }],

    // Password reset
    resetPasswordToken: { type: String, required: false },
    resetPasswordExpire: { type: Date, required: false },

    // Email verification
    // Google users skip this — they are auto-verified since Google already verified their email
    isVerified: { type: Boolean, default: false },
    verifyEmailToken: { type: String, required: false },
    verifyEmailExpire: { type: Date, required: false }
}, {
    timestamps: true,
// Strip sensitive fields from JSON output so they are never sent to clients
    toJSON: {
        transform: function (doc, ret) {
            delete ret.password;
            // Security fields to exclude
            delete ret.loginAttempts;
            delete ret.lockUntil;
            delete ret.refreshTokens;
            delete ret.twoFactorSecret;
            delete ret.twoFactorSetupDate;
            // Verification token fields should never be exposed
            delete ret.verifyEmailToken;
            delete ret.verifyEmailExpire;

            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    }
});

// Pre-save hook to hash password and normalize data before saving
UserSchema.pre('save', async function (next) {
    // Normalize role to lowercase if it matches uppercase enum key
    if (this.role && typeof this.role === 'string') {
        if ((this.role as string) === 'ADMIN') this.role = UserRole.ADMIN;
        if ((this.role as string) === 'STUDENT') this.role = UserRole.STUDENT;
    }

    // Only hash if password exists and is modified
    if (!this.password || !this.isModified('password')) {
        return next();
    }

    try {
        // Generate salt and hash password
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password as string, salt);
        next();
    } catch (error) {
        next(error as Error);
    }
});

// Export the compiled User model
export default mongoose.model<IUserDocument>('User', UserSchema);
