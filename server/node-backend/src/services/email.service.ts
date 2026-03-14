// email.service.ts — Nodemailer-based email delivery service.
// Sends verification emails, password resets, and premium PDF reports.
// Supports both Gmail (service mode) and generic SMTP (host/port mode).
import nodemailer from 'nodemailer'; // Use nodemailer to send emails

import { CONFIG } from '../config/env';

const transporter = nodemailer.createTransport({
    // If SMTP_SERVICE is defined (e.g., "gmail"), use that. Otherwise use Host/Port (MailTrap)
    ...(CONFIG.SMTP.SERVICE ? { service: CONFIG.SMTP.SERVICE } : {
        host: CONFIG.SMTP.HOST,
        port: CONFIG.SMTP.PORT,
    }),
    auth: {
        user: CONFIG.SMTP.USER,
        pass: CONFIG.SMTP.PASS,
    },
});

// Reusable function to send email
export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
    try {
        const info = await transporter.sendMail({
            from: CONFIG.SMTP.FROM_EMAIL, // Sender email
            to,
            subject,
            text, // Plain text body
            html, // HTML body (optional)
        });

        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) { // Error handling
        console.error('Error sending email:', error);
        throw new Error('Email could not be sent');
    }
};

// Sends email verification link to newly registered user
export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
    // Build the verification URL pointing to frontend page
    const verifyUrl = `${CONFIG.CLIENT_URL}/verify-email/${token}`;

    const html = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); border-radius: 12px; margin-bottom: 30px;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Verify Your Email</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Welcome to In-Aspired!</p>
            </div>

            <div style="padding: 20px; background: #f8fafc; border-radius: 8px; margin-bottom: 20px;">
                <p style="color: #64748b; line-height: 1.6;">
                    Thank you for registering! Please verify your email address to activate your account.
                </p>
                <p style="color: #64748b; line-height: 1.6;">
                    Click the button below to verify your email:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verifyUrl}" 
                       style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                        Verify My Email
                    </a>
                </div>
                <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
                    Or copy and paste this link into your browser:<br/>
                    <a href="${verifyUrl}" style="color: #6366f1;">${verifyUrl}</a>
                </p>
            </div>

            <div style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px;">
                <p style="color: #94a3b8; margin: 0; font-size: 13px;">
                    ⏰ This link will expire in <strong>24 hours</strong>.
                </p>
                <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 13px;">
                    If you did not create an account with In-Aspired, you can safely ignore this email.
                </p>
            </div>

            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} In-Aspired. All rights reserved.
                </p>
            </div>
        </div>
    `;

    const text = `
Welcome to In-Aspired!

Please verify your email address by clicking the link below:

${verifyUrl}

This link will expire in 24 hours.

If you did not create an account, please ignore this email.

Best regards,
The In-Aspired Team
    `;

    await sendEmail(email, 'Verify Your In-Aspired Account', text, html);
};

// Sends the premium career report PDF to a user via email
export const sendPremiumReport = async (
    userEmail: string,
    userName: string,
    pdfBuffer: Buffer, // PDF file as a Buffer
    transactionId: string // Transaction ID for reference
): Promise<void> => {
    try {
        const subject = '🎯 Your Premium Career Report is Ready!';

        const html = `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); border-radius: 12px; margin-bottom: 30px;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Your Career DNA Report</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Personalized insights for ${userName}</p>
                </div>
                
                <div style="padding: 20px; background: #f8fafc; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">Thank you for your purchase!</h2>
                    <p style="color: #64748b; line-height: 1.6;">
                        Your premium career analysis report is attached to this email. This comprehensive guide includes:
                    </p>
                    <ul style="color: #64748b; line-height: 1.8;">
                        <li>Your complete RIASEC personality profile</li>
                        <li>Top career domains matched to your strengths</li>
                        <li>Personalized course recommendations</li>
                        <li>Actionable insights for career growth</li>
                    </ul>
                </div>
                
                <div style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px;">
                    <p style="color: #64748b; margin: 0; font-size: 14px;">
                        <strong>Transaction ID:</strong> ${transactionId}
                    </p>
                    <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 12px;">
                        Keep this for your records. If you have any questions, reply to this email.
                    </p>
                </div>
                
                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} In-Aspired. All rights reserved.
                    </p>
                </div>
            </div>
        `;

        const text = `
Hi ${userName},

Thank you for your purchase! Your premium career analysis report is attached to this email.

This comprehensive guide includes:
- Your complete RIASEC personality profile
- Top career domains matched to your strengths
- Personalized course recommendations
- Actionable insights for career growth

Transaction ID: ${transactionId}

If you have any questions, feel free to reply to this email.

Best regards,
The In-Aspired Team
        `;

        await transporter.sendMail({
            from: CONFIG.SMTP.FROM_EMAIL,
            to: userEmail,
            subject,
            text,
            html,
            attachments: [
                {
                    filename: `InAspired-Career-Report-${transactionId}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        });

        console.log(`[EmailService] Premium report sent`);
    } catch (error) {
        console.error('[EmailService] Failed to send premium report');
        throw new Error('Failed to send premium report email');
    }
};

// Sends a waitlist confirmation email to a user who signed up for premium report
export const sendWaitlistConfirmation = async (email: string): Promise<void> => {
    const html = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); border-radius: 12px; margin-bottom: 30px;">
                <h1 style="color: white; margin: 0; font-size: 24px;">You're on the list! 🎉</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">In-Aspired Premium Career Report</p>
            </div>

            <div style="padding: 20px; background: #f8fafc; border-radius: 8px; margin-bottom: 20px;">
                <p style="color: #1e293b; font-size: 18px; font-weight: 600; margin-top: 0;">Thanks for your interest!</p>
                <p style="color: #64748b; line-height: 1.6;">
                    We've added you to the waitlist for the In-Aspired Premium Career DNA Report. You'll be among the first to know when it's available.
                </p>
                <p style="color: #64748b; line-height: 1.6;">Here's what you'll get when it launches:</p>
                <ul style="color: #64748b; line-height: 1.8; padding-left: 20px;">
                    <li>Your complete RIASEC personality profile</li>
                    <li>Top career domains matched to your strengths</li>
                    <li>Personalized course recommendations</li>
                    <li>Soft skills analysis &amp; action plan</li>
                    <li>Workplace environment fit assessment</li>
                    <li>Personal growth timeline</li>
                </ul>
            </div>

            <div style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px;">
                <p style="color: #94a3b8; margin: 0; font-size: 13px;">
                    We'll reach out to <strong>${email}</strong> as soon as the premium report is ready.
                </p>
                <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 13px;">
                    If you didn't sign up for this, you can safely ignore this email.
                </p>
            </div>

            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} In-Aspired. All rights reserved.
                </p>
            </div>
        </div>
    `;

    const text = `
You're on the list! 🎉

Thanks for your interest in the In-Aspired Premium Career DNA Report!

We've added ${email} to our waitlist. You'll be among the first to know when it's available.

What you'll get when it launches:
- Your complete RIASEC personality profile
- Top career domains matched to your strengths
- Personalized course recommendations
- Soft skills analysis & action plan
- Workplace environment fit assessment
- Personal growth timeline

If you didn't sign up for this, you can safely ignore this email.

Best regards,
The In-Aspired Team
    `;

    await sendEmail(email, "You're on the In-Aspired Premium Waitlist! 🎉", text, html);
    console.log(`[EmailService] Waitlist confirmation sent`);
};
