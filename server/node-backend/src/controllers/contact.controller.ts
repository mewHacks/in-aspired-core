// Contact controller — handles public contact form submissions with validation and email forwarding
import { Request, Response } from 'express';
import Contact from '../models/Contact';
import { sendEmail } from '../services/email.service';
import validator from 'validator'; // For email validation
import xss from 'xss'; // For input sanitization (Prevents XSS attacks)
import { CONFIG } from '../config/env';

// Submit a contact form message after validating, sanitizing, and emailing the admin
export const submitContactForm = async (req: Request, res: Response) => {
    try {
        // Get necessary form fields from request body
        const { name, email, topic, message } = req.body;

        // Trim user inputs to remove leading/trailing whitespace before validation
        // Optional to prevent crashes if the fields are missing
        const trimmedName = name?.trim();
        const trimmedEmail = email?.trim();
        const trimmedMessage = message?.trim();

        // Validate presence of required fields
        if (!trimmedName || !trimmedEmail || !trimmedMessage) {
            return res.status(400).json({ message: 'Name, email, and message are required.' });
        }

        // Validate email format
        if (!validator.isEmail(trimmedEmail)) {
            return res.status(400).json({ message: 'Invalid email address format.' });
        }

        // Validate length of inputs (Prevent DoS and abuse with massive payloads)
        if (trimmedMessage.length > 2000) { // Limit message to 2000 characters
            return res.status(400).json({ message: 'Message is too long. Maximum 2000 characters allowed.' });
        }
        if (trimmedName.length > 100) { // Limit name to 100 characters
            return res.status(400).json({ message: 'Name is too long. Maximum 100 characters allowed.' });
        }

        // Sanitize inputs before storing and before email (Prevent XSS attacks)
        const cleanName = xss(trimmedName);
        const cleanMessage = xss(trimmedMessage);
        const cleanTopic = topic ? xss(topic) : 'general';

        // Create new contact record
        const contact = new Contact({
            name: cleanName,
            email: trimmedEmail.toLowerCase(), // Store emails in lowercase
            topic: cleanTopic,
            message: cleanMessage
        });

        // Save record to database
        await contact.save();

        // Create email subject and body
        const emailSubject = `[In-Aspired New Message] ${cleanTopic}: ${cleanName}`;
        const emailBody = `
You have received a new message from the "Contact Us" form.

Name: ${cleanName}
Email: ${trimmedEmail}
Topic: ${cleanTopic}

Message:
${cleanMessage}
        `;

        // Send email to website official email defined in environment
        await sendEmail(CONFIG.OFFICIAL_EMAIL, emailSubject, emailBody);

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Message received successfully. We will get back to you soon!'
        });

    } catch (error) { // Error handling
        console.error('Contact form error:', error);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
};
