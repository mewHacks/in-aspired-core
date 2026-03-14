// Auth controller — handles signup, login, logout, email verification, password reset, Google OAuth, and token refresh
import { Request, Response, CookieOptions } from 'express';
import bcrypt from 'bcryptjs';
import User, { IUserDocument } from '../models/User';
import jwt from "jsonwebtoken";
import crypto from 'crypto';
import { sendEmail, sendVerificationEmail } from '../services/email.service';
import { CONFIG } from '../config/env';
import { UserRole } from '@in-aspired/shared';
import { logActivity, buildMeta } from "../middleware/activityLogger";

// ADMIN EMAIL 
// These emails will be treated as admins
// No database change required
const ADMIN_EMAILS = [
  'hana.inaspired@gmail.com',
  'jas.inaspired@gmail.com'
];

// Helper function to check admin
const isAdminEmail = (email?: string): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

// Cookie options
const accessTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: CONFIG.NODE_ENV === 'production',
  sameSite: CONFIG.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/'
};

// Refresh token is long-lived and must be httpOnly for security
const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true, // Prevent JavaScript access to mitigate XSS attacks
  secure: CONFIG.NODE_ENV === 'production',
  sameSite: CONFIG.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/'
};

// Register a new user with email/password, send verification email, and set auth cookies
export const signup = async (req: Request, res: Response) => {
  try {
    // Extract required fields from request body
    const { name, email, password } = req.body;

    // Check if a user with the given email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Generate a secure refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');

    // Hash refresh token before storing in database
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Assign role BASED ON EMAIL
    const role = isAdminEmail(email) ? UserRole.ADMIN : UserRole.STUDENT;

    // Generate email verification token (plain token to send in email)
    const verifyToken = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing in database (same pattern as resetPasswordToken)
    const verifyTokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex');

    // Create new user (password hashing handled by Mongoose pre-save hook)
    // isVerified is false by default — user must click email link to verify
    const user = await User.create({
      name,
      email,
      password, // Plain password, will be hashed by User model
      role,
      authProvider: 'local',
      isVerified: false,                                               // Not verified yet
      verifyEmailToken: verifyTokenHash,                               // Store hashed token
      verifyEmailExpire: new Date(Date.now() + 24 * 60 * 60 * 1000),  // Expires in 24 hours
      refreshTokens: [{
        token: refreshTokenHash,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        ip: req.ip
      }]
    });

    // Generate short-lived access token
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      CONFIG.JWT_SECRET as string,
      { expiresIn: '15m' }
    );

    // Set cookies
    res.cookie('accessToken', accessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    // Send verification email (don't block signup if email fails)
    // User is already created — they can request resend later if email fails
    try {
      await sendVerificationEmail(email, verifyToken);
    } catch (emailError) {
      console.error('[Signup] Verification email failed to send:', emailError);
    }

    // Use correct buildMeta signature
    await logActivity({
      userId: user._id.toString(),
      activity: 'User signed up',
      type: 'Auth',
      ip: req.ip,
      meta: buildMeta(user, { userAgent: req.headers['user-agent'] || 'unknown' })
    });

    // Send success response with user data (Tokens are in cookies now)
    return res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account before logging in.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        authProvider: user.authProvider,
        isVerified: false
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    // Zod errors are caught by global error handler
    // But duplicate key errors from Mongo might fall here
    return res.status(500).json({ message: 'Server error' });
  }
};

