// users.routes.ts — User profile, settings, and admin user management routes.

import express, { Response, Request } from "express";
import User, { IUserDocument } from '../models/User';

// Authentication middleware
import { authenticate, authMiddleware, AuthRequest } from "../middleware/auth.middleware";

// Password hashing and verification dependencies
import bcrypt from "bcryptjs";

// 2FA dependencies
import speakeasy from 'speakeasy'; // Generate and verifies TOTP 2FA secrets
import qrcode from 'qrcode'; // Convert TOTP secret URL to QR 
import { encrypt, decrypt } from '../utils/encryption';
import { authRateLimiter } from '../middleware/rateLimiter.middleware'; // Rate limiting to prevent brute force attacks

// Email service
import { sendEmail } from '../services/email.service';  // Send emails
import { logActivity, buildMeta } from "../middleware/activityLogger";

// Private access routes that handles user profile personal data

// Initialize router
const router = express.Router();

// Apply activity logging middleware to all routes
router.use(authMiddleware);

// Request body interfaces
interface ChangePasswordBody {
  oldPassword: string;
  newPassword: string;
}

interface VerifyPasswordBody {
  password: string;
}

interface Generate2FABody {
  manual?: boolean;
}

interface Verify2FABody {
  token: string;
}

interface Disable2FABody {
  password?: string;
}

// Helper: safe user JSON for frontend
const safeUserJSON = (user: any) => {
  // Convert mongoose document to object, add id and name field
  const userObj = user.toObject ? user.toObject() : user;
  return {
    id: userObj._id,
    name: userObj.name,
    email: userObj.email,
    phone: userObj.phone,
    phoneCountryCode: userObj.phoneCountryCode,
    gender: userObj.gender,
    dateOfBirth: userObj.dateOfBirth,
    avatar: userObj.avatar, // Profile picture URL or base64
    authProvider: userObj.authProvider,
    isTwoFactorEnabled: userObj.isTwoFactorEnabled,
    role: (userObj.role || 'STUDENT').toUpperCase(), // Consistent with frontend
    preferences: userObj.preferences || {}
  };
};

// GET current user 
/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *       404:
 *         description: User not found
 */
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id).select("-password"); // Exclude password from response
    if (!user) return res.status(404).json({ error: "User not found" });

    // Log activity
    await logActivity({
      userId: user._id.toString(),
      activity: "Viewed profile",
      type: "Profile",
      ip: req.ip,
      meta: buildMeta(user)
    });

    res.json(safeUserJSON(user));
  } catch (error: any) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// UPDATE current user
/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               gender:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 */
router.put("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, avatar, dateOfBirth, gender, bio } = req.body;
    const updates = { name, avatar, dateOfBirth, gender, bio };

    const user = await User.findByIdAndUpdate(req.user!.id, updates, {
      new: true, // Return updated document
      runValidators: true, // Enforces schema validation
    }).select("-password");

    if (!user) return res.status(404).json({ error: "User not found" });

    // Log activity
    await logActivity({
      userId: user._id.toString(),
      activity: "Updated profile",
      type: "Profile",
      ip: req.ip,
      meta: buildMeta(user)
    });

    // Return safe JSON for frontend
    res.json(safeUserJSON(user));
  } catch (error: any) {
    console.error("Update User Error:", error);
    if (error.name === 'ValidationError') { // Validation error
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// DELETE current user 
/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     summary: Delete user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 */
router.delete("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.user!.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Log deletion
    await logActivity({
      userId: user._id.toString(),
      activity: "Deleted account",
      type: "Account",
      ip: req.ip,
      meta: buildMeta(user)
    });

    // Send goodbye email (non-blocking/error handled)
    try {
      if (user.email) {
        await sendEmail(
          user.email,
          'Account Deleted - In-Aspired',
          `Hello ${user.name},\n\nYour account has been successfully deleted. We are sorry to see you go! All your personal data and quiz results have been removed from our system.\n\nThank you for being a part of In-Aspired.\n\nBest regards,\nThe In-Aspired Team`
        );
      }
    } catch (emailError) {
      console.error('Failed to send goodbye email:', emailError);
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ message: "Account deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Change user password 
/**
 * @swagger
 * /api/users/change-password:
 *   put:
 *     summary: Change password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Incorrect old password
 */
router.put("/change-password", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body as ChangePasswordBody;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Old and new passwords are required" });
    }

    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Convert mongoose document to object, add id and name field
    const isMatch = await bcrypt.compare(oldPassword as string, user.password as string);
    if (!isMatch) return res.status(401).json({ error: "Old password is incorrect" });

    // Verifies old password matches stored hash
    user.password = newPassword;
    await user.save(); // Hashed by pre-save hook

    // Log activity
    await logActivity({
      userId: user._id.toString(),
      activity: "Changed password",
      type: "Security",
      ip: req.ip,
      meta: buildMeta(user)
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Verify user password without changing, useful for authentication flows
// Return true if password matches stored hash
/**
 * @swagger
 * /api/users/verify-password:
 *   post:
 *     summary: Verify password for sensitive actions
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password valid (true/false)
 */
router.post("/verify-password", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body as VerifyPasswordBody;

    if (!password) return res.status(400).json({ valid: false });

    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ valid: false });

    const isMatch = await bcrypt.compare(password as string, user.password as string);
    return res.json({ valid: isMatch });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ valid: false });
  }
});

