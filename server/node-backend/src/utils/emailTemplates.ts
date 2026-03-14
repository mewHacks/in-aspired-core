// emailTemplates.ts
// Reusable HTML email templates for notification emails (password reset, contact, etc.)

import { CONFIG } from '../config/env';

export const getNotificationEmailTemplate = (title: string, message: string, link?: string) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; text-decoration: none; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px; }
        .title { font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 15px; color: #111; }
        .message { margin-bottom: 25px; color: #4b5563; }
        .button { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="${CONFIG.CLIENT_URL}" class="logo">In-Aspired</a>
        </div>
        <div class="card">
            <h1 class="title">${title}</h1>
            <p class="message">${message}</p>
            ${link ? `<a href="${link.startsWith('http') ? link : CONFIG.CLIENT_URL + link}" class="button">View Details</a>` : ''}
        </div>
        <div class="footer">
            <p>You received this because you have email notifications enabled.</p>
            <p>&copy; ${new Date().getFullYear()} In-Aspired. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
};