// Authenticate a user with email/password, enforce lockout and email verification, and issue tokens
export const login = async (req: Request, res: Response) => {
  try {
    // Extract credentials
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Check if account is temporarily locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remaining = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      return res.status(429).json({ message: `Account locked. Please try again in ${remaining} minutes.` });
    }

    // For Google users trying to login with password
    if (user.authProvider === 'google') {
      return res.status(400).json({
        message: 'This account uses Google login. Please sign in with Google.'
      });
    }

    // Block login if email not verified
    // Google users skip this check — Google already verified their email
    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        isVerified: false // Frontend can use this flag to show "Resend verification email" button
      });
    }

    // Compare entered password with stored hash
    const isMatch = await bcrypt.compare(password as string, user.password as string);

    // Handle invalid password
    if (!isMatch) {
      // Mark login attempts as increase by 1
      user.loginAttempts += 1;

      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
      }
      await user.save();
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastActive = new Date();

    // Admin role sync — ensure admin emails always have ADMIN role
    // This auto-fixes old accounts without DB migration
    const correctRole = isAdminEmail(user.email) ? UserRole.ADMIN : UserRole.STUDENT;
    if (user.role !== correctRole) {
      user.role = correctRole;
    }

    // Generate short-lived access token
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      CONFIG.JWT_SECRET as string,
      { expiresIn: '15m' }
    );

    // Generate and hash refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Remove expired refresh tokens
    user.refreshTokens = user.refreshTokens.filter(t => t.expires > new Date());

    // Add new refresh token (7 days expiry)
    user.refreshTokens.push({
      token: refreshTokenHash,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      ip: req.ip
    });

    // Limit max active sessions
    if (user.refreshTokens.length > 5) {
      user.refreshTokens.shift(); // Remove oldest
    }

    // Store refresh tokens
    await user.save();

    // Set cookies
    res.cookie('accessToken', accessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    (res.locals as any).userIdAfterLogin = user._id.toString();

    // Use correct buildMeta signature
    // Log activity without blocking login response
    void logActivity({
      userId: user._id.toString(),
      activity: 'User logged in',
      type: 'Auth',
      ip: req.ip,
      meta: buildMeta(user, { userAgent: req.headers['user-agent'] || 'unknown' })
    });

    return res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        authProvider: user.authProvider,
        avatar: user.avatar
      },
      accessToken
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Verify a user's email using the token from the verification link
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    // Get plain token from URL params
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    // Hash the plain token to match what we stored in DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with this token that hasn't expired yet
    const user = await User.findOne({
      verifyEmailToken: hashedToken,
      verifyEmailExpire: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Verification link is invalid or has expired. Please request a new one.',
      });
    }

    // Mark user as verified and clear verification token fields
    user.isVerified = true;
    user.verifyEmailToken = undefined;
    user.verifyEmailExpire = undefined;
    await user.save();

    await logActivity({
      userId: user._id.toString(),
      activity: 'User verified email',
      type: 'Auth',
      ip: req.ip,
      meta: buildMeta(user, { userAgent: req.headers['user-agent'] || 'unknown' })
    });

    return res.status(200).json({
      message: 'Email verified successfully! You can now log in.'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Resend a verification email for users who didn't receive or whose link expired
export const resendVerification = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    // Always return same generic message to prevent email enumeration attacks
    // (attacker can't tell if email exists or not)
    if (!user || user.authProvider !== 'local') {
      return res.status(200).json({
        message: 'If this email exists, a verification link has been sent.'
      });
    }

    // Already verified — no need to resend
    if (user.isVerified) {
      return res.status(400).json({ message: 'This email is already verified. Please log in.' });
    }

    // Generate a fresh token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex');

    // Update user with new token and reset expiry to 24 hours from now
    user.verifyEmailToken = verifyTokenHash;
    user.verifyEmailExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    // Send fresh verification email
    await sendVerificationEmail(email, verifyToken);

    return res.status(200).json({
      message: 'If this email exists, a verification link has been sent.'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Generate a password reset token, save it, and email the reset link to the user
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    // Get email from request body
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // For Google users
    if (user.authProvider === 'google') {
      return res.status(400).json({
        message: 'This account uses Google login. Password reset is not available.'
      });
    }

    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and save to database
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expiration (10 minutes)
    user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    // Fixed: Use correct buildMeta signature
    await logActivity({
      userId: user._id.toString(),
      activity: 'User requested password reset',
      type: 'Auth',
      ip: req.ip,
      meta: buildMeta(user, { userAgent: req.headers['user-agent'] || 'unknown' })
    });

    // Create reset URL for frontend
    const clientUrl = CONFIG.CLIENT_URL;
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    // Build email message
    const message = `Dear user,\n\nYou have requested a password reset to your In-Aspired account. If you did not request this, please ignore this email.\n\nPlease click the following link to reset password: \n\n ${resetUrl}`;

    try {
      // Send password reset email
      await sendEmail(user.email, 'Password Reset Token', message);

      res.status(200).json({ success: true, data: 'Email sent' });
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({ message: 'Email could not be sent' });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset a user's password using a valid, non-expired reset token
export const resetPassword = async (req: Request, res: Response) => {
  try {
    // Hash token from URL params
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

    // Find valid user with non-expired token
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    // For Google users
    if (user.authProvider === 'google') {
      return res.status(400).json({
        message: 'This account uses Google login. Password reset is not available.'
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    // Reset login attempts on successful password reset
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    // Pre-save hook will hash the password
    await user.save();

    // Use correct buildMeta signature
    await logActivity({
      userId: user._id.toString(),
      activity: 'User reset password',
      type: 'Auth',
      ip: req.ip,
      meta: buildMeta(user, { userAgent: req.headers['user-agent'] || 'unknown' })
    });

    res.status(200).json({
      success: true,
      data: 'Password updated success'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Authenticate or register a user via Google OAuth access token
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { token } = req.body; // Expecting Access Token now

    // 1. Input Validation
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Invalid token' });
    }

    // 2. Verify Access Token & Get User Info via Google API
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!userInfoResponse.ok) {
      return res.status(400).json({ message: 'Invalid access token' });
    }

    const payload = await userInfoResponse.json() as {
      sub: string;
      email: string;
      name: string;
      picture: string;
      email_verified: boolean;
    };

    const { sub: googleId, email, name, picture, email_verified } = payload;


    // 3. Security Check: Email Verified
    if (!email_verified) {
      return res.status(400).json({ message: 'Email not verified by Google' });
    }

    if (!email) {
      return res.status(400).json({ message: 'Email not found in Google profile' });
    }

    // 4. Determine role BEFORE any user operations
    const role = isAdminEmail(email) ? UserRole.ADMIN : UserRole.STUDENT;

    // 5. Find existing user
    const user = await User.findOne({ email });

    if (user) {
      if (user.status === 'suspended') {
        return res.status(403).json({ message: 'Account is suspended. Please contact support.' });
      }

      // Case A: User exists but not linked to Google (has password)
      if (user.authProvider === 'local') {
        // REJECT LINKING - User must log in with password first to link
        return res.status(409).json({
          message: 'User already exists with this email. Please login with your password first.'
        });
      }

      // Case B: User exists and is Google user -> Login

      // Update Google ID if missing
      if (!user.googleId) {
        user.googleId = googleId;
      }

      // Update avatar if newer
      if (picture && (!user.avatar || user.avatar !== picture)) {
        user.avatar = picture;
      }

      // Update role based on email (in case admin list changed)
      user.role = role;
      user.authProvider = 'google';

      // Google users are always verified — Google already verified their email
      if (!user.isVerified) {
        user.isVerified = true;
      }

      // Generate access token
      const accessToken = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        CONFIG.JWT_SECRET as string,
        { expiresIn: '15m' }
      );

      // Generate Refresh Token
      const refreshToken = crypto.randomBytes(40).toString('hex');
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      // Clean expired tokens
      user.refreshTokens = user.refreshTokens.filter(t => t.expires > new Date());

      // Add new refresh token
      user.refreshTokens.push({
        token: refreshTokenHash,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        ip: req.ip
      });

      // Limit max active sessions
      if (user.refreshTokens.length > 5) {
        user.refreshTokens.shift();
      }

      await user.save();

      // Set Cookies
      res.cookie('accessToken', accessToken, accessTokenCookieOptions);
      res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

      (res.locals as any).userIdAfterLogin = user._id.toString();

      // Use correct buildMeta signature
      await logActivity({
        userId: user._id.toString(),
        activity: 'User logged in via Google',
        type: 'Auth',
        ip: req.ip,
        meta: buildMeta(user, { userAgent: req.headers['user-agent'] || 'unknown' })
      });

      return res.json({
        message: 'Google login successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          authProvider: user.authProvider,
          role: user.role
        }
      });
    } else {
      // Case C: No user found -> Create new Google user
      // Google users are automatically verified — no email verification needed
      const refreshToken = crypto.randomBytes(40).toString('hex');
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      const newUser = await User.create({
        name,
        email,
        googleId,
        avatar: picture,
        authProvider: 'google',
        role,
        isVerified: true, // Google already verified their email
        refreshTokens: [{
          token: refreshTokenHash,
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          ip: req.ip
        }]
      });

      const accessToken = jwt.sign(
        { id: newUser._id, email: newUser.email, role: newUser.role },
        CONFIG.JWT_SECRET as string,
        { expiresIn: '15m' }
      );

      // Set cookies
      res.cookie('accessToken', accessToken, accessTokenCookieOptions);
      res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

      (res.locals as any).userIdAfterLogin = newUser._id.toString();

      // Use correct buildMeta signature
      await logActivity({
        userId: newUser._id.toString(),
        activity: 'User signed up via Google',
        type: 'Auth',
        ip: req.ip,
        meta: buildMeta(newUser, { userAgent: req.headers['user-agent'] || 'unknown' })
      });

      return res.status(201).json({
        message: 'User created and logged in via Google',
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          avatar: newUser.avatar,
          authProvider: newUser.authProvider,
          role: newUser.role
        }
      });
    }

  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ message: 'Google login failed' });
  }
};

// Rotate the refresh token: validate the old one, issue new access and refresh tokens
export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Get refresh token from cookie (preferred) or body (fallback)
    const token = req.cookies?.refreshToken || req.body?.token;

    if (!token) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Hash the token to find it in DB
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with this refresh token
    const user = await User.findOne({
      'refreshTokens.token': tokenHash,
      'refreshTokens.expires': { $gt: new Date() }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Account is suspended' });
    }

    // Rotate Token: Verification successful, replace old with new
    // 1. Remove used token
    user.refreshTokens = user.refreshTokens.filter(t => t.token !== tokenHash);

    // 2. Generate new tokens
    const newAccessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      CONFIG.JWT_SECRET as string,
      { expiresIn: '15m' }
    );

    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    // 3. Add new token
    user.refreshTokens.push({
      token: newRefreshTokenHash,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
      ip: req.ip
    });

    // Cleanup old tokens
    if (user.refreshTokens.length > 5) user.refreshTokens.shift();

    try {
      await user.save();
    } catch (error: any) {
      if (error.name === 'VersionError') {
        return res.status(409).json({ message: 'Concurrency conflict. Please retry.' });
      }
      throw error;
    }

    // 4. Set new cookies
    res.cookie('accessToken', newAccessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', newRefreshToken, refreshTokenCookieOptions);

    res.json({ message: 'Token refreshed successfully' });

  } catch (error) {
    console.error('Refresh Token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Log out the user by revoking the refresh token and clearing auth cookies
export const logout = async (req: Request, res: Response) => {
  try {
    // Get token from body (optional) or cookie
    const token = req.body?.token || req.cookies?.refreshToken;

    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await User.findOneAndUpdate(
        { 'refreshTokens.token': tokenHash },
        { $pull: { refreshTokens: { token: tokenHash } } }
      );
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    if ((res.locals as any).userIdAfterLogin) {
      const user = await User.findById(res.locals.userIdAfterLogin);
      if (user) {
        // Fixed: Use correct buildMeta signature
        await logActivity({
          userId: user._id.toString(),
          activity: 'User logged out',
          type: 'Auth',
          ip: req.ip,
          meta: buildMeta(user, { userAgent: req.headers['user-agent'] || 'unknown' })
        });
      }
    }

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Test endpoint to verify UserRole enum values are correctly loaded
export const testRole = async (req: Request, res: Response) => {
  const testAdmin = UserRole.ADMIN;
  const testStudent = UserRole.STUDENT;

  console.log('Test - UserRole.ADMIN:', testAdmin);
  console.log('Test - UserRole.STUDENT:', testStudent);

  res.json({
    admin: testAdmin,
    student: testStudent,
    adminType: typeof testAdmin,
    studentType: typeof testStudent
  });
};