// Generate 2FA secret 
/**
 * @swagger
 * /api/users/2fa/generate:
 *   post:
 *     summary: Generate 2FA secret and QR code
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR code and secret returned
 */
router.post('/2fa/generate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { manual } = req.body as Generate2FABody;

    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const secret = speakeasy.generateSecret({
      name: `In-Aspired (${user.email})`
    });

    user.twoFactorSecret = encrypt(secret.base32);
    user.twoFactorSetupDate = new Date();
    await user.save();

    qrcode.toDataURL(secret.otpauth_url!, async (err, data_url) => {
      if (err) return res.status(500).json({ message: 'Error generating QR code' });

      const response: any = { qrCode: data_url };
      if (manual) response.secret = secret.base32;

      // Log activity
      await logActivity({
        userId: user._id.toString(),
        activity: "Generated 2FA secret",
        type: "Security",
        ip: req.ip,
        meta: buildMeta(user)
      });

      res.json(response);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== Verify and enable 2FA =====
/**
 * @swagger
 * /api/users/2fa/verify:
 *   post:
 *     summary: Verify 2FA token to enable it
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA enabled
 */
router.post('/2fa/verify', authenticate, authRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body as Verify2FABody;
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.twoFactorSecret) return res.status(400).json({ message: '2FA secret not generated' });

    let decryptedSecret: string;
    try {
      decryptedSecret = decrypt(user.twoFactorSecret);
    } catch (err) {
      console.error('2FA Decryption Error:', err);
      return res.status(500).json({ message: 'Error processing 2FA secret. Please generate a new one.' });
    }

    const window = 1;
    const verification = speakeasy.totp.verifyDelta({
      secret: decryptedSecret,
      encoding: 'base32',
      token: token,
      window: window
    });

    if (verification) {
      const currentStep = Math.floor(Date.now() / 1000 / 30);
      const usedStep = currentStep + verification.delta;

      if (user.twoFactorLastUsedStep && usedStep <= user.twoFactorLastUsedStep) {
        return res.status(400).json({ success: false, message: 'Token already used or expired' });
      }

      user.twoFactorLastUsedStep = usedStep;
      user.isTwoFactorEnabled = true;

      // Award "Security Guru" badge for enabling 2fa if not present
      if (!user.badges) user.badges = [];
      if (!user.badges.includes('security-guru')) {
        user.badges.push('security-guru');
      }

      await user.save();

      // Log activity
      await logActivity({
        userId: user._id.toString(),
        activity: "Enabled 2FA",
        type: "Security",
        ip: req.ip,
        meta: buildMeta(user)
      });

      res.json({ success: true, message: '2FA enabled successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid 2FA token' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== Disable 2FA =====
/**
 * @swagger
 * /api/users/2fa/disable:
 *   post:
 *     summary: Disable 2FA
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA disabled
 *       400:
 *         description: Invalid code or password
 */
interface Disable2FABody {
  token: string;
  password?: string;
}

router.post('/2fa/disable', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { token, password } = (req.body || {}) as Disable2FABody;

    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 1. Password Check (For Local Users)
    if (user.authProvider === 'local') {
      if (!password) {
        return res.status(400).json({ message: 'Password is required to disable 2FA' });
      }
      const isMatch = await bcrypt.compare(password, user.password as string);
      if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect password' });
      }
    }

    // 2. 2FA Token Check (For Everyone - Proof of Possession)
    // We strictly require the 6-digit code to prevent disabling if session is hijacked but phone is safe.
    if (!token) {
      return res.status(400).json({ message: '2FA code is required' });
    }

    if (!user.twoFactorSecret) return res.status(400).json({ message: '2FA not enabled' });

    let decryptedSecret: string;
    try {
      decryptedSecret = decrypt(user.twoFactorSecret);
    } catch (err) {
      console.error('2FA Decryption Error:', err);
      return res.status(500).json({ message: 'Server error verifying 2FA' });
    }

    const verification = speakeasy.totp.verifyDelta({
      secret: decryptedSecret,
      encoding: 'base32',
      token: token,
      window: 1 // Allow 1 step (30s) drift
    });

    if (!verification) {
      return res.status(400).json({ message: 'Invalid 2FA code' });
    }

    // 3. Disable 2FA
    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    // Log activity
    await logActivity({
      userId: user._id.toString(),
      activity: "Disabled 2FA",
      type: "Security",
      ip: req.ip,
      meta: buildMeta(user)
    });

    // 4. Send Notification Email
    try {
      if (user.email) {
        await sendEmail(
          user.email,
          'Security Alert: 2FA Disabled - In-Aspired',
          `Hello ${user.name},\n\nTwo-Factor Authentication (2FA) was just disabled for your account.\n\nIf this was you, you can ignore this email.\nIf you did not request this change, please reset your password immediately and contact support.\n\nBest regards,\nThe In-Aspired Team`
        );
      }
    } catch (emailErr) {
      console.error('Failed to send 2FA disable alert:', emailErr);
      // Don't block response because action was successful
    }

    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
